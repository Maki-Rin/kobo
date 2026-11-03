import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import type { Db, SqlValue } from '../src/lib/editor/db';
import { DisplayNameError, normalizeDisplayName, updateDisplayName } from '../src/lib/editor/profile';

test('display names accept Japanese and English and reject empty, oversized and multiline values', () => {
  assert.equal(normalizeDisplayName(' 山田 太郎 '), '山田 太郎');
  assert.equal(normalizeDisplayName('Taro Yamada'), 'Taro Yamada');
  assert.equal(normalizeDisplayName('あ'.repeat(80)).length, 80);
  for (const value of ['', '　 ', 'あ'.repeat(81), '山田\n太郎', 'name\0suffix', null, 42]) {
    assert.throws(() => normalizeDisplayName(value), DisplayNameError);
  }
});

test('renaming changes only the active account name, preserves credentials and sessions, and records the actor', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    for (const file of readdirSync('db/editor/migrations').sort()) {
      sqlite.exec(readFileSync(`db/editor/migrations/${file}`, 'utf8'));
    }
    const db: Db = {
      all: async <T>(sql: string, params: SqlValue[] = []) => sqlite.prepare(sql).all(...params) as T[],
      run: async (sql, params = []) => { sqlite.prepare(sql).run(...params); },
    };
    sqlite.exec(`
      INSERT INTO users (id, display_name, role, created_at) VALUES
        ('self', 'Inviter chose this', 'editor', '2026-11-03'),
        ('other', 'Other user', 'lead', '2026-11-03');
      INSERT INTO credentials (id, user_id, public_key, counter, created_at)
        VALUES ('passkey', 'self', 'public-key', 7, '2026-11-03');
      INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
        VALUES ('session', 'self', '2026-11-03', '2027-01-01');
    `);
    assert.equal(await updateDisplayName(db, 'self', ' 山田 太郎 '), '山田 太郎');
    assert.deepEqual(await db.all('SELECT id, display_name, role FROM users ORDER BY id'), [
      { id: 'other', display_name: 'Other user', role: 'lead' },
      { id: 'self', display_name: '山田 太郎', role: 'editor' },
    ].map((row) => Object.assign(Object.create(null), row)));
    assert.equal((await db.all<{ counter: number }>('SELECT counter FROM credentials'))[0].counter, 7);
    assert.equal((await db.all('SELECT * FROM sessions')).length, 1);
    const [log] = await db.all<{ actor_id: string; target: string; action: string }>('SELECT * FROM audit_log');
    assert.equal(log.actor_id, 'self');
    assert.equal(log.target, 'self');
    assert.equal(log.action, 'user.rename');

    sqlite.exec("UPDATE users SET disabled_at = '2026-11-03' WHERE id = 'self'");
    await assert.rejects(updateDisplayName(db, 'self', 'New name'), DisplayNameError);
    await assert.rejects(updateDisplayName(db, 'missing', 'New name'), DisplayNameError);
    await assert.rejects(updateDisplayName(db, 'other', ''), DisplayNameError);
    assert.equal((await db.all('SELECT * FROM audit_log')).length, 1);
  } finally {
    sqlite.close();
  }
});
