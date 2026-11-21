import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { DEFAULT_STORE_SETTINGS, SEED_FLOWERS } from '../catalog/defaultFlowers.ts';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import type { AvailabilityStatus, Flower, FlowerDraft, StoreSettings } from '../types/flower.ts';
import {
  computeSwapOrderUpdates,
  slugifyFlowerId,
  sortFlowersByOrder,
} from '../utils/catalog.ts';
import { deriveAdminProof, sha256Hex } from '../utils/crypto.ts';

const ADMIN_PROOF_STORAGE_KEY = 'bsb_admin_proof';

export interface CatalogState {
  flowers: Flower[];
  loading: boolean;
  storeSettings: StoreSettings;
  authReady: boolean;
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  saveFlower: (draft: FlowerDraft) => Promise<void>;
  removeFlower: (flowerId: string) => Promise<void>;
  reorderFlower: (index: number, direction: 'up' | 'down') => Promise<void>;
  saveStoreSettings: (settings: StoreSettings) => Promise<void>;
  seedInitialCatalog: () => Promise<void>;
}

function getStoredProof(): string | null {
  try {
    return window.sessionStorage.getItem(ADMIN_PROOF_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredProof(proof: string | null): void {
  try {
    if (proof) {
      window.sessionStorage.setItem(ADMIN_PROOF_STORAGE_KEY, proof);
    } else {
      window.sessionStorage.removeItem(ADMIN_PROOF_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const msg = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
  return (
    code === 'permission-denied' ||
    code === 'firestore/permission-denied' ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('Missing or insufficient permissions')
  );
}

function timestampToIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString();
  }
  return undefined;
}

function normalizeAvailability(value: unknown): AvailabilityStatus {
  if (value === 'limited' || value === 'out_of_stock') return value;
  return 'in_stock';
}

function mapDocToFlower(id: string, raw: Record<string, unknown>): Flower {
  const photos = Array.isArray(raw.photos)
    ? raw.photos.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
    : [];

  return {
    id,
    orderIndex: typeof raw.orderIndex === 'number' && !Number.isNaN(raw.orderIndex) ? raw.orderIndex : 0,
    nameEn: typeof raw.nameEn === 'string' ? raw.nameEn : '',
    color: typeof raw.color === 'string' ? raw.color : '',
    cropEn: typeof raw.cropEn === 'string' ? raw.cropEn : 'Gerbera',
    typeEn: typeof raw.typeEn === 'string' ? raw.typeEn : 'Standard',
    breederCode: typeof raw.breederCode === 'string' ? raw.breederCode : '',
    stemLength: typeof raw.stemLength === 'string' ? raw.stemLength : '',
    extraSpecEn: typeof raw.extraSpecEn === 'string' ? raw.extraSpecEn : '',
    availability: normalizeAvailability(raw.availability),
    photos,
    createdAt: timestampToIso(raw.createdAt),
    updatedAt: timestampToIso(raw.updatedAt),
  };
}

function mapDocToStoreSettings(raw: Record<string, unknown>): StoreSettings {
  return {
    shopNameEn: typeof raw.shopNameEn === 'string' && raw.shopNameEn.trim() ? raw.shopNameEn : DEFAULT_STORE_SETTINGS.shopNameEn,
    phone: typeof raw.phone === 'string' && raw.phone.trim() ? raw.phone : DEFAULT_STORE_SETTINGS.phone,
    whatsapp: typeof raw.whatsapp === 'string' && raw.whatsapp.trim() ? raw.whatsapp : DEFAULT_STORE_SETTINGS.whatsapp,
    locationEn: typeof raw.locationEn === 'string' ? raw.locationEn : DEFAULT_STORE_SETTINGS.locationEn,
    hoursEn: typeof raw.hoursEn === 'string' ? raw.hoursEn : DEFAULT_STORE_SETTINGS.hoursEn,
    updatedAt: timestampToIso(raw.updatedAt),
  };
}

function sanitizeFlowerFields(draft: FlowerDraft, fallbackOrderIndex: number) {
  const nameEn = String(draft.nameEn ?? '').trim().slice(0, 100);
  if (!nameEn) {
    throw new Error('Variety name is required.');
  }

  const photos = Array.isArray(draft.photos)
    ? draft.photos
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0 && p.length <= 220000)
        .slice(0, 5)
    : [];
  if (photos.length === 0) {
    throw new Error('At least one photo is required.');
  }

  const orderIndex =
    typeof draft.orderIndex === 'number' && !Number.isNaN(draft.orderIndex)
      ? Math.max(0, Math.min(10000, Math.round(draft.orderIndex)))
      : Math.max(0, Math.min(10000, Math.round(fallbackOrderIndex)));

  return {
    orderIndex,
    nameEn,
    color: String(draft.color ?? '').trim().slice(0, 60),
    cropEn: String(draft.cropEn ?? 'Gerbera').trim().slice(0, 60),
    typeEn: String(draft.typeEn ?? 'Standard').trim().slice(0, 60),
    breederCode: String(draft.breederCode ?? '').trim().slice(0, 60),
    stemLength: String(draft.stemLength ?? '').trim().slice(0, 60),
    extraSpecEn: String(draft.extraSpecEn ?? '').trim().slice(0, 240),
    availability: normalizeAvailability(draft.availability),
    photos,
  };
}

function sanitizeStoreSettings(nextSettings: StoreSettings) {
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

  return {
    shopNameEn,
    phone,
    whatsapp,
    locationEn: String(nextSettings.locationEn ?? '').trim().slice(0, 120),
    hoursEn: String(nextSettings.hoursEn ?? '').trim().slice(0, 80),
  };
}

export function useFlowerCatalog(): CatalogState {
  const [firestoreFlowers, setFirestoreFlowers] = useState<Flower[]>([]);
  const [catalogInitialized, setCatalogInitialized] = useState<boolean>(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const catalogInitializedRef = useRef(false);
  const firestoreFlowersRef = useRef<Flower[]>([]);

  useEffect(() => {
    catalogInitializedRef.current = catalogInitialized;
  }, [catalogInitialized]);

  useEffect(() => {
    firestoreFlowersRef.current = firestoreFlowers;
  }, [firestoreFlowers]);

  // Real-time subscription to BSBlooms varieties and store settings
  useEffect(() => {
    let metaLoaded = false;
    let varietiesLoaded = false;
    const finishLoading = () => {
      if (metaLoaded && varietiesLoaded) {
        setLoading(false);
      }
    };

    const unsubVarieties = onSnapshot(
      collection(db, 'catalogVarieties'),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) =>
          mapDocToFlower(docSnap.id, docSnap.data() as Record<string, unknown>),
        );
        setFirestoreFlowers(sortFlowersByOrder(items));
        varietiesLoaded = true;
        finishLoading();
      },
      (error) => {
        varietiesLoaded = true;
        finishLoading();
        try {
          handleFirestoreError(error, OperationType.LIST, 'catalogVarieties');
        } catch {
          // Keep seed catalog visible if offline
        }
      },
    );

    const unsubMeta = onSnapshot(
      doc(db, 'catalogMeta', 'store'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Record<string, unknown>;
          setCatalogInitialized(Boolean(data.catalogInitialized));
          setStoreSettings(mapDocToStoreSettings(data));
        } else {
          setCatalogInitialized(false);
          setStoreSettings(DEFAULT_STORE_SETTINGS);
        }
        metaLoaded = true;
        finishLoading();
      },
      (error) => {
        metaLoaded = true;
        finishLoading();
        try {
          handleFirestoreError(error, OperationType.GET, 'catalogMeta/store');
        } catch {
          // Keep default store settings if offline
        }
      },
    );

    return () => {
      unsubVarieties();
      unsubMeta();
    };
  }, []);

  // Verify any saved session proof against Firestore Rules on mount
  useEffect(() => {
    let active = true;
    const verifySavedSession = async () => {
      const savedProof = getStoredProof();
      if (!savedProof) {
        if (active) {
          setIsAuthenticated(false);
          setAuthReady(true);
        }
        return;
      }

      try {
        await setDoc(doc(db, 'adminAuth', 'gate'), {
          proof: savedProof,
          updatedAt: serverTimestamp(),
        });
        if (active) {
          setIsAuthenticated(true);
        }
      } catch {
        setStoredProof(null);
        if (active) {
          setIsAuthenticated(false);
        }
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    };

    void verifySavedSession();
    return () => {
      active = false;
    };
  }, []);

  const flowers = catalogInitialized ? firestoreFlowers : SEED_FLOWERS;

  const requireProof = (): string => {
    const proof = getStoredProof();
    if (!proof) {
      setIsAuthenticated(false);
      throw new Error('Admin session expired. Please sign in again.');
    }
    return proof;
  };

  const ensureCatalogSeeded = useCallback(async (proof: string): Promise<void> => {
    if (catalogInitializedRef.current) return;

    const metaSnap = await getDoc(doc(db, 'catalogMeta', 'store'));
    if (metaSnap.exists() && Boolean(metaSnap.data()?.catalogInitialized)) {
      catalogInitializedRef.current = true;
      return;
    }

    const existingSnap = await getDocs(collection(db, 'catalogVarieties'));
    const batch = writeBatch(db);
    batch.set(doc(db, 'adminAuth', 'gate'), {
      proof,
      updatedAt: serverTimestamp(),
    });

    if (existingSnap.empty) {
      SEED_FLOWERS.forEach((flower, idx) => {
        batch.set(doc(db, 'catalogVarieties', flower.id), {
          id: flower.id,
          orderIndex: idx,
          nameEn: flower.nameEn,
          color: flower.color,
          cropEn: flower.cropEn,
          typeEn: flower.typeEn,
          breederCode: flower.breederCode,
          stemLength: flower.stemLength,
          extraSpecEn: flower.extraSpecEn,
          availability: flower.availability,
          photos: flower.photos,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    }

    batch.set(doc(db, 'catalogMeta', 'store'), {
      shopNameEn: DEFAULT_STORE_SETTINGS.shopNameEn,
      phone: DEFAULT_STORE_SETTINGS.phone,
      whatsapp: DEFAULT_STORE_SETTINGS.whatsapp,
      locationEn: DEFAULT_STORE_SETTINGS.locationEn,
      hoursEn: DEFAULT_STORE_SETTINGS.hoursEn,
      catalogInitialized: true,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    catalogInitializedRef.current = true;
    if (existingSnap.empty && firestoreFlowersRef.current.length === 0) {
      firestoreFlowersRef.current = SEED_FLOWERS;
    }
  }, []);

  const handleWriteError = (error: unknown, operation: OperationType, path: string, fallbackMessage: string): never => {
    if (isPermissionDeniedError(error)) {
      setStoredProof(null);
      setIsAuthenticated(false);
      throw new Error('Your admin session expired or the password was changed. Please sign in again.');
    }
    try {
      handleFirestoreError(error, operation, path);
    } catch {
      // Throw user-facing message after structured diagnostic log
    }
    throw new Error(error instanceof Error && error.message ? error.message : fallbackMessage);
  };

  async function login(password: string): Promise<void> {
    if (!password) {
      throw new Error('Please enter the merchant password.');
    }
    const proof = await deriveAdminProof(password);
    try {
      await setDoc(doc(db, 'adminAuth', 'gate'), {
        proof,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        throw new Error('Incorrect merchant password.');
      }
      throw new Error('Unable to reach database. Please check your internet connection and try again.');
    }

    setStoredProof(proof);
    setIsAuthenticated(true);

    try {
      await ensureCatalogSeeded(proof);
    } catch {
      // Seeding will retry automatically on first write if needed
    }
  }

  async function logout(): Promise<void> {
    setStoredProof(null);
    setIsAuthenticated(false);
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!currentPassword) {
      throw new Error('Please enter your current password.');
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      throw new Error('New password must be between 6 and 128 characters.');
    }
    if (newPassword === currentPassword) {
      throw new Error('New password must differ from current password.');
    }

    const currentProof = await deriveAdminProof(currentPassword);
    const nextProof = await deriveAdminProof(newPassword);
    const nextDoubleHash = await sha256Hex(nextProof);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'adminAuth', 'gate'), {
        proof: currentProof,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'adminAuth', 'config'), {
        passwordDoubleHash: nextDoubleHash,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setStoredProof(nextProof);
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        throw new Error('Current password is incorrect.');
      }
      throw new Error('Unable to update password. Please try again.');
    }
  }

  async function saveFlower(draft: FlowerDraft): Promise<void> {
    const proof = requireProof();
    try {
      await ensureCatalogSeeded(proof);
      const currentList = firestoreFlowersRef.current;
      const sanitized = sanitizeFlowerFields(draft, currentList.length);
      const existing = draft.id ? currentList.find((item) => item.id === draft.id) : undefined;

      const batch = writeBatch(db);
      batch.set(doc(db, 'adminAuth', 'gate'), {
        proof,
        updatedAt: serverTimestamp(),
      });

      if (existing) {
        batch.update(doc(db, 'catalogVarieties', existing.id), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
      } else {
        const id = slugifyFlowerId(sanitized.nameEn, draft.id);
        batch.set(doc(db, 'catalogVarieties', id), {
          id,
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (error) {
      if (error instanceof Error && (error.message.includes('required') || error.message.includes('session expired'))) {
        throw error;
      }
      handleWriteError(error, OperationType.WRITE, 'catalogVarieties', 'Failed to save flower variety.');
    }
  }

  async function removeFlower(flowerId: string): Promise<void> {
    const proof = requireProof();
    try {
      await ensureCatalogSeeded(proof);
      const remaining = sortFlowersByOrder(
        firestoreFlowersRef.current.filter((item) => item.id !== flowerId),
      );

      const batch = writeBatch(db);
      batch.set(doc(db, 'adminAuth', 'gate'), {
        proof,
        updatedAt: serverTimestamp(),
      });
      batch.delete(doc(db, 'catalogVarieties', flowerId));

      remaining.forEach((item, idx) => {
        if (item.orderIndex !== idx) {
          batch.update(doc(db, 'catalogVarieties', item.id), {
            orderIndex: idx,
            updatedAt: serverTimestamp(),
          });
        }
      });

      await batch.commit();
    } catch (error) {
      handleWriteError(error, OperationType.DELETE, `catalogVarieties/${flowerId}`, 'Failed to remove flower variety.');
    }
  }

  async function reorderFlower(index: number, direction: 'up' | 'down'): Promise<void> {
    const proof = requireProof();
    try {
      await ensureCatalogSeeded(proof);
      const ordered = sortFlowersByOrder(
        firestoreFlowersRef.current.length > 0 ? firestoreFlowersRef.current : SEED_FLOWERS,
      );
      const updates = computeSwapOrderUpdates(ordered, index, direction);
      if (!updates) return;

      const batch = writeBatch(db);
      batch.set(doc(db, 'adminAuth', 'gate'), {
        proof,
        updatedAt: serverTimestamp(),
      });

      for (const update of updates) {
        const current = ordered.find((item) => item.id === update.id);
        if (current && current.orderIndex !== update.orderIndex) {
          batch.update(doc(db, 'catalogVarieties', update.id), {
            orderIndex: update.orderIndex,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleWriteError(error, OperationType.UPDATE, 'catalogVarieties', 'Failed to reorder varieties.');
    }
  }

  async function saveStoreSettings(nextSettings: StoreSettings): Promise<void> {
    const proof = requireProof();
    const sanitized = sanitizeStoreSettings(nextSettings);
    try {
      await ensureCatalogSeeded(proof);
      const batch = writeBatch(db);
      batch.set(doc(db, 'adminAuth', 'gate'), {
        proof,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'catalogMeta', 'store'), {
        ...sanitized,
        catalogInitialized: true,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleWriteError(error, OperationType.WRITE, 'catalogMeta/store', 'Failed to update contact settings.');
    }
  }

  async function seedInitialCatalog(): Promise<void> {
    const proof = requireProof();
    try {
      const existingSnap = await getDocs(collection(db, 'catalogVarieties'));
      const seedIds = new Set(SEED_FLOWERS.map((f) => f.id));

      const batch = writeBatch(db);
      batch.set(doc(db, 'adminAuth', 'gate'), {
        proof,
        updatedAt: serverTimestamp(),
      });

      existingSnap.docs.forEach((docSnap) => {
        if (!seedIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      SEED_FLOWERS.forEach((flower, idx) => {
        const existingDoc = existingSnap.docs.find((d) => d.id === flower.id);
        if (existingDoc) {
          batch.update(doc(db, 'catalogVarieties', flower.id), {
            orderIndex: idx,
            nameEn: flower.nameEn,
            color: flower.color,
            cropEn: flower.cropEn,
            typeEn: flower.typeEn,
            breederCode: flower.breederCode,
            stemLength: flower.stemLength,
            extraSpecEn: flower.extraSpecEn,
            availability: flower.availability,
            photos: flower.photos,
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(doc(db, 'catalogVarieties', flower.id), {
            id: flower.id,
            orderIndex: idx,
            nameEn: flower.nameEn,
            color: flower.color,
            cropEn: flower.cropEn,
            typeEn: flower.typeEn,
            breederCode: flower.breederCode,
            stemLength: flower.stemLength,
            extraSpecEn: flower.extraSpecEn,
            availability: flower.availability,
            photos: flower.photos,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });

      batch.set(doc(db, 'catalogMeta', 'store'), {
        shopNameEn: storeSettings.shopNameEn || DEFAULT_STORE_SETTINGS.shopNameEn,
        phone: storeSettings.phone || DEFAULT_STORE_SETTINGS.phone,
        whatsapp: storeSettings.whatsapp || DEFAULT_STORE_SETTINGS.whatsapp,
        locationEn: storeSettings.locationEn || DEFAULT_STORE_SETTINGS.locationEn,
        hoursEn: storeSettings.hoursEn || DEFAULT_STORE_SETTINGS.hoursEn,
        catalogInitialized: true,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      catalogInitializedRef.current = true;
    } catch (error) {
      handleWriteError(error, OperationType.WRITE, 'catalogVarieties', 'Failed to restore curated varieties.');
    }
  }

  return {
    flowers,
    loading,
    storeSettings,
    authReady,
    isAuthenticated,
    login,
    logout,
    changePassword,
    saveFlower,
    removeFlower,
    reorderFlower,
    saveStoreSettings,
    seedInitialCatalog,
  };
}
