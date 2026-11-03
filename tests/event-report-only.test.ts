import assert from 'node:assert/strict';
import test from 'node:test';
import { hasAnnouncement, isPastEvent, parseEntry, serializeEntry } from '../src/lib/content-schema';

test('report-only events round-trip and count as held even on the event day', () => {
  const source = "---\ntitle: GLOBAL WEEK\ndate: '2026-11-03'\nreportOnly: true\nrecord: 当日の様子\n---\n";
  const entry = parseEntry('events', 'global-week', source);
  assert.equal(entry.reportOnly, true);
  assert.equal(isPastEvent(entry, '2026-11-03'), true);
  assert.equal(hasAnnouncement(entry), false);
  assert.equal(parseEntry('events', 'global-week', serializeEntry(entry)).reportOnly, true);
});

test('announced events stay upcoming on the event day until a record is written', () => {
  const entry = parseEntry('events', 'workshop', "---\ntitle: WS\ndate: '2026-11-03'\n---\n\n告知です\n");
  assert.equal(isPastEvent(entry, '2026-11-03'), false);
  assert.equal(isPastEvent({ ...entry, record: '終わりました' }, '2026-11-03'), true);
  assert.equal(isPastEvent(entry, '2026-11-04'), true);
  assert.equal(hasAnnouncement(entry), true);
  assert.equal(serializeEntry(entry).includes('reportOnly'), false);
});
