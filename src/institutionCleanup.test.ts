import test from 'node:test';
import assert from 'node:assert/strict';
import { pruneInstitutionRecords } from './institutionCleanup.ts';

test('pruneInstitutionRecords removes all investment and config rows for a deleted institution', () => {
  const investments = [
    { institutionId: 'mifel', productId: 'cuenta' },
    { institutionId: 'nu', productId: 'cuenta' },
  ];
  const configs = [
    { institutionId: 'mifel', productId: 'cuenta' },
    { institutionId: 'kubo', productId: 'liquidez' },
  ];

  assert.deepEqual(pruneInstitutionRecords(investments, 'mifel'), [{ institutionId: 'nu', productId: 'cuenta' }]);
  assert.deepEqual(pruneInstitutionRecords(configs, 'mifel'), [{ institutionId: 'kubo', productId: 'liquidez' }]);
});
