import { getDb, type Db } from './db';
import { getStore, gitBlobSha, ContentStoreError } from './store';

const CHUNK_BYTES = 512 * 1024;
const MAX_TEMP_BYTES = 200 * 1024 * 1024;
const SHA = /^[0-9a-f]{40}$/;

export async function pruneUploads(database?: Db) {
  const db = database ?? await getDb();
  const cutoff = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const unused = `SELECT sha FROM editor_uploads u WHERE created_at < ? AND NOT EXISTS (
    SELECT 1 FROM editor_drafts d, json_each(d.images_json) i WHERE json_extract(i.value, '$.sha') = u.sha)`;
  await db.run(`DELETE FROM editor_uploads WHERE sha IN (${unused})`, [cutoff]);
  await db.run('DELETE FROM editor_upload_parts WHERE NOT EXISTS (SELECT 1 FROM editor_uploads u WHERE u.sha = editor_upload_parts.sha)');
}

export async function stageUpload(data: Buffer, database?: Db): Promise<string> {
  const db = database ?? await getDb();
  if (data.length > 3 * 1024 * 1024) throw new ContentStoreError('画像は3MBまでです');
  const sha = gitBlobSha(data);
  const [existing] = await db.all<{ ready: number }>('SELECT ready FROM editor_uploads WHERE sha = ?', [sha]);
  if (existing?.ready) {
    await db.run('UPDATE editor_uploads SET created_at = ? WHERE sha = ?', [new Date().toISOString(), sha]);
    return sha;
  }
  await pruneUploads(db);
  const inserted = await db.all(`INSERT INTO editor_uploads (sha, size, ready, created_at)
    SELECT ?, ?, 0, ? WHERE COALESCE((SELECT SUM(size) FROM editor_uploads WHERE sha <> ?), 0) + ? <= ?
    ON CONFLICT (sha) DO UPDATE SET created_at = excluded.created_at RETURNING sha`,
  [sha, data.length, new Date().toISOString(), sha, data.length, MAX_TEMP_BYTES]);
  if (!inserted.length) throw new ContentStoreError('未公開画像の保存容量が上限に達しました。管理者に連絡してください');
  const parts = [];
  for (let offset = 0; offset < data.length; offset += CHUNK_BYTES) {
    parts.push(db.run('INSERT OR IGNORE INTO editor_upload_parts (sha, part, data) VALUES (?, ?, ?)',
      [sha, offset / CHUNK_BYTES, data.subarray(offset, offset + CHUNK_BYTES).toString('base64')]));
  }
  await Promise.all(parts);
  await db.run('UPDATE editor_uploads SET ready = 1 WHERE sha = ?', [sha]);
  return sha;
}

export async function releasePublishedUploads(shas: string[], database?: Db) {
  const ids = [...new Set(shas)].filter((sha) => SHA.test(sha));
  if (!ids.length) return;
  const db = database ?? await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.run(`DELETE FROM editor_uploads WHERE sha IN (
    SELECT u.sha FROM editor_uploads u WHERE u.sha IN (${placeholders}) AND NOT EXISTS (
      SELECT 1 FROM editor_drafts d, json_each(d.images_json) i WHERE json_extract(i.value, '$.sha') = u.sha))`, ids);
  await db.run('DELETE FROM editor_upload_parts WHERE NOT EXISTS (SELECT 1 FROM editor_uploads u WHERE u.sha = editor_upload_parts.sha)');
}

export async function readUpload(sha: string, database?: Db): Promise<Buffer | null> {
  if (!SHA.test(sha)) return null;
  const db = database ?? await getDb();
  const rows = await db.all<{ data: string }>(`SELECT p.data FROM editor_upload_parts p
    JOIN editor_uploads u ON u.sha = p.sha WHERE p.sha = ? AND u.ready = 1 ORDER BY p.part`, [sha]);
  if (!rows.length) return null;
  const data = Buffer.concat(rows.map((row) => Buffer.from(row.data, 'base64')));
  if (gitBlobSha(data) !== sha) throw new ContentStoreError('保存した画像を確認できませんでした。もう一度選んでください');
  return data;
}

export async function stagedImage(sha: string): Promise<Buffer | null> {
  return (await readUpload(sha)) ?? getStore().staged(sha);
}
