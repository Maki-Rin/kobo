'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { editorConfig } from '@/lib/editor/config';
import {
  canManageMembers,
  createInvite,
  endSession,
  findActiveUser,
  findInvite,
  markInviteUsed,
  requireUser,
  setUserDisabled,
  startSession,
  type Role,
} from '@/lib/editor/auth';
import {
  beginLogin,
  beginRegistration,
  finishLogin,
  finishRegistration,
} from '@/lib/editor/passkey';
import {
  EditorError,
  revertCommit,
  saveArticle,
} from '@/lib/editor/articles';
import { ConflictError } from '@/lib/editor/store';
import { renderPreviewHtml } from '@/lib/editor/preview';

export type ActionResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

async function attempt<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    if (error instanceof EditorError) return { ok: false, errors: error.messages };
    if (error instanceof ConflictError) return { ok: false, errors: [error.message] };
    console.error(error);
    const message = error instanceof Error ? error.message : '';
    const known = /期限切れ|時間切れ|無効|登録されていない|確認できません|ログインが必要/.test(message);
    return {
      ok: false,
      errors: [known ? message : 'うまくいきませんでした。時間をおいてもう一度試すか、まとめ役に連絡してください'],
    };
  }
}

async function requireManager() {
  const user = await requireUser();
  if (!canManageMembers(user)) throw new EditorError(['まとめ役だけができる操作です']);
  return user;
}

export async function registrationOptionsAction(token: string) {
  return attempt(() => beginRegistration(token));
}

export async function registrationVerifyAction(
  token: string,
  challengeId: string,
  response: RegistrationResponseJSON,
  shared: boolean
) {
  return attempt(() => finishRegistration(token, challengeId, response, shared));
}

export async function loginOptionsAction() {
  return attempt(() => beginLogin());
}

export async function loginVerifyAction(
  challengeId: string,
  response: AuthenticationResponseJSON,
  shared: boolean
) {
  return attempt(() => finishLogin(challengeId, response, shared));
}

export async function loginLinkAction(token: string, shared: boolean) {
  return attempt(async () => {
    const invite = await findInvite(token, 'login');
    if (!invite?.userId) throw new Error('ログインリンクが無効か、期限切れです');
    const user = await findActiveUser(invite.userId);
    if (!user) throw new Error('このアカウントは無効になっています');
    await markInviteUsed(invite.tokenHash);
    await startSession(user.id, shared);
  });
}

export async function logoutAction() {
  await endSession();
  redirect('/admin');
}

export async function previewAction(body: string) {
  return attempt(async () => {
    await requireUser();
    return renderPreviewHtml(body);
  });
}

export async function saveArticleAction(formData: FormData) {
  return attempt(async () => {
    const user = await requireUser();
    const draft = JSON.parse(String(formData.get('draft'))) as Record<string, unknown>;
    const isNew = formData.get('isNew') === 'true';
    const baseSha = (formData.get('baseSha') as string | null) || null;
    const images = await Promise.all(
      formData.getAll('images').map(async (entry) => {
        const file = entry as File;
        return { name: file.name, data: Buffer.from(await file.arrayBuffer()) };
      })
    );
    const commitId = await saveArticle(user, { draft, isNew, baseSha, images });
    revalidatePath('/admin');
    return { commitId, id: String(draft.id) };
  });
}

export async function revertAction(commitId: string) {
  return attempt(async () => {
    const user = await requireUser();
    await revertCommit(user, commitId);
    revalidatePath('/admin/history');
  });
}

const inviteUrl = (kind: 'invite' | 'login', token: string) =>
  `${editorConfig().origin}/admin/${kind}/${token}`;

export async function createInviteAction(displayName: string, role: Role) {
  return attempt(async () => {
    const user = await requireManager();
    const name = displayName.trim();
    if (!name) throw new EditorError(['名前を入れてください']);
    if (!['editor', 'lead', 'developer'].includes(role) || (role === 'developer' && user.role !== 'developer')) {
      throw new EditorError(['この役割では招待できません']);
    }
    const token = await createInvite({ kind: 'register', displayName: name, role, createdBy: user.id });
    return inviteUrl('invite', token);
  });
}

export async function addDeviceInviteAction(userId: string) {
  return attempt(async () => {
    const user = await requireUser();
    if (userId !== user.id && !canManageMembers(user)) {
      throw new EditorError(['まとめ役だけができる操作です']);
    }
    const token = await createInvite({ kind: 'register', userId, createdBy: user.id });
    return inviteUrl('invite', token);
  });
}

export async function loginLinkCreateAction(userId: string) {
  return attempt(async () => {
    const user = await requireManager();
    const token = await createInvite({ kind: 'login', userId, createdBy: user.id });
    return inviteUrl('login', token);
  });
}

export async function setDisabledAction(userId: string, disabled: boolean) {
  return attempt(async () => {
    const user = await requireManager();
    if (userId === user.id) throw new EditorError(['自分自身は無効にできません']);
    await setUserDisabled(user, userId, disabled);
    revalidatePath('/admin/members');
  });
}
