import test from 'node:test';
import assert from 'node:assert/strict';
import { kuboInterest, resolveRateSplit, simpleInterest } from './calculationEngine.ts';

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

test('Kubo short-term maturity uses simple annual interest instead of compounding', () => {
  const interest = kuboInterest(27925.21, 10, 4);

  assert.ok(Math.abs(interest - 30.60) < 0.2, `Kubo interest should be around $30.60 for a 4-day term, got $${interest.toFixed(2)}`);
});
