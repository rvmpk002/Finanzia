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
