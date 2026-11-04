import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAdminPrinters } from '../src/lib/printer-admin-types';

const printer = {
  id: 'ad5mp-03', displayName: 'KOBO Printer 3', model: 'Adventurer 5M Pro', availability: 'online',
  state: 'idle', connection: 'ok', progressPercent: null, currentWork: null, lastWork: null, errorCode: null,
  lastSeenAt: '2026-11-04T09:00:00.000Z', reportedState: 'error', reportedErrorCode: 'E0113', acknowledgedErrorCode: 'E0113',
  camera: { status: 'off', checkedAt: '2026-11-04T09:00:00.000Z', capturedAt: null },
};

test('admin printers keep the reported error and drop malformed commands', () => {
  const data = parseAdminPrinters({
    generatedAt: '2026-11-04T09:00:00.000Z',
    printers: [printer],
    commands: [
      { id: 'a', printerId: 'ad5mp-03', action: 'pause', requestedBy: 'staff', requestedAt: '2026-11-04T09:00:00.000Z', status: 'succeeded', finishedAt: null, detail: null },
      { id: 'b', printerId: 'ad5mp-03', action: 'start_print', requestedBy: 'staff', requestedAt: '2026-11-04T09:00:00.000Z', status: 'pending' },
    ],
  });
  assert.ok(data);
  assert.equal(data.printers[0].state, 'idle');
  assert.equal(data.printers[0].reportedState, 'error');
  assert.equal(data.printers[0].acknowledgedErrorCode, 'E0113');
  assert.deepEqual(data.printers[0].camera, { status: 'off', checkedAt: '2026-11-04T09:00:00.000Z', capturedAt: null });
  assert.deepEqual(data.commands.map((command) => command.id), ['a']);
  assert.equal(parseAdminPrinters({ printers: [printer] }), null);
});
