import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CatalogStore } from './store.ts';

function createTempStore(): { store: CatalogStore; cleanup: () => void; dbPath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bsblooms-test-'));
  const dbPath = path.join(dir, 'db.json');
  const store = new CatalogStore(dbPath);
  return {
    store,
    dbPath,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

test('CatalogStore initializes with default admin123 password and 8 Shimmer-first varieties', () => {
  const { store, cleanup } = createTempStore();
  try {
    const { flowers, storeSettings } = store.getPublicCatalog();
    assert.equal(flowers.length, 8);
    assert.equal(flowers[0].nameEn, 'Shimmer');
    assert.equal(storeSettings.shopNameEn, 'BSBlooms');

    assert.equal(store.login('wrongpass'), null);
    const token = store.login('admin123');
    assert.ok(token);
    assert.equal(store.verifySessionToken(token), true);
    assert.equal(store.verifySessionToken(`${token}tampered`), false);
  } finally {
    cleanup();
  }
});

test('CatalogStore password change invalidates old password and persists across reload', () => {
  const { store, dbPath, cleanup } = createTempStore();
  try {
    const oldToken = store.login('admin123');
    assert.ok(oldToken);

    const badChange = store.changePassword('wrong', 'newsecret1');
    assert.equal(badChange.ok, false);

    const changed = store.changePassword('admin123', 'blooms2026');
    assert.equal(changed.ok, true);
    if (changed.ok) {
      assert.equal(store.verifySessionToken(changed.token), true);
    }
    assert.equal(store.verifySessionToken(oldToken), false);
    assert.equal(store.login('admin123'), null);

    // Reload store from disk to verify persistence
    const reloaded = new CatalogStore(dbPath);
    assert.equal(reloaded.login('admin123'), null);
    assert.ok(reloaded.login('blooms2026'));
  } finally {
    cleanup();
  }
});

test('CatalogStore CRUD, reorder, and settings updates persist cleanly', () => {
  const { store, dbPath, cleanup } = createTempStore();
  try {
    const added = store.saveFlower({
      orderIndex: 8,
      nameEn: 'Dune',
      color: 'Peach',
      cropEn: 'Gerbera',
      typeEn: 'Standard',
      breederCode: 'Dune',
      stemLength: '60 cm',
      extraSpecEn: 'Soft peach bloom',
      availability: 'in_stock',
      photos: ['/assets/blooms/shimmer.jpg'],
    });
    assert.equal(store.getPublicCatalog().flowers.length, 9);

    const reordered = store.reorderFlower(1, 'up');
    assert.ok(reordered);
    assert.equal(reordered[0].nameEn, 'Sita');

    assert.equal(store.deleteFlower(added.id), true);
    assert.equal(store.getPublicCatalog().flowers.length, 8);

    store.updateStoreSettings({
      shopNameEn: 'BSBlooms',
      phone: '+91 96301 77446',
      whatsapp: '919630177446',
      locationEn: 'Indore Greenhouse',
      hoursEn: '6 AM – 8 PM',
    });

    const reloaded = new CatalogStore(dbPath);
    assert.equal(reloaded.getPublicCatalog().flowers[0].nameEn, 'Sita');
    assert.equal(reloaded.getPublicCatalog().storeSettings.whatsapp, '919630177446');
  } finally {
    cleanup();
  }
});
