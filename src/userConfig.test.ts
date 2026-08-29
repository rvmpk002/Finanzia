import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserProductConfig, mergeUserProductConfig, normalizeUserProductConfig, notifyUserConfigUpdated } from './userConfig.ts';

test('normalizeUserProductConfig preserves user config values and fills defaults', () => {
  const normalized = normalizeUserProductConfig({
    institutionId: 'mifel',
    productId: 'mifel-cuenta-digital-evoluciona',
    annualRate: 10,
    promoCap: 500000,
  });

  assert.equal(normalized.institutionId, 'mifel');
  assert.equal(normalized.productId, 'mifel-cuenta-digital-evoluciona');
  assert.equal(normalized.annualRate, 10);
  assert.equal(normalized.promoCap, 500000);
  assert.equal(normalized.daysBase, 365);
  assert.equal(normalized.isActive, true);
});

test('createUserProductConfig builds a complete record from a product seed', () => {
  const record = createUserProductConfig({
    institutionId: 'mifel',
    productId: 'mifel-cuenta-digital-evoluciona',
    annualRate: 10,
    promoCap: 500000,
    calculationMethod: 'mifel360',
    taxRate: 9,
    daysBase: 360,
  });

  assert.equal(record.institutionId, 'mifel');
  assert.equal(record.productId, 'mifel-cuenta-digital-evoluciona');
  assert.equal(record.calculationMethod, 'mifel360');
  assert.equal(record.excessRate, 0);
  assert.equal(record.isActive, true);
});

test('mergeUserProductConfig applies the logged-in user override to the catalog product', () => {
  const institutions = [{
    id: 'mifel',
    products: [{
      id: 'mifel-cuenta-digital',
      annualRate: 10,
      promoCap: 25000,
      excessRate: 0,
      calculationMethod: 'mifel360',
      taxRate: 9,
      daysBase: 360,
      promotionDays: 60,
      isActive: true,
    }],
  }];

  const merged = mergeUserProductConfig(institutions as any, [{
    institutionId: 'mifel',
    productId: 'mifel-cuenta-digital',
    annualRate: 12.5,
    promoCap: 32000,
    excessRate: 7,
    calculationMethod: 'compound',
    taxRate: 10,
    daysBase: 365,
    promotionDays: 90,
    isActive: true,
    updatedAt: '2026-08-29T00:00:00.000Z',
  }]);

  assert.equal(merged[0].products[0].annualRate, 12.5);
  assert.equal(merged[0].products[0].promoCap, 32000);
  assert.equal(merged[0].products[0].excessRate, 7);
  assert.equal(merged[0].products[0].calculationMethod, 'compound');
  assert.equal(merged[0].products[0].daysBase, 365);
  assert.equal(merged[0].products[0].promotionDays, 90);
});

test('legacy Kubo product ids collapse to the single canonical product in protection configs', () => {
  const canonical = mergeUserProductConfig([
    {
      id: 'kubo',
      products: [
        { id: 'kubo-liquidez', annualRate: 10, promoCap: 0, excessRate: 0, calculationMethod: 'kubo', taxRate: 0, daysBase: 365, promotionDays: 60, isActive: true },
      ],
    },
  ] as any, [
    {
      institutionId: 'kubo',
      productId: 'kubo-plazos',
      annualRate: 7.5,
      promoCap: 0,
      excessRate: 0,
      calculationMethod: 'kubo',
      taxRate: 0,
      daysBase: 365,
      promotionDays: 60,
      isActive: true,
      updatedAt: '2026-08-29T00:00:00.000Z',
    },
    {
      institutionId: 'kubo',
      productId: 'kubo-largo-plazo',
      annualRate: 12,
      promoCap: 0,
      excessRate: 0,
      calculationMethod: 'kubo',
      taxRate: 0,
      daysBase: 365,
      promotionDays: 60,
      isActive: true,
      updatedAt: '2026-08-29T00:00:00.000Z',
    },
  ]);

  const kuboProducts = canonical[0].products.map((product: { id: string }) => product.id);
  assert.deepEqual(kuboProducts, ['kubo-liquidez']);
});

test('notifyUserConfigUpdated dispatches a browser event so the dashboard refreshes immediately', () => {
  const seen: string[] = [];
  const previousDispatchEvent = globalThis.dispatchEvent;
  globalThis.dispatchEvent = ((event: Event) => {
    seen.push(event.type);
    return true;
  }) as typeof globalThis.dispatchEvent;

  try {
    notifyUserConfigUpdated();
    assert.deepEqual(seen, ['finanzia-user-config-updated']);
  } finally {
    globalThis.dispatchEvent = previousDispatchEvent;
  }
});
