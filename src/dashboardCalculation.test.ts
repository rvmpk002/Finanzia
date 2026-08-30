import test from 'node:test';
import assert from 'node:assert/strict';
import { kuboInterest, resolveRateSplit, simpleInterest } from './calculationEngine.ts';

const emulateRollover = (rows: Array<{ endDate: string; balance: number; updatedBalance: number; termDays?: number; reinvestmentRule?: 'no' | 'capital' | 'capital_e_intereses'; }>, today: Date) => {
  return rows.flatMap((investment) => {
    if (!investment.endDate || investment.reinvestmentRule === 'no') return [investment];
    const maturityDate = new Date(`${investment.endDate}T00:00:00`);
    if (maturityDate > today) return [investment];

    const rolloverBase = investment.reinvestmentRule === 'capital'
      ? Math.max(0, investment.balance)
      : Math.max(0, investment.updatedBalance);
    return [{
      ...investment,
      balance: rolloverBase,
      updatedBalance: rolloverBase,
      endDate: new Date(today.getTime() + Math.max(1, investment.termDays ?? 30) * 86400000).toISOString().slice(0, 10),
    }];
  });
};

test('simple interest uses the configured days base instead of compounding', () => {
  const daily = simpleInterest(100000, 11.5, 1, 365);
  const total = simpleInterest(100000, 11.5, 1, 365);

  assert.ok(Math.abs(daily - 31.50684931506849) < 0.01);
  assert.ok(Math.abs(total - 31.50684931506849) < 0.01);
});

test('fixed-rate products without promo tiers keep the full balance at the annual rate', () => {
  const split = resolveRateSplit(10000, 13, 0, 0);

  assert.equal(split.promoBalance, 10000);
  assert.equal(split.excessBalance, 0);
  assert.equal(split.effectiveExcessRate, 13);
});

test('Kubo short-term maturity matches the official net return for a 3-day term', () => {
  const interest = kuboInterest(27925.21, 10, 3);

  assert.ok(Math.abs(interest - 21.18) < 0.2, `Kubo net interest should be around $21.18, got $${interest.toFixed(2)}`);
});

test('Kubo uses the configured term days instead of the calendar span when the chosen term is 3 days', () => {
  const daysFromDates = Math.floor((new Date('2026-09-01T00:00:00').getTime() - new Date('2026-08-28T00:00:00').getTime()) / 86400000);
  const chosenTermDays = 3;
  const interest = kuboInterest(27925.21, 10, chosenTermDays);
  assert.equal(daysFromDates, 4);
  assert.ok(Math.abs(interest - 21.18) < 0.2);
});

test('matured plazo investments with automatic reinvestment rollover their principal and interest', () => {
  const matured = [{
    endDate: '2026-08-31',
    balance: 27925.21,
    updatedBalance: 27946.39,
    termDays: 3,
    reinvestmentRule: 'capital_e_intereses' as const,
  }];

  const rolled = emulateRollover(matured, new Date('2026-08-31T00:00:00'));

  assert.equal(rolled.length, 1);
  assert.equal(rolled[0].balance, 27946.39);
  assert.equal(rolled[0].updatedBalance, 27946.39);
  assert.equal(rolled[0].endDate, '2026-09-03');
});
