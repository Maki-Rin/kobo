import assert from 'node:assert/strict';
import test from 'node:test';
import { describePrinter } from '../src/lib/printer-display';
import { parsePublicPrinters } from '../src/lib/printer-types';

function printer(fields: Record<string, unknown>) {
  const data = parsePublicPrinters({ schemaVersion: '1.2', generatedAt: '2026-11-04T08:00:00.000Z', printers: [{
    id: 'ad5mp-03', displayName: 'KOBO Printer 3', model: 'Adventurer 5M Pro', availability: 'online',
    state: 'error', connection: 'ok', progressPercent: null, currentWork: null, lastWork: null,
    lastSeenAt: '2026-11-04T08:00:00.000Z', ...fields,
  }] });
  assert.ok(data);
  return data.printers[0];
}

test('error state shows the reported error code', () => {
  assert.match(describePrinter(printer({ errorCode: 'E0088' })).detail ?? '', /エラーコード E0088（純正の PEI シートが検出されません）/);
  assert.match(describePrinter(printer({ errorCode: 'E0113' })).detail ?? '', /公式の一覧には載っていません/);
  assert.match(describePrinter(printer({ errorCode: 'E9999' })).detail ?? '', /エラーコード E9999 を報告/);
  assert.match(describePrinter(printer({})).detail ?? '', /本体の画面/);
});

test('error code is ignored when it is malformed or the printer is not in error', () => {
  assert.equal(printer({ errorCode: '<b>x</b>' }).errorCode, null);
  assert.equal(describePrinter(printer({ state: 'idle', errorCode: 'E0088' })).detail, null);
});
