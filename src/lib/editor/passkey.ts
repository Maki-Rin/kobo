import crypto from 'crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { cookies, headers } from 'next/headers';
import { getDb } from './db';
import { editorConfig } from './config';
import {
  audit,
  createUser,
  deviceLabel,
  findActiveUser,
  findInvite,
  markInviteUsed,
  startSession,
} from './auth';
import { CHALLENGE_COOKIE } from './policy';
import { consumeChallenge } from './tokens';

const CHALLENGE_MINUTES = 5;

async function saveChallenge(
  challenge: string,
  purpose: 'register' | 'login',
  inviteTokenHash?: string,
  userId?: string
): Promise<string> {
  const id = crypto.randomUUID();
  const db = await getDb();
  await db.run('DELETE FROM challenges WHERE expires_at < ?', [
    new Date().toISOString(),
  ]);
  await db.run(
    `INSERT INTO challenges (id, challenge, purpose, invite_token_hash, user_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      challenge,
      purpose,
      inviteTokenHash ?? null,
      userId ?? null,
      new Date(Date.now() + CHALLENGE_MINUTES * 60 * 1000).toISOString(),
    ]
  );
  (await cookies()).set(CHALLENGE_COOKIE, id, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', path: '/', maxAge: CHALLENGE_MINUTES * 60,
  });
  return id;
}

async function takeChallenge(id: string, purpose: 'register' | 'login') {
  const jar = await cookies();
  if (typeof id !== 'string' || jar.get(CHALLENGE_COOKIE)?.value !== id) {
    throw new Error('この端末のログインを確認できません。もう一度やり直してください');
  }
  jar.delete(CHALLENGE_COOKIE);
  const db = await getDb();
  const row = await consumeChallenge(db, id, purpose);
  if (!row) throw new Error('時間切れです。もう一度やり直してください');
  return row;
}

export async function beginRegistration(inviteToken: string): Promise<{
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}> {
  const invite = await findInvite(inviteToken, 'register');
  if (!invite) throw new Error('招待リンクが無効か、期限切れです');

  const userId = invite.userId ?? crypto.randomUUID();
  let displayName = invite.displayName ?? '';
  const db = await getDb();
  let excludeCredentials: { id: string; transports?: string[] }[] = [];
  if (invite.userId) {
    const user = await findActiveUser(invite.userId);
    if (!user) throw new Error('このアカウントは無効になっています');
    displayName = user.displayName;
    const rows = await db.all<{ id: string; transports: string | null }>(
      'SELECT id, transports FROM credentials WHERE user_id = ?',
      [invite.userId]
    );
    excludeCredentials = rows.map((row) => ({
      id: row.id,
      transports: row.transports ? JSON.parse(row.transports) : undefined,
    }));
  }

  const { rpID } = editorConfig();
  const options = await generateRegistrationOptions({
    rpName: 'KOBO 投稿画面',
    rpID,
    userName: displayName,
    userDisplayName: displayName,
    userID: Uint8Array.from(Buffer.from(userId, 'utf8')),
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  });
  const challengeId = await saveChallenge(
    options.challenge,
    'register',
    invite.tokenHash,
    userId
  );
  return { challengeId, options };
}

export async function finishRegistration(
  inviteToken: string,
  challengeId: string,
  response: RegistrationResponseJSON,
  shared: boolean
) {
  const challenge = await takeChallenge(challengeId, 'register');
  const invite = await findInvite(inviteToken, 'register');
  if (!invite || invite.tokenHash !== challenge.invite_token_hash || !challenge.user_id) {
    throw new Error('招待リンクが無効か、期限切れです');
  }
  const { origin, rpID } = editorConfig();
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
  if (!verification.verified) throw new Error('パスキーを確認できませんでした');

  const userId = challenge.user_id;
  if (invite.userId && !(await findActiveUser(invite.userId))) {
    throw new Error('このアカウントは無効になっています');
  }
  await markInviteUsed(invite.tokenHash);
  if (!invite.userId) {
    await createUser(userId, invite.displayName ?? '名無し', invite.role ?? 'editor');
  }
  const { credential } = verification.registrationInfo;
  const db = await getDb();
  await db.run(
    `INSERT INTO credentials (id, user_id, public_key, counter, transports, created_at, label)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      credential.id,
      userId,
      Buffer.from(credential.publicKey).toString('base64url'),
      credential.counter,
      credential.transports ? JSON.stringify(credential.transports) : null,
      new Date().toISOString(),
      deviceLabel((await headers()).get('user-agent') ?? ''),
    ]
  );
  await audit(userId, 'passkey.register', credential.id);
  await startSession(userId, shared);
}

export async function beginLogin(): Promise<{
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}> {
  const { rpID } = editorConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
  });
  const challengeId = await saveChallenge(options.challenge, 'login');
  return { challengeId, options };
}

export async function finishLogin(
  challengeId: string,
  response: AuthenticationResponseJSON,
  shared: boolean
) {
  const challenge = await takeChallenge(challengeId, 'login');
  const db = await getDb();
  const [row] = await db.all<{
    id: string;
    user_id: string;
    public_key: string;
    counter: number;
    transports: string | null;
  }>(
    'SELECT id, user_id, public_key, counter, transports FROM credentials WHERE id = ?',
    [response.id]
  );
  if (!row) throw new Error('登録されていないパスキーです');
  const user = await findActiveUser(row.user_id);
  if (!user) throw new Error('このアカウントは無効になっています');

  const { origin, rpID } = editorConfig();
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: row.id,
      publicKey: Uint8Array.from(Buffer.from(row.public_key, 'base64url')),
      counter: row.counter,
      transports: row.transports ? JSON.parse(row.transports) : undefined,
    },
  });
  if (!verification.verified) throw new Error('パスキーを確認できませんでした');

  await db.run(
    'UPDATE credentials SET counter = ?, last_used_at = ? WHERE id = ?',
    [
      verification.authenticationInfo.newCounter,
      new Date().toISOString(),
      row.id,
    ]
  );
  await startSession(user.id, shared);
}
