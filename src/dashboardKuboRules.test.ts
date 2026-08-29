import test from 'node:test';
import assert from 'node:assert/strict';
import { getInvestmentTab, normalizeInvestmentType } from './tabRules.ts';

test('Kubo investments appear under plazo in the dashboard regardless of legacy saved type', () => {
  assert.equal(getInvestmentTab('kubo', 'vista'), 'plazo');
  assert.equal(getInvestmentTab('kubo', 'plazo'), 'plazo');
  assert.equal(getInvestmentTab('banco-plata', 'plazo'), 'plazo');
  assert.equal(getInvestmentTab('nu', 'vista'), 'vista');
});

test('legacy Kubo vista values are normalized to plazo at the data boundary', () => {
  assert.equal(normalizeInvestmentType('kubo', 'vista'), 'plazo');
  assert.equal(normalizeInvestmentType('kubo', 'plazo'), 'plazo');
  assert.equal(normalizeInvestmentType('nu', 'vista'), 'vista');
});
