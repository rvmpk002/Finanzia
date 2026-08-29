import test from 'node:test';
import assert from 'node:assert/strict';
import { BANCO_PLATA_PRODUCT_IDS } from './bancoPlataRules.ts';

test('Banco Plata keeps exactly two canonical products: Ultra at 15% and Fijo at 11%', () => {
  assert.deepEqual(BANCO_PLATA_PRODUCT_IDS, ['ahorro-flexible', 'ahorro-fijo']);
});
