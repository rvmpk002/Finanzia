import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeInstitutionProduct } from './index.js';

test('ETF saves accept custom product IDs and are considered valid', () => {
  const result = sanitizeInstitutionProduct('etf', 'VOO');

  assert.deepEqual(result, {
    institutionId: 'etf',
    productId: 'VOO',
    isValid: true,
  });
});

test('Adding custom products to existing institutions like Nu or Banco Plata are valid and accepted', () => {
  const nuCustom = sanitizeInstitutionProduct('nu', 'nu-cajita-congelada-90');
  assert.deepEqual(nuCustom, {
    institutionId: 'nu',
    productId: 'nu-cajita-congelada-90',
    isValid: true,
  });

  const plataCustom = sanitizeInstitutionProduct('banco-plata', 'plata-promocional-2026');
  assert.deepEqual(plataCustom, {
    institutionId: 'banco-plata',
    productId: 'plata-promocional-2026',
    isValid: true,
  });
});
