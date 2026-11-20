import test from 'node:test';
import assert from 'node:assert/strict';
import type { Flower, StoreSettings } from '../types/flower.ts';
import { SEED_FLOWERS } from '../data/seedFlowers.ts';
import {
  buildTelUrl,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  computeSwapOrderUpdates,
  slugifyFlowerId,
  sortFlowersByOrder,
  validateFlowerDraft,
  validatePasswordChange,
  validateStoreSettings,
} from './catalog.ts';

const SAMPLE_FLOWERS: Flower[] = [
  {
    id: 'gerbera-sita',
    orderIndex: 1,
    nameEn: 'Sita',
    color: 'White',
    cropEn: 'Gerbera',
    typeEn: 'Standard · Single',
    breederCode: 'Pole Star · VBN 123369',
    stemLength: '65 cm',
    extraSpecEn: 'Diameter 12–14 cm · Vase life 15–17 days',
    availability: 'in_stock',
    photos: ['/assets/blooms/pole-star.jpg'],
  },
  {
    id: 'gerbera-shimmer',
    orderIndex: 0,
    nameEn: 'Shimmer',
    color: 'White-Pink',
    cropEn: 'Gerbera',
    typeEn: 'Standard · Semi-double',
    breederCode: 'Shimmer · VBN 102468',
    stemLength: '60 cm',
    extraSpecEn: 'Diameter 10–12 cm · Vase life 12–14 days',
    availability: 'in_stock',
    photos: ['/assets/blooms/shimmer.jpg'],
  },
  {
    id: 'gerbera-ankur',
    orderIndex: 2,
    nameEn: 'Ankur',
    color: 'Red',
    cropEn: 'Gerbera',
    typeEn: 'Standard · Semi-double',
    breederCode: 'Ankur · VBN 117993',
    stemLength: '60 cm',
    extraSpecEn: 'Diameter 11–13 cm · Vase life 15–17 days',
    availability: 'limited',
    photos: ['/assets/blooms/crimson-red.jpg'],
  },
];

test('SEED_FLOWERS starts with Shimmer and includes all 8 client varieties', () => {
  assert.equal(SEED_FLOWERS.length, 8);
  assert.deepEqual(
    SEED_FLOWERS.map((f) => f.nameEn),
    ['Shimmer', 'Sita', 'Pre-Intenzz', 'Manjunath', 'Lyon', 'Sisco', 'Ankur', 'Capella'],
  );
});

test('sortFlowersByOrder sorts varieties ascending by orderIndex', () => {
  const sorted = sortFlowersByOrder(SAMPLE_FLOWERS);
  assert.deepEqual(
    sorted.map((f) => f.id),
    ['gerbera-shimmer', 'gerbera-sita', 'gerbera-ankur'],
  );
});

test('computeSwapOrderUpdates reorders items up and down accurately', () => {
  const sorted = sortFlowersByOrder(SAMPLE_FLOWERS);
  const movedUp = computeSwapOrderUpdates(sorted, 2, 'up');
  assert.deepEqual(movedUp, [
    { id: 'gerbera-shimmer', orderIndex: 0 },
    { id: 'gerbera-ankur', orderIndex: 1 },
    { id: 'gerbera-sita', orderIndex: 2 },
  ]);

  assert.equal(computeSwapOrderUpdates(sorted, 0, 'up'), null);
  assert.equal(computeSwapOrderUpdates(sorted, 2, 'down'), null);
});

test('buildWhatsAppMessage formats BSBlooms multi-variety and general inquiries cleanly', () => {
  const msg = buildWhatsAppMessage(
    [SAMPLE_FLOWERS[1], SAMPLE_FLOWERS[2]],
    {
      customerName: 'Anuj',
      notes: 'Box dispatch to Delhi',
      quantities: { 'gerbera-shimmer': '300 stems' },
    },
    'BSBlooms',
  );

  assert.match(msg, /Hello BSBlooms/);
  assert.match(msg, /1\. Shimmer \(White-Pink\) — Qty: 300 stems/);
  assert.match(msg, /2\. Ankur \(Red\)/);
  assert.match(msg, /Name: Anuj/);
  assert.match(msg, /Notes: Box dispatch to Delhi/);

  const url = buildWhatsAppUrl('+91 98765 43210', msg);
  assert.ok(url.startsWith('https://wa.me/919876543210?text='));

  const empty = buildWhatsAppMessage([], { customerName: '', notes: '', quantities: {} }, 'BSBlooms');
  assert.match(empty, /Hello BSBlooms, I would like to inquire/);
});

test('buildTelUrl, slugifyFlowerId, and validators catch invalid inputs', () => {
  assert.equal(buildTelUrl('+91 98765-43210'), 'tel:+919876543210');
  assert.match(slugifyFlowerId('Pre-Intenzz!'), /^[a-zA-Z0-9_-]+$/);

  assert.ok(
    validateFlowerDraft({
      orderIndex: 0,
      nameEn: '',
      color: 'Pink',
      cropEn: 'Gerbera',
      typeEn: 'Standard',
      breederCode: '',
      stemLength: '',
      extraSpecEn: '',
      availability: 'in_stock',
      photos: ['/assets/blooms/award.jpg'],
    }),
  );

  const badSettings: StoreSettings = {
    shopNameEn: 'BSBlooms',
    phone: '12',
    whatsapp: 'invalid',
    locationEn: '',
    hoursEn: '',
  };
  assert.ok(validateStoreSettings(badSettings));

  assert.ok(validatePasswordChange('', 'newpass123', 'newpass123'));
  assert.ok(validatePasswordChange('admin123', '123', '123'));
  assert.ok(validatePasswordChange('admin123', 'newpass123', 'mismatch'));
  assert.ok(validatePasswordChange('admin123', 'admin123', 'admin123'));
  assert.equal(validatePasswordChange('admin123', 'blooms2026', 'blooms2026'), null);
});
