import crypto from 'node:crypto';
import type { Collection, Entry } from '../content-schema';
import { getDb, type Db } from './db';
import { ConflictError, ContentStoreError } from './store';
import type { User } from './auth';
import type { StagedImage } from './entries';

export interface SavedDraft {
  entry: Entry;
  images: StagedImage[];
  revision: string;
  baseSha: string | null;
  updatedAt: string;
  updatedBy: string;
  updatedById: string;
}

interface Row {
  entry_json: string;
  images_json: string;
  revision: string;
  base_sha: string | null;
  updated_at: string;
  user_name: string;
  updated_by: string;
}
const fromRow = (row: Row): SavedDraft => ({
  entry: JSON.parse(row.entry_json), images: JSON.parse(row.images_json),
  revision: row.revision, baseSha: row.base_sha, updatedAt: row.updated_at, updatedBy: row.user_name,
  updatedById: row.updated_by,
});
const SELECT = 'SELECT d.*, u.display_name AS user_name FROM editor_drafts d JOIN users u ON u.id = d.updated_by';
export const draftToken = (draft: SavedDraft) => `draft:${draft.revision}`;

export async function readDraft(collection: Collection, id: string, database?: Db): Promise<SavedDraft | null> {
  const db = database ?? await getDb();
  const [row] = await db.all<Row>(`${SELECT} WHERE collection = ? AND entry_id = ?`, [collection, id]);
  return row ? fromRow(row) : null;
}

export async function listDrafts(collection: Collection, database?: Db): Promise<SavedDraft[]> {
  const db = database ?? await getDb();
  return (await db.all<Row>(`${SELECT} WHERE collection = ?`, [collection])).map(fromRow);
}

export async function writeDraft(input: {
  entry: Entry; images: StagedImage[]; baseSha: string | null;
  expected: SavedDraft | null; userId: string;
}, database?: Db): Promise<{ revision: string; changed: boolean }> {
  const db = database ?? await getDb();
  const { entry, images, baseSha, expected, userId } = input;
  const content = JSON.stringify({ ...entry, published: false });
  const imageJson = JSON.stringify(images);
  if (expected && content === JSON.stringify(expected.entry) && imageJson === JSON.stringify(expected.images)) {
    const current = await readDraft(entry.collection, entry.id, db);
    if (current?.revision !== expected.revision) throw new ConflictError('下書きがほかの人によって更新されています。開き直して確認してください');
    return { revision: expected.revision, changed: false };
  }
  const revision = crypto.randomUUID();
  const now = new Date().toISOString();
  const rows = expected
    ? await db.all(`UPDATE editor_drafts SET revision = ?, entry_json = ?, images_json = ?, updated_at = ?, updated_by = ?
        WHERE collection = ? AND entry_id = ? AND revision = ? RETURNING revision`,
      [revision, content, imageJson, now, userId, entry.collection, entry.id, expected.revision])
    : await db.all(`INSERT INTO editor_drafts (collection, entry_id, revision, base_sha, entry_json, images_json, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (collection, entry_id) DO NOTHING RETURNING revision`,
      [entry.collection, entry.id, revision, baseSha, content, imageJson, now, userId]);
  if (!rows.length) throw new ConflictError('下書きがほかの人によって更新されています。開き直して確認してください');
  return { revision, changed: true };
}

export async function removeDraft(collection: Collection, id: string, revision: string, database?: Db) {
  const db = database ?? await getDb();
  await db.run('DELETE FROM editor_drafts WHERE collection = ? AND entry_id = ? AND revision = ?', [collection, id, revision]);
}

export async function discardDraft(user: Pick<User, 'id' | 'role'>, collection: Collection, id: string, token: string, database?: Db) {
  const db = database ?? await getDb();
  const draft = await readDraft(collection, id, db);
  if (!draft || draftToken(draft) !== token) throw new ConflictError('下書きが変更されています。最新の内容を確認してください');
  if (user.role === 'editor' && draft.updatedById !== user.id) {
    throw new ContentStoreError('ほかの人の下書きを破棄できるのは管理者だけです');
  }
  const removed = await db.all('DELETE FROM editor_drafts WHERE collection = ? AND entry_id = ? AND revision = ? RETURNING revision',
    [collection, id, draft.revision]);
  if (!removed.length) throw new ConflictError('下書きが変更されています。最新の内容を確認してください');
  await db.run('INSERT INTO audit_log (at, actor_id, action, target, detail) VALUES (?, ?, ?, ?, ?)',
    [new Date().toISOString(), user.id, 'entry.discard-draft', `${collection}/${id}`, draft.revision]);
}
