import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_STORE_SETTINGS, SEED_FLOWERS } from '../src/catalog/defaultFlowers.ts';
import type { Flower, FlowerDraft, StoreSettings } from '../src/types/flower.ts';
import {
  computeSwapOrderUpdates,
  slugifyFlowerId,
  sortFlowersByOrder,
} from '../src/utils/catalog.ts';

export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PersistedDatabase {
  adminPasswordHash: string;
  passwordVersion: number;
  sessionSecret: string;
  flowers: Flower[];
  storeSettings: StoreSettings;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export class CatalogStore {
  private readonly filePath: string;
  private db: PersistedDatabase;

  constructor(filePath = path.resolve(process.cwd(), 'data', 'bsblooms-db.json')) {
    this.filePath = filePath;
    this.db = this.loadOrInit();
  }

  private createDefaultDb(): PersistedDatabase {
    const now = new Date().toISOString();
    return {
      adminPasswordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      passwordVersion: 1,
      sessionSecret: crypto.randomBytes(32).toString('hex'),
      flowers: SEED_FLOWERS.map((flower, idx) => ({
        ...flower,
        orderIndex: idx,
        createdAt: now,
        updatedAt: now,
      })),
      storeSettings: {
        ...DEFAULT_STORE_SETTINGS,
        updatedAt: now,
      },
    };
  }

  private loadOrInit(): PersistedDatabase {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<PersistedDatabase>;
        if (
          parsed &&
          typeof parsed.adminPasswordHash === 'string' &&
          typeof parsed.sessionSecret === 'string' &&
          Array.isArray(parsed.flowers) &&
          parsed.storeSettings
        ) {
          return {
            adminPasswordHash: parsed.adminPasswordHash,
            passwordVersion: typeof parsed.passwordVersion === 'number' ? parsed.passwordVersion : 1,
            sessionSecret: parsed.sessionSecret,
            flowers: sortFlowersByOrder(parsed.flowers),
            storeSettings: parsed.storeSettings,
          };
        }
      }
    } catch {
      // Fall back to cleanly seeded store
    }
    const fresh = this.createDefaultDb();
    this.persist(fresh);
    return fresh;
  }

  private persist(nextDb: PersistedDatabase): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(nextDb, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.filePath);
    this.db = nextDb;
  }

  getPublicCatalog(): { flowers: Flower[]; storeSettings: StoreSettings } {
    return {
      flowers: sortFlowersByOrder(this.db.flowers),
      storeSettings: { ...this.db.storeSettings },
    };
  }

  issueSessionToken(): string {
    const now = Date.now();
    const payload = {
      role: 'admin',
      ver: this.db.passwordVersion,
      iat: now,
      exp: now + SESSION_TTL_MS,
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.db.sessionSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${sig}`;
  }

  verifySessionToken(token: string | undefined | null): boolean {
    if (!token || typeof token !== 'string') return false;
    const dotIdx = token.indexOf('.');
    if (dotIdx <= 0) return false;
    const encoded = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    if (!encoded || !sig) return false;

    const expectedSig = crypto
      .createHmac('sha256', this.db.sessionSecret)
      .update(encoded)
      .digest('base64url');

    const sigBuf = Buffer.from(sig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
        role?: string;
        ver?: number;
        exp?: number;
      };
      return (
        payload.role === 'admin' &&
        payload.ver === this.db.passwordVersion &&
        typeof payload.exp === 'number' &&
        payload.exp > Date.now()
      );
    } catch {
      return false;
    }
  }

  login(password: string): string | null {
    if (!password || typeof password !== 'string') return null;
    if (!verifyPassword(password, this.db.adminPasswordHash)) {
      return null;
    }
    return this.issueSessionToken();
  }

  changePassword(currentPassword: string, newPassword: string): { ok: true; token: string } | { ok: false; error: string } {
    if (!verifyPassword(currentPassword, this.db.adminPasswordHash)) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
      return { ok: false, error: 'New password must be between 6 and 128 characters.' };
    }
    if (newPassword === currentPassword) {
      return { ok: false, error: 'New password must differ from current password.' };
    }

    const nextDb: PersistedDatabase = {
      ...this.db,
      adminPasswordHash: hashPassword(newPassword),
      passwordVersion: this.db.passwordVersion + 1,
    };
    this.persist(nextDb);
    return { ok: true, token: this.issueSessionToken() };
  }

  saveFlower(draft: FlowerDraft): Flower {
    const nameEn = String(draft.nameEn ?? '').trim().slice(0, 100);
    if (!nameEn) {
      throw new Error('Variety name is required.');
    }
    const photos = Array.isArray(draft.photos)
      ? draft.photos.filter((p) => typeof p === 'string' && p.trim().length > 0).slice(0, 5)
      : [];
    if (photos.length === 0) {
      throw new Error('At least one photo is required.');
    }

    const existingIdx = draft.id
      ? this.db.flowers.findIndex((item) => item.id === draft.id)
      : -1;
    const now = new Date().toISOString();

    const availability =
      draft.availability === 'limited' || draft.availability === 'out_of_stock'
        ? draft.availability
        : 'in_stock';

    if (existingIdx >= 0) {
      const existing = this.db.flowers[existingIdx];
      const updated: Flower = {
        ...existing,
        orderIndex:
          typeof draft.orderIndex === 'number' && !Number.isNaN(draft.orderIndex)
            ? Math.max(0, Math.min(10000, Math.round(draft.orderIndex)))
            : existing.orderIndex,
        nameEn,
        color: String(draft.color ?? '').trim().slice(0, 60),
        cropEn: String(draft.cropEn ?? 'Gerbera').trim().slice(0, 60),
        typeEn: String(draft.typeEn ?? 'Standard').trim().slice(0, 60),
        breederCode: String(draft.breederCode ?? '').trim().slice(0, 60),
        stemLength: String(draft.stemLength ?? '').trim().slice(0, 60),
        extraSpecEn: String(draft.extraSpecEn ?? '').trim().slice(0, 240),
        availability,
        photos,
        updatedAt: now,
      };
      const nextFlowers = [...this.db.flowers];
      nextFlowers[existingIdx] = updated;
      this.persist({ ...this.db, flowers: sortFlowersByOrder(nextFlowers) });
      return updated;
    }

    const id = slugifyFlowerId(nameEn, draft.id);
    const nextOrder =
      typeof draft.orderIndex === 'number' && !Number.isNaN(draft.orderIndex)
        ? Math.max(0, Math.min(10000, Math.round(draft.orderIndex)))
        : this.db.flowers.length;

    const created: Flower = {
      id,
      orderIndex: nextOrder,
      nameEn,
      color: String(draft.color ?? '').trim().slice(0, 60),
      cropEn: String(draft.cropEn ?? 'Gerbera').trim().slice(0, 60),
      typeEn: String(draft.typeEn ?? 'Standard').trim().slice(0, 60),
      breederCode: String(draft.breederCode ?? '').trim().slice(0, 60),
      stemLength: String(draft.stemLength ?? '').trim().slice(0, 60),
      extraSpecEn: String(draft.extraSpecEn ?? '').trim().slice(0, 240),
      availability,
      photos,
      createdAt: now,
      updatedAt: now,
    };

    const nextFlowers = sortFlowersByOrder([...this.db.flowers, created]).map((item, idx) => ({
      ...item,
      orderIndex: idx,
    }));
    this.persist({ ...this.db, flowers: nextFlowers });
    return created;
  }

  deleteFlower(flowerId: string): boolean {
    const exists = this.db.flowers.some((item) => item.id === flowerId);
    if (!exists) return false;
    const nextFlowers = sortFlowersByOrder(
      this.db.flowers.filter((item) => item.id !== flowerId),
    ).map((item, idx) => ({
      ...item,
      orderIndex: idx,
    }));
    this.persist({ ...this.db, flowers: nextFlowers });
    return true;
  }

  reorderFlower(index: number, direction: 'up' | 'down'): Flower[] | null {
    const ordered = sortFlowersByOrder(this.db.flowers);
    const updates = computeSwapOrderUpdates(ordered, index, direction);
    if (!updates) return null;

    const orderMap = new Map(updates.map((u) => [u.id, u.orderIndex]));
    const now = new Date().toISOString();
    const nextFlowers = sortFlowersByOrder(
      ordered.map((item) => ({
        ...item,
        orderIndex: orderMap.get(item.id) ?? item.orderIndex,
        updatedAt: now,
      })),
    );
    this.persist({ ...this.db, flowers: nextFlowers });
    return nextFlowers;
  }

  resetSeedFlowers(): Flower[] {
    const now = new Date().toISOString();
    const seeded = SEED_FLOWERS.map((flower, idx) => ({
      ...flower,
      orderIndex: idx,
      createdAt: now,
      updatedAt: now,
    }));
    this.persist({ ...this.db, flowers: seeded });
    return seeded;
  }

  updateStoreSettings(nextSettings: StoreSettings): StoreSettings {
    const shopNameEn = String(nextSettings.shopNameEn ?? '').trim().slice(0, 80);
    const phone = String(nextSettings.phone ?? '').trim().slice(0, 20);
    const whatsapp = String(nextSettings.whatsapp ?? '').replace(/\D/g, '').slice(0, 18);

    if (!shopNameEn) {
      throw new Error('Brand name is required.');
    }
    if (!/^\+?[0-9\- ]{6,20}$/.test(phone)) {
      throw new Error('Invalid phone number.');
    }
    if (!/^[0-9]{8,18}$/.test(whatsapp)) {
      throw new Error('Invalid WhatsApp number.');
    }

    const updated: StoreSettings = {
      shopNameEn,
      phone,
      whatsapp,
      locationEn: String(nextSettings.locationEn ?? '').trim().slice(0, 120),
      hoursEn: String(nextSettings.hoursEn ?? '').trim().slice(0, 80),
      updatedAt: new Date().toISOString(),
    };
    this.persist({ ...this.db, storeSettings: updated });
    return updated;
  }
}
