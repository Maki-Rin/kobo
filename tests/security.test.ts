import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { allowedExternalUrl, isPublicIPv4 } from '../src/lib/external-fetch';
import { readLimitedBody } from '../src/lib/http-body';
import { canManageTarget, validToken, type Role } from '../src/lib/editor/policy';
import { consumeInvite, consumeChallenge } from '../src/lib/editor/tokens';
import { consumeLimit } from '../src/lib/editor/rate-limit';
import type { Db, SqlValue } from '../src/lib/editor/db';
import { renderPreviewHtml } from '../src/lib/editor/preview';
import { publicPrinterData } from '../src/lib/printer-privacy';
import { parsePublicPrinters } from '../src/lib/printer-types';
import { detectImageType } from '../src/lib/image-type';
import { saveEntry } from '../src/lib/editor/entries';

function database(): { db: Db; close: () => void } {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync('db/editor/migrations').sort()) sqlite.exec(readFileSync(`db/editor/migrations/${name}`, 'utf8'));
  return {
    db: {
      all: async <T>(sql: string, params: SqlValue[] = []) => sqlite.prepare(sql).all(...params) as T[],
      run: async (sql, params = []) => { sqlite.prepare(sql).run(...params); },
    },
    close: () => sqlite.close(),
  };
}

test('external requests allow only exact HTTPS destinations and reject redirect escapes', () => {
  assert.equal(allowedExternalUrl('https://github.com/Maki-Rin/kobo#readme', 'metadata').href, 'https://github.com/Maki-Rin/kobo');
  for (const url of [
    'http://github.com/x', 'https://github.com.evil.example/x', 'https://github.com@evil.example/x',
    'https://user:password@github.com/x', 'https://github.com:8443/x',
    'https://localhost/x', 'https://127.0.0.1/x', 'https://2130706433/x', 'https://[::1]/x',
    'file:///etc/passwd', 'https://example.com/x',
  ]) assert.throws(() => allowedExternalUrl(url, 'metadata'), url);
  assert.throws(() => allowedExternalUrl(new URL('//169.254.169.254/latest', 'https://github.com').href, 'metadata'));
  assert.throws(() => allowedExternalUrl('https://github.com/x.svg', 'image'));
  assert.equal(allowedExternalUrl('https://opengraph.githubassets.com/hash/a/b', 'image').hostname, 'opengraph.githubassets.com');
});

test('pinned DNS rejects private, loopback, link-local, reserved and mapped addresses', () => {
  for (const ip of ['0.0.0.0', '10.1.2.3', '127.0.0.1', '169.254.169.254', '172.16.1.1', '192.168.1.2', '100.64.0.1', '198.18.1.1', '203.0.113.1', '224.0.0.1', '::1', '::ffff:127.0.0.1']) {
    assert.equal(isPublicIPv4(ip), false, ip);
  }
  assert.equal(isPublicIPv4('8.8.8.8'), true);
});

test('an unadvertised oversized streaming response is cancelled before buffering it all', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array(8)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(readLimitedBody(new Response(body), 10));
  assert.equal(cancelled, true);
  assert.deepEqual([...await readLimitedBody(new Response('hello'), 10)], [...new TextEncoder().encode('hello')]);
});

test('lead cannot recover, disable or replace a developer account', () => {
  const roles: Role[] = ['editor', 'lead', 'developer'];
  for (const actorRole of roles) for (const targetRole of roles) {
    const allowed = actorRole === 'developer' || (actorRole === 'lead' && targetRole !== 'developer');
    assert.equal(canManageTarget({ id: 'actor', role: actorRole }, { id: 'target', role: targetRole }), allowed);
  }
  assert.equal(canManageTarget({ id: 'self', role: 'editor' }, { id: 'self', role: 'editor' }), true);
  assert.equal(validToken('x'.repeat(43)), true);
  assert.equal(validToken('x'.repeat(1_000_000)), false);
});

test('invite and challenge consumption has exactly one winner under concurrent attempts', async () => {
  const { db, close } = database();
  try {
    const future = new Date(Date.now() + 60_000).toISOString();
    await db.run('INSERT INTO invites (token_hash, kind, created_at, expires_at) VALUES (?, ?, ?, ?)', ['token', 'login', new Date().toISOString(), future]);
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeInvite(db, 'token')));
    assert.equal(results.filter(Boolean).length, 1);
    await db.run('INSERT INTO challenges (id, challenge, purpose, expires_at) VALUES (?, ?, ?, ?)', ['challenge', 'random', 'login', future]);
    assert.equal(await consumeChallenge(db, 'challenge', 'register'), undefined);
    const challenges = await Promise.all(Array.from({ length: 20 }, () => consumeChallenge(db, 'challenge', 'login')));
    assert.equal(challenges.filter(Boolean).length, 1);
    await db.run('INSERT INTO invites (token_hash, kind, created_at, expires_at) VALUES (?, ?, ?, ?)', ['expired', 'login', '2000-01-01', '2000-01-02']);
    assert.equal(await consumeInvite(db, 'expired'), false);
  } finally { close(); }
});

test('shared SQL rate limit admits at most the configured number and resets next window', async () => {
  const { db, close } = database();
  try {
    const now = 120_000;
    const results = await Promise.all(Array.from({ length: 100 }, () => consumeLimit(db, 'ip', 15, 60, now)));
    assert.equal(results.filter(Boolean).length, 15);
    assert.equal(await consumeLimit(db, 'ip', 15, 60, now + 60_000), true);
    assert.equal(await consumeLimit(db, 'other-ip', 15, 60, now), true);
  } finally { close(); }
});

test('Markdown preview strips script, event handlers and javascript links while preserving useful formatting', async () => {
  const html = await renderPreviewHtml([
    '<script>alert(1)</script>', '<img src=x onerror=alert(1)>',
    '[click](javascript:alert%281%29)', '![image](javascript:alert%281%29)',
    '## Heading', '**safe**', 'https://github.com/Maki-Rin/kobo',
    '```js\nconsole.log("hello")\n```',
  ].join('\n\n'));
  assert.doesNotMatch(html, /<script|onerror=|href="javascript:|src="javascript:/i);
  assert.match(html, /<strong>safe<\/strong>/);
  assert.match(html, /github.com\/Maki-Rin\/kobo/);
  assert.match(html, /<pre/);
});

test('printer API redacts current and previous file names without changing status or progress', () => {
  const data = parsePublicPrinters({ schemaVersion: '1.2', generatedAt: new Date().toISOString(), printers: [{
    id: 'ad5mp-01', displayName: 'Printer', model: '5M', availability: 'online', state: 'printing',
    progressPercent: 64.5, lastSeenAt: new Date().toISOString(),
    currentWork: { fileName: 'private-project.gcode', elapsedMinutes: 5, estimatedTotalMinutes: 10 },
    lastWork: { fileName: 'private-person.gcode', outcome: 'success', durationMinutes: 4, endedAt: null },
  }] });
  assert.ok(data);
  const publicData = publicPrinterData(data);
  assert.doesNotMatch(JSON.stringify(publicData), /private-/);
  assert.equal(publicData.printers[0].progressPercent, 64.5);
  assert.equal(data.printers[0].currentWork?.fileName, 'private-project.gcode');
});

test('uploads reject SVG/HTML and entry IDs cannot traverse the content directory', async () => {
  assert.equal(detectImageType(Buffer.from('<svg onload=alert(1)>')), null);
  assert.equal(detectImageType(Buffer.from('RIFFgarbage')), null);
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'jpg');
  await assert.rejects(saveEntry({ id: 'x', displayName: 'x', role: 'editor' }, {
    collection: 'articles', draft: { id: '../../../.env.local' }, isNew: false, baseSha: 'abc', images: [],
  }), /URLの名前/);
});
