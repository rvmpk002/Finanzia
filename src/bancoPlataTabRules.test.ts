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

test('Kubo is a single plazo product priced at 10% for 1-4 day terms', () => {
  assert.equal(isSelectableInstitution('kubo', 'plazo'), true);
  assert.equal(isSelectableInstitution('kubo', 'vista'), false);
  assert.equal(isSelectableProduct('kubo', { id: 'kubo-liquidez' }, 'plazo'), true);
  assert.equal(isSelectableProduct('kubo', { id: 'kubo-liquidez' }, 'vista'), false);
});

test('Adding a new product to an existing institution allows it to be selected based on its modality', () => {
  const customNuPlazoProduct = { id: 'nu-cajita-congelada-90', name: 'Cajita Congelada 90d', icon: 'fixed' as const, calculationMethod: 'simple' };
  const customNuVistaProduct = { id: 'nu-cuenta-plus', name: 'Cuenta Plus', icon: 'account' as const, calculationMethod: 'compound' };

  assert.equal(isSelectableProduct('nu', customNuPlazoProduct, 'plazo'), true);
  assert.equal(isSelectableProduct('nu', customNuPlazoProduct, 'vista'), false);
  assert.equal(isSelectableProduct('nu', customNuVistaProduct, 'vista'), true);
  assert.equal(isSelectableProduct('nu', customNuVistaProduct, 'plazo'), false);

  const nuWithBothProducts = [
    { id: 'nu-cajita-turbo', name: 'Cajita Turbo' },
    customNuPlazoProduct,
  ];

  assert.equal(isSelectableInstitution('nu', 'vista', nuWithBothProducts), true);
  assert.equal(isSelectableInstitution('nu', 'plazo', nuWithBothProducts), true);
});
