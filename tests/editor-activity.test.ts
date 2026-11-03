import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { latestEventsByEntry } from '../src/lib/editor/activity';
import type { Db, SqlValue } from '../src/lib/editor/db';

test('one query loads the latest event per collection without mixing entries that share an ID', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    for (const file of readdirSync('db/editor/migrations').sort()) {
      sqlite.exec(readFileSync(`db/editor/migrations/${file}`, 'utf8'));
    }
    sqlite.exec(`
      INSERT INTO users (id, display_name, role, created_at) VALUES ('editor', '山田 太郎', 'editor', '2026-11-03');
      INSERT INTO article_events (collection, article_id, title, action, user_id, commit_id, at) VALUES
        ('articles', 'same-id', 'Old article', 'draft', 'editor', 'a1', '2026-11-01'),
        ('works', 'same-id', 'Work', 'publish', 'editor', 'w1', '2026-11-02'),
        ('events', 'same-id', 'Event', 'publish', 'editor', 'e1', '2026-11-03'),
        ('articles', 'same-id', 'Latest article', 'publish', 'editor', 'a2', '2026-11-03');
    `);
    let queries = 0;
    const db: Db = {
      all: async <T>(sql: string, params: SqlValue[] = []) => {
        queries++;
        return sqlite.prepare(sql).all(...params) as T[];
      },
      run: async (sql, params = []) => { sqlite.prepare(sql).run(...params); },
    };
    const events = await latestEventsByEntry(db);
    assert.equal(queries, 1);
    assert.equal(events.size, 3);
    assert.equal(events.get('articles/same-id')?.commitId, 'a2');
    assert.equal(events.get('works/same-id')?.commitId, 'w1');
    assert.equal(events.get('events/same-id')?.commitId, 'e1');
    assert.equal(events.get('articles/same-id')?.userName, '山田 太郎');
  } finally {
    sqlite.close();
  }
});
