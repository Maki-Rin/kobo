export type Role = 'editor' | 'lead' | 'developer';

export function canManageTarget(actor: { id: string; role: Role }, target: { id: string; role: Role }): boolean {
  if (actor.id === target.id) return true;
  return actor.role === 'developer' || (actor.role === 'lead' && target.role !== 'developer');
}

export const SESSION_DAYS = 7;
export const SHARED_SESSION_HOURS = 2;
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-kobo_editor_session' : 'kobo_editor_session';
export const CHALLENGE_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-kobo_editor_challenge' : 'kobo_editor_challenge';

export function validToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}
