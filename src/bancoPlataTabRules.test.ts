import test from 'node:test';
import assert from 'node:assert/strict';
import { isSelectableProduct, isSelectableInstitution } from './tabRules.ts';

test('Banco Plata products are only selectable in the plazo tab and both products are available there', () => {
  assert.equal(isSelectableProduct('banco-plata', { id: 'ahorro-flexible' }, 'vista'), false);
  assert.equal(isSelectableProduct('banco-plata', { id: 'ahorro-fijo' }, 'vista'), false);
  assert.equal(isSelectableProduct('banco-plata', { id: 'ahorro-flexible' }, 'plazo'), true);
  assert.equal(isSelectableProduct('banco-plata', { id: 'ahorro-fijo' }, 'plazo'), true);
  assert.equal(isSelectableInstitution('banco-plata', 'vista'), false);
  assert.equal(isSelectableInstitution('banco-plata', 'plazo'), true);
});
