import crypto from 'node:crypto';
import { isIP } from 'node:net';
import { headers } from 'next/headers';
import { getDb, type Db } from './db';

export class RateLimitError extends Error {
  constructor() { super('操作が続いています。しばらく待ってからもう一度お試しください'); }
}

export async function consumeLimit(db: Db, key: string, limit: number, seconds: number, now = Date.now()): Promise<boolean> {
  const start = Math.floor(now / (seconds * 1000)) * seconds;
  const rows = await db.all<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count, expires_at) VALUES (?, ?, 1, ?)
     ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count`,
    [key, start, start + seconds * 2, limit],
  );
  return rows.length === 1;
}

export async function limitEditorRequest(scope: string, limit = 15, seconds = 60, userId?: string) {
  const secret = process.env.EDITOR_RATE_LIMIT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
    throw new Error('EDITOR_RATE_LIMIT_SECRET must contain at least 32 characters');
  }
  const requestHeaders = await headers();
  // Only trust forwarding headers supplied by the Vercel ingress.
  const forwarded = process.env.VERCEL === '1' ? requestHeaders.get('x-vercel-forwarded-for')?.split(',')[0].trim() : null;
  const client = userId ?? (forwarded && isIP(forwarded) ? forwarded : 'shared');
  const key = crypto.createHmac('sha256', secret ?? 'local-development').update(`${scope}:${client}`).digest('hex');
  const db = await getDb();
  // A shared cap bounds growth even when clients rotate addresses.
  if (!(await consumeLimit(db, `global:${scope}`, limit * 10, seconds)) ||
      !(await consumeLimit(db, key, limit, seconds))) throw new RateLimitError();
  if (crypto.randomInt(100) === 0) {
    const now = new Date().toISOString();
    await db.run('DELETE FROM rate_limits WHERE expires_at < ?', [Math.floor(Date.now() / 1000)]);
    await db.run('DELETE FROM challenges WHERE expires_at < ?', [now]);
    await db.run('DELETE FROM sessions WHERE expires_at < ?', [now]);
    await db.run('DELETE FROM invites WHERE expires_at < ?', [now]);
  }
}
