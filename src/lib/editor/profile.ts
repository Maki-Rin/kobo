import type { Db } from './db';

export class DisplayNameError extends Error {}

export function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') throw new DisplayNameError('表示名を入力してください');
  const name = value.trim();
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new DisplayNameError('表示名は改行を含まない1〜80文字で入力してください');
  }
  return name;
}

export async function updateDisplayName(db: Db, userId: string, value: unknown): Promise<string> {
  const name = normalizeDisplayName(value);
  const rows = await db.all<{ id: string }>(
    'UPDATE users SET display_name = ? WHERE id = ? AND disabled_at IS NULL RETURNING id',
    [name, userId]
  );
  if (!rows.length) throw new DisplayNameError('アカウントを確認できません。ログインし直してください');
  await db.run('INSERT INTO audit_log (at, actor_id, action, target, detail) VALUES (?, ?, ?, ?, ?)',
    [new Date().toISOString(), userId, 'user.rename', userId, name]);
  return name;
}
