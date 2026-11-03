import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { emptyEntry, entryPath, parseEntry, serializeEntry } from '../src/lib/content-schema';
import { loadEntry, listEntries, saveEntry } from '../src/lib/editor/entries';
import { discardDraft, readDraft, writeDraft } from '../src/lib/editor/drafts';
import { readUpload, stageUpload, pruneUploads } from '../src/lib/editor/uploads';
import { ConflictError, ContentStoreError, gitBlobSha, type ContentStore, type StoredFile } from '../src/lib/editor/store';
import type { Db, SqlValue } from '../src/lib/editor/db';

const user = { id: 'editor', displayName: '山田 太郎', role: 'editor' as const };
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync('db/editor/migrations').sort()) sqlite.exec(readFileSync(`db/editor/migrations/${file}`, 'utf8'));
  sqlite.prepare('INSERT INTO users (id, display_name, role, created_at) VALUES (?, ?, ?, ?)').run(user.id, user.displayName, user.role, '2026-11-03');
  const db: Db = {
    all: async <T>(sql: string, params: SqlValue[] = []) => sqlite.prepare(sql).all(...params) as T[],
    run: async (sql, params = []) => { sqlite.prepare(sql).run(...params); },
  };
  const files = new Map<string, Buffer>([['public/images/existing.png', png]]);
  let commits = 0;
  let rejectCommit = false;
  const read = async (file: string): Promise<StoredFile | null> => {
    const content = files.get(file);
    return content ? { path: file, content, sha: gitBlobSha(content) } : null;
  };
  const store: ContentStore = {
    read,
    exists: async (file) => files.has(file),
    list: async (dir) => [...files.keys()].filter((file) => file.startsWith(dir + '/')),
    readDirectory: async (dir) => (await Promise.all((await store.list(dir)).map(read))).filter((file): file is StoredFile => !!file),
    stage: async () => { throw new Error('Drafts must not stage GitHub blobs'); },
    staged: async () => null,
    commit: async (request) => {
      if (rejectCommit) throw new ContentStoreError('GitHub unavailable');
      for (const [file, sha] of Object.entries(request.expected)) assert.equal((await read(file))?.sha ?? null, sha);
      for (const change of request.changes) {
        assert.ok('content' in change);
        files.set(change.path, change.content);
      }
      commits++;
      return String(commits).padStart(40, '0');
    },
    history: async () => [], detail: async () => { throw new Error('unused'); },
  };
  const entry = { ...emptyEntry('articles', 'test-entry'), title: 'Article', date: '2026-11-03',
    body: 'Published body', coverImage: '/images/existing.png', authors: ['person'], published: true };
  return { sqlite, db, store, files, entry, services: { db, store }, commits: () => commits,
    reject: () => { rejectCommit = true; }, close: () => sqlite.close() };
}

test('new drafts including images survive reopening without any Git commits; publish writes one snapshot', async () => {
  const s = setup();
  try {
    const image = Buffer.alloc(700_000);
    png.copy(image);
    const sha = await stageUpload(image, s.db);
    assert.deepEqual(await readUpload(sha, s.db), image);
    assert.equal((await s.db.all('SELECT * FROM editor_upload_parts')).length, 2);
    const draft = { ...s.entry, published: false, body: '', coverImage: '/images/articles/test-entry/new.png' };
    const result = await saveEntry(user, { collection: 'articles', draft, isNew: true, baseSha: null,
      images: [{ name: 'new.png', sha }], operation: 'draft' }, s.services);
    assert.equal(result.commitId, null);
    assert.equal(s.commits(), 0);
    assert.equal(s.files.has(entryPath('articles', draft.id)), false);
    const loaded = await loadEntry('articles', draft.id, s.services);
    assert.ok(loaded);
    assert.match(loaded.sha, /^draft:/);
    assert.equal(loaded.images[0].sha, sha);
    const [row] = await listEntries('articles', s.services);
    assert.equal(row.published, false);
    assert.equal(row.hasDraft, true);
    assert.equal(row.coverImage, `/admin/staged/${sha}`);
    await saveEntry(user, { collection: 'articles', draft: { ...loaded.draft, body: 'Ready to publish' },
      isNew: false, baseSha: loaded.sha, images: [], operation: 'publish' }, s.services);
    assert.equal(s.commits(), 1);
    assert.equal((await readDraft('articles', draft.id, s.db)), null);
    assert.equal(await readUpload(sha, s.db), null);
    assert.deepEqual(s.files.get('public/images/articles/test-entry/new.png'), image);
    assert.equal(parseEntry('articles', draft.id, s.files.get(entryPath('articles', draft.id))!.toString()).published, true);
  } finally { s.close(); }
});

test('discarding requires the latest revision and the owner or manager, and preserves the public version', async () => {
  const s = setup();
  try {
    const file = entryPath('articles', s.entry.id);
    const publicContent = Buffer.from(serializeEntry(s.entry));
    s.files.set(file, publicContent);
    await saveEntry(user, { collection: 'articles', draft: { ...s.entry, body: 'Disposable working copy' },
      isNew: false, baseSha: gitBlobSha(publicContent), images: [], operation: 'draft' }, s.services);
    const loaded = (await loadEntry('articles', s.entry.id, s.services))!;
    await assert.rejects(discardDraft({ id: 'other', role: 'editor' }, 'articles', s.entry.id, loaded.sha, s.db), /管理者/);
    await assert.rejects(discardDraft(user, 'articles', s.entry.id, 'draft:stale', s.db), ConflictError);
    await discardDraft(user, 'articles', s.entry.id, loaded.sha, s.db);
    assert.equal(await readDraft('articles', s.entry.id, s.db), null);
    assert.deepEqual(s.files.get(file), publicContent);
    assert.equal(s.commits(), 0);
  } finally { s.close(); }
});

test('publication cleanup does not delete a newer draft saved while GitHub is committing', async () => {
  const s = setup();
  try {
    await saveEntry(user, { collection: 'articles', draft: s.entry, isNew: true, baseSha: null,
      images: [], operation: 'draft' }, s.services);
    const loaded = (await loadEntry('articles', s.entry.id, s.services))!;
    const commit = s.store.commit;
    s.store.commit = async (request) => {
      const id = await commit(request);
      const current = (await readDraft('articles', s.entry.id, s.db))!;
      await writeDraft({ entry: { ...current.entry, body: 'A newer unsaved publication' }, images: [],
        baseSha: current.baseSha, expected: current, userId: user.id }, s.db);
      return id;
    };
    await saveEntry(user, { collection: 'articles', draft: { ...loaded.draft }, isNew: false,
      baseSha: loaded.sha, images: [], operation: 'publish' }, s.services);
    assert.equal((await readDraft('articles', s.entry.id, s.db))?.entry.body, 'A newer unsaved publication');
    assert.equal(parseEntry('articles', s.entry.id, s.files.get(entryPath('articles', s.entry.id))!.toString()).body.trim(), 'Published body');
  } finally { s.close(); }
});

test('retrying a GitHub publish whose database cleanup failed does not create another commit', async (t) => {
  const s = setup();
  try {
    await saveEntry(user, { collection: 'articles', draft: s.entry, isNew: true, baseSha: null,
      images: [], operation: 'draft' }, s.services);
    const loaded = (await loadEntry('articles', s.entry.id, s.services))!;
    let failCleanup = true;
    const db: Db = { all: s.db.all, run: async (sql, params) => {
      if (failCleanup && sql.startsWith('DELETE FROM editor_drafts')) throw new Error('D1 temporarily unavailable');
      return s.db.run(sql, params);
    } };
    t.mock.method(console, 'error', () => {});
    const input = { collection: 'articles' as const, draft: { ...loaded.draft }, isNew: false,
      baseSha: loaded.sha, images: [], operation: 'publish' as const };
    await assert.rejects(saveEntry(user, input, { store: s.store, db }), /反映は完了/);
    assert.equal(s.commits(), 1);
    assert.ok(await readDraft('articles', s.entry.id, s.db));
    failCleanup = false;
    const retry = await saveEntry(user, input, { store: s.store, db });
    assert.equal(retry.changed, false);
    assert.equal(s.commits(), 1);
    assert.equal(await readDraft('articles', s.entry.id, s.db), null);
  } finally { s.close(); }
});

test('saving an edit preserves the public version; unchanged saves do not commit; unpublish preserves the working draft', async () => {
  const s = setup();
  try {
    const file = entryPath('articles', s.entry.id);
    s.files.set(file, Buffer.from(serializeEntry(s.entry)));
    const initial = await loadEntry('articles', s.entry.id, s.services);
    assert.ok(initial);
    const unchanged = await saveEntry(user, { collection: 'articles', draft: { ...initial.draft }, isNew: false,
      baseSha: initial.sha, images: [], operation: 'draft' }, s.services);
    assert.equal(unchanged.changed, false);
    assert.equal(await readDraft('articles', s.entry.id, s.db), null);
    await saveEntry(user, { collection: 'articles', draft: { ...s.entry, body: 'Working copy' }, isNew: false,
      baseSha: initial.sha, images: [], operation: 'draft' }, s.services);
    assert.equal(parseEntry('articles', s.entry.id, s.files.get(file)!.toString()).body.trim(), 'Published body');
    let loaded = (await loadEntry('articles', s.entry.id, s.services))!;
    assert.equal(loaded.draft.published, true);
    const repeated = await saveEntry(user, { collection: 'articles', draft: { ...loaded.draft }, isNew: false,
      baseSha: loaded.sha, images: [], operation: 'draft' }, s.services);
    assert.equal(repeated.changed, false);
    assert.equal(s.commits(), 0);
    await saveEntry(user, { collection: 'articles', draft: { ...loaded.draft }, isNew: false,
      baseSha: loaded.sha, images: [], operation: 'unpublish' }, s.services);
    assert.equal(parseEntry('articles', s.entry.id, s.files.get(file)!.toString()).body.trim(), 'Published body');
    assert.equal(parseEntry('articles', s.entry.id, s.files.get(file)!.toString()).published, false);
    loaded = (await loadEntry('articles', s.entry.id, s.services))!;
    assert.equal(loaded.draft.body, 'Working copy');
    await saveEntry(user, { collection: 'articles', draft: { ...loaded.draft }, isNew: false,
      baseSha: loaded.sha, images: [], operation: 'publish' }, s.services);
    assert.equal(s.commits(), 2);
    loaded = (await loadEntry('articles', s.entry.id, s.services))!;
    assert.equal(loaded.draft.body.trim(), 'Working copy');
    const noChange = await saveEntry(user, { collection: 'articles', draft: { ...loaded.draft }, isNew: false,
      baseSha: loaded.sha, images: [], operation: 'publish' }, s.services);
    assert.equal(noChange.changed, false);
    assert.equal(s.commits(), 2);
  } finally { s.close(); }
});

test('works and events also save to the database before publication', async () => {
  for (const collection of ['works', 'events'] as const) {
    const s = setup();
    try {
      const draft = { ...s.entry, collection, body: '', record: collection === 'events' ? 'Event report' : '' };
      await saveEntry(user, { collection, draft, isNew: true, baseSha: null, images: [], operation: 'draft' }, s.services);
      assert.equal(s.commits(), 0);
      const loaded = (await loadEntry(collection, draft.id, s.services))!;
      await saveEntry(user, { collection, draft: { ...loaded.draft }, isNew: false, baseSha: loaded.sha,
        images: [], operation: 'publish' }, s.services);
      assert.equal(s.commits(), 1);
      assert.equal(await readDraft(collection, draft.id, s.db), null);
    } finally { s.close(); }
  }
});

test('temporary image quota rejects additional data and duplicate uploads reuse the existing parts', async () => {
  const s = setup();
  try {
    const sha = await stageUpload(png, s.db);
    assert.equal(await stageUpload(png, s.db), sha);
    assert.equal((await s.db.all('SELECT * FROM editor_upload_parts')).length, 1);
    await s.db.run('INSERT INTO editor_uploads (sha, size, ready, created_at) VALUES (?, ?, 1, ?)',
      ['quota-reservation', 200 * 1024 * 1024, new Date().toISOString()]);
    await assert.rejects(stageUpload(Buffer.concat([png, Buffer.from('different')]), s.db), /保存容量/);
    await assert.rejects(stageUpload(Buffer.alloc(3 * 1024 * 1024 + 1), s.db), /3MB/);
  } finally { s.close(); }
});

test('concurrent draft edits and publication against an outdated public version are rejected without losing drafts', async () => {
  const s = setup();
  try {
    const input = { collection: 'articles' as const, draft: s.entry, isNew: true, baseSha: null, images: [], operation: 'draft' as const };
    const attempts = await Promise.allSettled([saveEntry(user, input, s.services), saveEntry(user, input, s.services)]);
    assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
    let loaded = (await loadEntry('articles', s.entry.id, s.services))!;
    const oldToken = loaded.sha;
    await saveEntry(user, { ...input, isNew: false, baseSha: oldToken, draft: { ...loaded.draft, body: 'Latest work' } }, s.services);
    await assert.rejects(saveEntry(user, { ...input, isNew: false, baseSha: oldToken }, s.services), ConflictError);
    loaded = (await loadEntry('articles', s.entry.id, s.services))!;
    assert.equal(loaded.draft.body, 'Latest work');
    s.files.set(entryPath('articles', s.entry.id), Buffer.from(serializeEntry({ ...s.entry, body: 'Someone published this' })));
    await assert.rejects(saveEntry(user, { ...input, isNew: false, baseSha: loaded.sha,
      draft: { ...loaded.draft }, operation: 'publish' }, s.services), ConflictError);
    assert.equal((await readDraft('articles', s.entry.id, s.db))?.entry.body, 'Latest work');
    assert.equal(s.commits(), 0);
  } finally { s.close(); }
});

test('a failed publish keeps its draft and referenced uploads are not pruned', async () => {
  const s = setup();
  try {
    const sha = await stageUpload(png, s.db);
    const draft = { ...s.entry, body: `![image](/images/articles/test-entry/image.png)` };
    await saveEntry(user, { collection: 'articles', draft, isNew: true, baseSha: null,
      images: [{ name: 'image.png', sha }], operation: 'draft' }, s.services);
    const loaded = (await loadEntry('articles', s.entry.id, s.services))!;
    s.reject();
    await assert.rejects(saveEntry(user, { collection: 'articles', draft: { ...loaded.draft }, isNew: false,
      baseSha: loaded.sha, images: [], operation: 'publish' }, s.services), ContentStoreError);
    assert.ok(await readDraft('articles', s.entry.id, s.db));
    await s.db.run("UPDATE editor_uploads SET created_at = '2020-01-01'");
    await pruneUploads(s.db);
    assert.deepEqual(await readUpload(sha, s.db), png);
    await s.db.run('DELETE FROM editor_drafts');
    await pruneUploads(s.db);
    assert.equal(await readUpload(sha, s.db), null);
  } finally { s.close(); }
});
