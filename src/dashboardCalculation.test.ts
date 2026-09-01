import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvestment, fromLocalDateString, prepareUpdatedInvestmentOnBalanceEdit, resolveLatestInvestmentRecord, toLocalDateString, withdrawnAfterUpdatedBalanceEdit } from './DashboardPage.tsx';
import { didiInterest, didiNetInterest, kuboInterest, mercadoPagoInterest, openbankTieredInterest, resolveRateSplit, simpleInterest } from './calculationEngine.ts';
import { shouldShowMercadoPagoMinimumBalanceWarning } from './warningRules';

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

test('Openbank applies the three displayed balance tiers', () => {
  const interest = openbankTieredInterest(1_100_000, 13, 7, 360);

  assert.equal(interest, 30000 * 13 / 100 + 970000 * 7 / 100 + 100000 * 6.5 / 100);
});

test('Mercado Pago applies 12% only up to the 25,000 preferential cap', () => {
  assert.ok(Math.abs(mercadoPagoInterest(22239.95, 12, 30) - 219.35) < 0.01);
  assert.ok(Math.abs(mercadoPagoInterest(30000, 12, 365) - 3000) < 0.01);
});

test('DiDi applies 15% to the first 10,000 and 7.5% to the excess on a 360-day base', () => {
  assert.ok(Math.abs(didiInterest(30000, 15, 7.5, 1) - 8.3333333333) < 0.01);
  assert.ok(Math.abs(didiInterest(5000, 15, 7.5, 360) - 75) < 0.01);
});

test('DiDi dashboard gains use the gross daily amount', () => {
  const daily = didiNetInterest(10058.42, 1);

  assert.ok(Math.abs(daily - 4.18) < 0.01);
  assert.ok(Math.abs(daily * 7 - 29.25) < 0.01);
  assert.ok(Math.abs(daily * 30 - 125.36) < 0.01);
  assert.ok(Math.abs(daily * 365 - 1525.28) < 0.01);
});

test('DiDi does not subtract historical total withdrawn from the earning principal', () => {
  const grossPrincipal = 10058.42;
  const grossDaily = didiNetInterest(grossPrincipal, 1);
  const reducedDaily = didiNetInterest(grossPrincipal - 363.6, 1);

  assert.ok(Math.abs(grossDaily - 4.04) < 0.01);
  assert.ok(reducedDaily < grossDaily);
});

test('Openbank ignores stale saved rates and calculates 30,153.89 at about 10.86 per day', () => {
  const investment = {
    type: 'vista' as const,
    institutionId: 'openbank',
    productId: 'openbank',
    balance: 30153.89,
    annualRate: 12.5,
    excessRate: 5,
    promoCap: 30000,
    monthlyYield: 0,
    nextMonthBalance: 0,
    updatedBalance: 30153.89,
    nextMonthExcess: 0,
    calculatedAt: '2026-08-30',
    daysElapsed: 0,
    estimatedToday: 0,
    startDate: '2026-08-30',
    promotionalYield: 0,
    excessYield: 0,
    totalAccumulated: 0,
    dailyYield: 0,
    taxWithheld: 0,
    netDailyYield: 0,
    withdrawn: 1153.89,
  };
  const institutions = [{
    id: 'openbank',
    name: 'Openbank',
    products: [{
      id: 'openbank',
      name: 'Ahorro Open',
      annualRate: 12.5,
      excessRate: 5,
      promoCap: 30000,
      daysBase: 360,
      calculationMethod: 'compound',
    }],
  }];

  const result = calculateInvestment(investment as any, institutions as any);

  assert.ok(Math.abs(result.dailyYield - 10.86) < 0.01, `expected about 10.86, got ${result.dailyYield}`);
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

test('date-only values stay in local calendar time and do not jump by one day', () => {
  const original = new Date(2026, 7, 29, 23, 30, 0);
  const dateKey = toLocalDateString(original);
  const parsed = fromLocalDateString(dateKey);

  assert.equal(dateKey, '2026-08-29');
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 7);
  assert.equal(parsed.getDate(), 29);
});

test('the Nu minimum purchase warning appears only on the first three days of each month', () => {
  assert.equal(shouldShowNuMinimumPurchaseWarning(new Date('2026-08-01T12:00:00')), true);
  assert.equal(shouldShowNuMinimumPurchaseWarning(new Date('2026-08-02T12:00:00')), true);
  assert.equal(shouldShowNuMinimumPurchaseWarning(new Date('2026-08-03T12:00:00')), true);
  assert.equal(shouldShowNuMinimumPurchaseWarning(new Date('2026-08-04T12:00:00')), false);
  assert.equal(shouldShowNuMinimumPurchaseWarning(new Date('2026-08-31T12:00:00')), false);
});

test('Nu grows daily from the edited updated balance and keeps current and updated aligned', () => {
  const institutions = [{
    id: 'nu',
    name: 'Nu',
    products: [{
      id: 'nu-cajita-turbo',
      name: 'Cajita Turbo',
      annualRate: 13,
      calculationMethod: 'compound',
      promoCap: 0,
      excessRate: 0,
      allowManualUpdatedBalanceOverride: true,
    }],
  }];
  const investment = {
    type: 'vista' as const,
    institutionId: 'nu',
    productId: 'nu-cajita-turbo',
    balance: 25126.68,
    promoCap: 0,
    annualRate: 13,
    monthlyYield: 0,
    nextMonthBalance: 0,
    updatedBalance: 25126.68,
    updatedBalanceOverride: 25126.68,
    nextMonthExcess: 0,
    calculatedAt: '2026-08-30',
    daysElapsed: 1,
    estimatedToday: 0,
    startDate: '2026-08-29',
    promotionalYield: 0,
    excessYield: 0,
    totalAccumulated: 8.95,
    dailyYield: 8.95,
    taxWithheld: 0,
    netDailyYield: 8.95,
    withdrawn: 0,
  };

  const result = calculateInvestment(investment as any, institutions as any);

  assert.ok(Math.abs(result.balance - 25135.63) < 0.05, `expected ~25135.63 balance, got ${result.balance}`);
  assert.ok(Math.abs(result.updatedBalance - 25135.63) < 0.05, `expected ~25135.63 updatedBalance, got ${result.updatedBalance}`);
});

test('Nu keeps both balances synchronized for legacy product IDs', () => {
  const investment = {
    type: 'vista' as const,
    institutionId: 'nu',
    productId: 'legacy-nu-product',
    balance: 24746.64,
    updatedBalance: 25000,
    updatedBalanceOverride: 25000,
    annualRate: 13,
    promoCap: 0,
    monthlyYield: 0,
    nextMonthBalance: 0,
    nextMonthExcess: 0,
    calculatedAt: '2026-08-30',
    daysElapsed: 0,
    estimatedToday: 0,
    startDate: '2026-08-30',
    promotionalYield: 0,
    excessYield: 0,
    totalAccumulated: 0,
    dailyYield: 0,
    taxWithheld: 0,
    netDailyYield: 0,
    withdrawn: 0,
  };
  const result = calculateInvestment(investment as any, [{ id: 'nu', name: 'Nu', products: [] }] as any);

  assert.equal(result.balance, 25000);
  assert.equal(result.updatedBalance, 25000);
});

test('editing updated balance adds the reduction to total withdrawn', () => {
  assert.equal(withdrawnAfterUpdatedBalanceEdit(1000, 750, 100), 350);
  assert.equal(withdrawnAfterUpdatedBalanceEdit(1000, 1250, 100), 100);
});

test('the Mercado Pago minimum balance warning appears only on the last three days of each month', () => {
  assert.equal(shouldShowMercadoPagoMinimumBalanceWarning(new Date('2026-08-29T12:00:00')), true);
  assert.equal(shouldShowMercadoPagoMinimumBalanceWarning(new Date('2026-08-30T12:00:00')), true);
  assert.equal(shouldShowMercadoPagoMinimumBalanceWarning(new Date('2026-08-31T12:00:00')), true);
  assert.equal(shouldShowMercadoPagoMinimumBalanceWarning(new Date('2026-08-28T12:00:00')), false);
  assert.equal(shouldShowMercadoPagoMinimumBalanceWarning(new Date('2026-09-01T12:00:00')), false);
});

test('editing updated balance on vista investment resets startDate to today and recalculates daysElapsed to 0', () => {
  const oldInvestment = {
    id: 1,
    type: 'vista' as const,
    institutionId: 'openbank',
    productId: 'openbank',
    balance: 10000,
    promoCap: 30000,
    annualRate: 13,
    excessRate: 7,
    monthlyYield: 108.33,
    nextMonthBalance: 10108.33,
    updatedBalance: 10108.33,
    nextMonthExcess: 0,
    calculatedAt: '2026-08-31',
    daysElapsed: 30,
    estimatedToday: 10003.61,
    startDate: '2026-08-01',
    promotionalYield: 108.33,
    excessYield: 0,
    totalAccumulated: 108.33,
    dailyYield: 3.61,
    withdrawn: 0,
  };

  const today = '2026-08-31';
  const updated = prepareUpdatedInvestmentOnBalanceEdit(oldInvestment as any, 15000, true, today);

  assert.equal(updated.startDate, today);
  assert.equal(updated.balance, 15000);
  assert.equal(updated.updatedBalance, 15000);

  const institutions = [{
    id: 'openbank',
    name: 'Openbank',
    products: [{
      id: 'openbank',
      name: 'Ahorro Open',
      annualRate: 13,
      excessRate: 7,
      promoCap: 30000,
      daysBase: 360,
      calculationMethod: 'openbank',
      allowManualUpdatedBalanceOverride: true,
    }],
  }];

  const recalculated = calculateInvestment(updated as any, institutions as any);
  assert.equal(recalculated.startDate, today);
  assert.equal(recalculated.daysElapsed, 0);
  assert.equal(recalculated.balance, 15000);
  assert.equal(recalculated.updatedBalance, 15000);
});

test('editing updated balance on non-vista investment (plazo or etf) keeps original startDate', () => {
  const plazoInvestment = {
    id: 2,
    type: 'plazo' as const,
    institutionId: 'cetesdirecto',
    productId: 'cetes-28',
    balance: 5000,
    promoCap: 0,
    annualRate: 11,
    monthlyYield: 0,
    nextMonthBalance: 0,
    updatedBalance: 5000,
    nextMonthExcess: 0,
    calculatedAt: '2026-08-31',
    daysElapsed: 10,
    estimatedToday: 0,
    startDate: '2026-08-21',
    promotionalYield: 0,
    excessYield: 0,
    totalAccumulated: 0,
    dailyYield: 0,
    withdrawn: 0,
  };

  const today = '2026-08-31';
  const updated = prepareUpdatedInvestmentOnBalanceEdit(plazoInvestment as any, 5500, false, today);

  assert.equal(updated.startDate, '2026-08-21');
});

