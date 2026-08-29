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

const calculateUpdatedBalance = ({ availableBalance, annualRate, startDate, calculationDate, calculationMethod }) => {
  const monthlyDays = daysInMonth(calculationDate);
  const monthlyYield = calculationMethod === 'mifel360'
    ? mifelInterest(availableBalance, annualRate, monthlyDays)
    : 0;
  const daysElapsed = Math.max(0, Math.floor((calculationDate.getTime() - startDate.getTime()) / 86400000));
  const totalAccumulated = calculationMethod === 'mifel360'
    ? mifelInterest(availableBalance, annualRate, daysElapsed)
    : 0;
  const completedMonths = completedMonthsBetween(startDate, calculationDate);
  const buggy = Math.max(0, availableBalance + (calculationMethod === 'mifel360' ? monthlyYield * completedMonths : 0));
  const fixed = Math.max(0, availableBalance + totalAccumulated);
  return { buggy, fixed, totalAccumulated, monthlyYield, completedMonths, daysElapsed };
};

test('Mifel should accrue interest even when completedMonths is zero', () => {
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
  assert.equal(result.buggy, 500000, 'El cálculo anterior quedaba congelado en 500000');
  assert.ok(result.totalAccumulated > 0, 'Debe existir rendimiento acumulado para los días transcurridos');
  assert.ok(result.fixed > result.buggy, 'El cálculo corregido debe sumar el rendimiento acumulado');
  assert.ok(result.fixed > 500000, 'El saldo actualizado debe aumentar por el rendimiento');
});
