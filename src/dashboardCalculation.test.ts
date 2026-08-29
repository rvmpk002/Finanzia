import test from 'node:test';
import assert from 'node:assert/strict';
import { simpleInterest } from './calculationEngine.ts';

test('simple interest uses the configured days base instead of compounding', () => {
  const daily = simpleInterest(100000, 11.5, 1, 365);
  const total = simpleInterest(100000, 11.5, 1, 365);

  assert.ok(Math.abs(daily - 31.50684931506849) < 0.01);
  assert.ok(Math.abs(total - 31.50684931506849) < 0.01);
});
