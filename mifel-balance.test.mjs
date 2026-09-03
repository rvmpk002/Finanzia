import test from 'node:test';
import assert from 'node:assert/strict';

const mifelInterest = (principal, annualRate, days, daysBase = 360) => principal * (annualRate / 100) * (days / daysBase);
const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const completedMonthsBetween = (startDate, calculationDate) => {
  let months =
    (calculationDate.getFullYear() - startDate.getFullYear()) * 12 +
    calculationDate.getMonth() -
    startDate.getMonth();
  if (calculationDate.getDate() < startDate.getDate()) months -= 1;
  return Math.max(0, months);
};

const calculateUpdatedBalance = ({ availableBalance, annualRate, startDate, calculationDate, calculationMethod, taxRate = 9 }) => {
  const monthlyDays = daysInMonth(calculationDate);
  const monthlyYield = calculationMethod === 'mifel360'
    ? mifelInterest(availableBalance, annualRate, monthlyDays)
    : 0;
  const daysElapsed = Math.max(0, Math.floor((calculationDate.getTime() - startDate.getTime()) / 86400000));
  const totalAccumulated = calculationMethod === 'mifel360'
    ? mifelInterest(availableBalance, annualRate, daysElapsed)
    : 0;
  const completedMonths = completedMonthsBetween(startDate, calculationDate);
  const accumulatedTaxWithheld = calculationMethod === 'mifel360' ? totalAccumulated * (taxRate / 100) : 0;
  const grossUpdatedBalance = Math.max(0, availableBalance + totalAccumulated);
  const fixed = Math.max(0, availableBalance + totalAccumulated - accumulatedTaxWithheld);
  return { grossUpdatedBalance, fixed, totalAccumulated, accumulatedTaxWithheld, monthlyYield, completedMonths, daysElapsed };
};

test('Mifel should accrue interest even when completedMonths is zero and subtract ISR', () => {
  const startDate = new Date('2026-08-01T00:00:00');
  const calculationDate = new Date('2026-08-29T00:00:00');
  const result = calculateUpdatedBalance({
    availableBalance: 500000,
    annualRate: 10,
    startDate,
    calculationDate,
    calculationMethod: 'mifel360',
  });

  assert.equal(result.completedMonths, 0, 'Dentro del mismo mes no debe haber meses completos');
  assert.ok(result.totalAccumulated > 0, 'Debe existir rendimiento acumulado para los días transcurridos');
  assert.ok(result.accumulatedTaxWithheld > 0, 'Debe retenerse ISR del 9% sobre el rendimiento');
  assert.equal(result.fixed, result.grossUpdatedBalance - result.accumulatedTaxWithheld);
});

test('Mifel matches the official balance deducting 12.47 ISR: 499029.73 - 12.47 = 499017.26', () => {
  const availableBalance = 498891.15;
  const annualRate = 10;
  const startDate = new Date('2026-09-01T00:00:00');
  const calculationDate = new Date('2026-09-02T00:00:00');
  const result = calculateUpdatedBalance({
    availableBalance,
    annualRate,
    startDate,
    calculationDate,
    calculationMethod: 'mifel360',
    taxRate: 9,
  });

  const dailyYieldRounded = Number(result.totalAccumulated.toFixed(2));
  const isrRounded = Number(result.accumulatedTaxWithheld.toFixed(2));
  const grossBalanceRounded = Number(result.grossUpdatedBalance.toFixed(2));
  const netBalanceRounded = Number(result.fixed.toFixed(2));

  assert.equal(dailyYieldRounded, 138.58, 'Ganancia diaria esperada es 138.58');
  assert.equal(isrRounded, 12.47, 'ISR retenido esperado es 12.47');
  assert.equal(grossBalanceRounded, 499029.73, 'Saldo bruto sin retención era 499029.73');
  assert.equal(netBalanceRounded, 499017.26, 'Saldo neto oficial Mifel debe ser 499017.26');
});

test('Mifel matches the official balance deducting 12.48 ISR for 02-09: 499017.26 + 126.14 = 499143.40', () => {
  const availableBalance = 499017.26;
  const annualRate = 10;
  const startDate = new Date('2026-09-02T00:00:00');
  const calculationDate = new Date('2026-09-03T00:00:00');
  const result = calculateUpdatedBalance({
    availableBalance,
    annualRate,
    startDate,
    calculationDate,
    calculationMethod: 'mifel360',
    taxRate: 9,
  });

  const dailyYieldRounded = Number(result.totalAccumulated.toFixed(2));
  const isrRounded = Number(result.accumulatedTaxWithheld.toFixed(2));
  const netBalanceRounded = Number(result.fixed.toFixed(2));

  assert.equal(dailyYieldRounded, 138.62, 'Ganancia diaria bruta esperada es 138.62');
  assert.equal(isrRounded, 12.48, 'ISR retenido esperado es 12.48');
  assert.equal(netBalanceRounded, 499143.40, 'Saldo neto disponible real en Mifel debe ser 499143.40');
});

