import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { canManageTarget, SESSION_COOKIE, SESSION_DAYS, SHARED_SESSION_HOURS, validToken, type Role } from './policy';
import { consumeInvite } from './tokens';
export type { Role } from './policy';

export const roleLabels: Record<Role, string> = {
  editor: '編集者',
  lead: 'まとめ役',
  developer: '開発者',
};

export interface User {
  id: string;
  displayName: string;
  role: Role;
}

interface UserRow {
  id: string;
  display_name: string;
  role: Role;
  disabled_at: string | null;
}

export interface Invite {
  tokenHash: string;
  kind: 'register' | 'login';
  displayName: string | null;
  role: Role | null;
  userId: string | null;
}

const REGISTER_INVITE_DAYS = 7;
const LOGIN_LINK_MINUTES = 15;

export function randomToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const isoAfter = (ms: number) => new Date(Date.now() + ms).toISOString();
const nowIso = () => new Date().toISOString();

export function canManageMembers(user: User): boolean {
  return user.role === 'lead' || user.role === 'developer';
}

export async function audit(
  actorId: string | null,
  action: string,
  target?: string,
  detail?: string
) {
  const db = await getDb();
  await db.run(
    'INSERT INTO audit_log (at, actor_id, action, target, detail) VALUES (?, ?, ?, ?, ?)',
    [nowIso(), actorId, action, target ?? null, detail ?? null]
  );
}

export async function createInvite(options: {
  kind: 'register' | 'login';
  displayName?: string;
  role?: Role;
  userId?: string;
  createdBy: string | null;
}): Promise<string> {
  const token = randomToken();
  const ttl =
    options.kind === 'register'
      ? REGISTER_INVITE_DAYS * 24 * 60 * 60 * 1000
      : LOGIN_LINK_MINUTES * 60 * 1000;
  const db = await getDb();
  await db.run(
    `INSERT INTO invites (token_hash, kind, display_name, role, user_id, created_by, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      hashToken(token),
      options.kind,
      options.displayName ?? null,
      options.role ?? null,
      options.userId ?? null,
      options.createdBy,
      nowIso(),
      isoAfter(ttl),
    ]
  );
  await audit(
    options.createdBy,
    options.kind === 'register' ? 'invite.create' : 'login_link.create',
    options.userId ?? options.displayName
  );
  return token;
}

export async function findInvite(
  token: string,
  kind: Invite['kind']
): Promise<Invite | null> {
  if (!validToken(token)) return null;
  const db = await getDb();
  const [row] = await db.all<{
    token_hash: string;
    kind: Invite['kind'];
    display_name: string | null;
    role: Role | null;
    user_id: string | null;
  }>(
    `SELECT token_hash, kind, display_name, role, user_id FROM invites
     WHERE token_hash = ? AND kind = ? AND used_at IS NULL AND expires_at > ?`,
    [hashToken(token), kind, nowIso()]
  );
  if (!row) return null;
  return {
    tokenHash: row.token_hash,
    kind: row.kind,
    displayName: row.display_name,
    role: row.role,
    userId: row.user_id,
  };
}

export async function markInviteUsed(tokenHash: string) {
  const db = await getDb();
  if (!(await consumeInvite(db, tokenHash))) throw new Error('招待リンクが無効か、使用済みです');
}

export async function findActiveUser(id: string): Promise<User | null> {
  const db = await getDb();
  const [row] = await db.all<UserRow>(
    'SELECT id, display_name, role, disabled_at FROM users WHERE id = ?',
    [id]
  );
  if (!row || row.disabled_at) return null;
  return { id: row.id, displayName: row.display_name, role: row.role };
}

export async function startSession(userId: string, shared: boolean) {
  const token = randomToken();
  const ttl = shared
    ? SHARED_SESSION_HOURS * 60 * 60 * 1000
    : SESSION_DAYS * 24 * 60 * 60 * 1000;
  const db = await getDb();
  await db.run(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [hashToken(token), userId, nowIso(), isoAfter(ttl)]
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...(shared ? {} : { maxAge: ttl / 1000 }),
  });
  await audit(userId, 'login', undefined, shared ? 'shared' : undefined);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!validToken(token)) return null;
  const db = await getDb();
  const [row] = await db.all<UserRow>(
    `SELECT users.id, users.display_name, users.role, users.disabled_at
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    [hashToken(token), nowIso()]
  );
  if (!row || row.disabled_at) return null;
  return { id: row.id, displayName: row.display_name, role: row.role };
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error('ログインが必要です');
  return user;
}

export async function requireManageTarget(actor: User, userId: string): Promise<User> {
  const db = await getDb();
  const [row] = await db.all<UserRow>('SELECT id, display_name, role, disabled_at FROM users WHERE id = ?', [userId]);
  if (!row || !canManageTarget(actor, row)) throw new Error('このメンバーを管理する権限がありません');
  return { id: row.id, displayName: row.display_name, role: row.role };
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.run('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
  }
  store.delete(SESSION_COOKIE);
}

export interface Member extends User {
  createdAt: string;
  disabledAt: string | null;
  passkeys: number;
}

export async function listMembers(): Promise<Member[]> {
  const db = await getDb();
  const rows = await db.all<
    UserRow & { created_at: string; passkeys: number }
  >(
    `SELECT users.id, users.display_name, users.role, users.created_at, users.disabled_at,
       (SELECT COUNT(*) FROM credentials WHERE credentials.user_id = users.id) AS passkeys
     FROM users ORDER BY users.created_at`
  );
  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
    disabledAt: row.disabled_at,
    passkeys: row.passkeys,
  }));
}

export async function setUserDisabled(
  actor: User,
  userId: string,
  disabled: boolean
) {
  await requireManageTarget(actor, userId);
  const db = await getDb();
  await db.run('UPDATE users SET disabled_at = ? WHERE id = ?', [
    disabled ? nowIso() : null,
    userId,
  ]);
  if (disabled) {
    await db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
    await db.run('UPDATE invites SET expires_at = ? WHERE user_id = ? AND used_at IS NULL', [nowIso(), userId]);
  }
  await audit(actor.id, disabled ? 'user.disable' : 'user.enable', userId);
}

export async function createUser(
  id: string,
  displayName: string,
  role: Role
) {
  const db = await getDb();
  await db.run(
    'INSERT INTO users (id, display_name, role, created_at) VALUES (?, ?, ?, ?)',
    [id, displayName, role, nowIso()]
  );
}

export function deviceLabel(userAgent: string): string {
  const os = /iPhone/.test(userAgent)
    ? 'iPhone'
    : /iPad/.test(userAgent)
      ? 'iPad'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Macintosh|Mac OS X/.test(userAgent)
          ? 'Mac'
          : /Windows/.test(userAgent)
            ? 'Windows'
            : 'その他の端末';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\/|CriOS\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : '';
  return browser ? `${os}・${browser}` : os;
}

export interface Passkey {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export async function listPasskeys(userId: string): Promise<Passkey[]> {
  const db = await getDb();
  const rows = await db.all<{ id: string; label: string | null; created_at: string; last_used_at: string | null }>(
    'SELECT id, label, created_at, last_used_at FROM credentials WHERE user_id = ? ORDER BY created_at',
    [userId]
  );
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }));
}

export async function deletePasskey(actor: User, credentialId: string) {
  const db = await getDb();
  const [row] = await db.all<{ user_id: string }>('SELECT user_id FROM credentials WHERE id = ?', [credentialId]);
  if (!row) return;
  if (row.user_id !== actor.id && !canManageMembers(actor)) {
    throw new Error('まとめ役だけができる操作です');
  }
  await requireManageTarget(actor, row.user_id);
  await db.run('DELETE FROM credentials WHERE id = ?', [credentialId]);
  await db.run('DELETE FROM sessions WHERE user_id = ?', [row.user_id]);
  await audit(actor.id, 'passkey.delete', row.user_id, credentialId);
}

export interface PendingInvite {
  id: string;
  kind: 'register' | 'login';
  displayName: string | null;
  role: Role | null;
  targetName: string | null;
  createdByName: string | null;
  createdAt: string;
  expiresAt: string;
}

export async function listPendingInvites(): Promise<PendingInvite[]> {
  const db = await getDb();
  const rows = await db.all<{
    token_hash: string;
    kind: 'register' | 'login';
    display_name: string | null;
    role: Role | null;
    target_name: string | null;
    created_by_name: string | null;
    created_at: string;
    expires_at: string;
  }>(
    `SELECT i.token_hash, i.kind, i.display_name, i.role, t.display_name AS target_name,
       c.display_name AS created_by_name, i.created_at, i.expires_at
     FROM invites i
     LEFT JOIN users t ON t.id = i.user_id
     LEFT JOIN users c ON c.id = i.created_by
     WHERE i.used_at IS NULL AND i.expires_at > ?
     ORDER BY i.created_at DESC`,
    [nowIso()]
  );
  return rows.map((row) => ({
    id: row.token_hash,
    kind: row.kind,
    displayName: row.display_name,
    role: row.role,
    targetName: row.target_name,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

export async function revokeInvite(actor: User, tokenHash: string) {
  const db = await getDb();
  const [invite] = await db.all<{ role: Role | null; user_id: string | null }>('SELECT role, user_id FROM invites WHERE token_hash = ?', [tokenHash]);
  if (invite?.role === 'developer' && actor.role !== 'developer') throw new Error('開発者の招待は開発者だけが変更できます');
  if (invite?.user_id) await requireManageTarget(actor, invite.user_id);
  await db.run('UPDATE invites SET expires_at = ? WHERE token_hash = ? AND used_at IS NULL', [nowIso(), tokenHash]);
  await audit(actor.id, 'invite.revoke', tokenHash);
}

export async function setUserRole(actor: User, userId: string, role: Role) {
  await requireManageTarget(actor, userId);
  if (userId === actor.id) throw new Error('自分の役割は変えられません');
  if (role === 'developer' && actor.role !== 'developer') throw new Error('開発者にできるのは開発者だけです');
  const db = await getDb();
  const [target] = await db.all<{ role: Role }>('SELECT role FROM users WHERE id = ?', [userId]);
  if (target?.role === 'developer' && actor.role !== 'developer') throw new Error('開発者の役割は変えられません');
  await db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
  await db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
  await db.run('UPDATE invites SET expires_at = ? WHERE user_id = ? AND used_at IS NULL', [nowIso(), userId]);
  await audit(actor.id, 'user.role', userId, role);
}
