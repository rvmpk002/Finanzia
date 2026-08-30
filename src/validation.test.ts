import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInstitutionInput, validateInvestmentInput } from './validation.ts';

test('validateInstitutionInput rejects empty names and malformed websites', () => {
  const emptyName = validateInstitutionInput({ name: '   ', website: 'https://example.com' });
  const badWebsite = validateInstitutionInput({ name: 'Banco Plata', website: 'no-es-una-url' });

  assert.deepEqual(emptyName, ['El nombre de la institución es obligatorio.']);
  assert.deepEqual(badWebsite, ['La URL del sitio web es inválida.']);
});

test('validateInvestmentInput rejects invalid balances and dates', () => {
  const negativeBalance = validateInvestmentInput({
    type: 'vista',
    balance: 0,
    withdrawn: 0,
    startDate: '2026-08-29',
  });

  const futureDate = validateInvestmentInput({
    type: 'vista',
    balance: 5000,
    withdrawn: 0,
    startDate: '2100-01-01',
  });

  const tooOld = validateInvestmentInput({
    type: 'vista',
    balance: 5000,
    withdrawn: 0,
    startDate: '1899-12-31',
  });

  const etfValue = validateInvestmentInput({
    type: 'etf',
    balance: 241799.60,
    withdrawn: 0,
    startDate: '2026-08-29',
  });

  assert.deepEqual(negativeBalance, ['El saldo inicial debe ser mayor a 0.']);
  assert.deepEqual(futureDate, ['La fecha de inicio no puede ser futura.']);
  assert.deepEqual(tooOld, ['La fecha de inicio es demasiado antigua.']);
  assert.deepEqual(etfValue, []);
});
