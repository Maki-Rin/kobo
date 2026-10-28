import type { Db } from './db';

export async function consumeInvite(db: Db, tokenHash: string, now = new Date().toISOString()): Promise<boolean> {
  const rows = await db.all<{ token_hash: string }>(
    'UPDATE invites SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING token_hash',
    [now, tokenHash, now],
  );
  return rows.length === 1;
}

export async function consumeChallenge(db: Db, id: string, purpose: string) {
  const [row] = await db.all<{ challenge: string; invite_token_hash: string | null; user_id: string | null }>(
    'DELETE FROM challenges WHERE id = ? AND purpose = ? AND expires_at > ? RETURNING challenge, invite_token_hash, user_id',
    [id, purpose, new Date().toISOString()],
  );
  return row;
}
