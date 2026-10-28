'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { editorConfig } from '@/lib/editor/config';
import {
  canManageMembers,
  createInvite,
  deletePasskey,
  endSession,
  findActiveUser,
  findInvite,
  markInviteUsed,
  requireUser,
  requireManageTarget,
  revokeInvite,
  setUserDisabled,
  setUserRole,
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
  saveEntry,
  stageImage,
  type StagedImage,
} from '@/lib/editor/entries';
import { isCollection } from '@/lib/content-schema';
import { savePeople } from '@/lib/editor/people';
import { ConflictError } from '@/lib/editor/store';
import { renderPreviewHtml } from '@/lib/editor/preview';
import { limitEditorRequest, RateLimitError } from '@/lib/editor/rate-limit';

export type ActionResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

async function attempt<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
      throw new EditorError(['投稿画面は本番の指定ドメインから利用してください']);
    }
    if ((await headers()).get('origin') !== editorConfig().origin) {
      throw new EditorError(['投稿画面のURLを確認して、もう一度開いてください']);
    }
    return { ok: true, value: await run() };
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, errors: [error.message] };
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
  await limitEditorRequest('manage', 30, 60, user.id);
  return user;
}

export async function registrationOptionsAction(token: string) {
  return attempt(async () => {
    await limitEditorRequest('register', 10);
    return beginRegistration(token);
  });
}

export async function registrationVerifyAction(
  token: string,
  challengeId: string,
  response: RegistrationResponseJSON,
  shared: boolean
) {
  return attempt(async () => {
    await limitEditorRequest('register-verify', 15);
    return finishRegistration(token, challengeId, response, shared);
  });
}

export async function loginOptionsAction() {
  return attempt(async () => {
    await limitEditorRequest('login', 15);
    return beginLogin();
  });
}

export async function loginVerifyAction(
  challengeId: string,
  response: AuthenticationResponseJSON,
  shared: boolean
) {
  return attempt(async () => {
    await limitEditorRequest('login-verify', 20);
    return finishLogin(challengeId, response, shared);
  });
}

export async function loginLinkAction(token: string, shared: boolean) {
  return attempt(async () => {
    await limitEditorRequest('login-link', 10);
    const invite = await findInvite(token, 'login');
    if (!invite?.userId) throw new Error('ログインリンクが無効か、期限切れです');
    const user = await findActiveUser(invite.userId);
    if (!user) throw new Error('このアカウントは無効になっています');
    await markInviteUsed(invite.tokenHash);
    await startSession(user.id, shared);
  });
}

export async function logoutAction() {
  if ((await headers()).get('origin') !== editorConfig().origin) throw new Error('Invalid origin');
  await endSession();
  redirect('/admin');
}

export async function previewAction(body: string) {
  return attempt(async () => {
    const user = await requireUser();
    await limitEditorRequest('preview', 60, 60, user.id);
    if (typeof body !== 'string' || body.length > 100_000) throw new EditorError(['本文は10万文字までです']);
    return renderPreviewHtml(body);
  });
}

export async function uploadImageAction(formData: FormData) {
  return attempt(async () => {
    const user = await requireUser();
    await limitEditorRequest('upload', 60, 3600, user.id);
    const file = formData.get('image');
    if (!(file instanceof File)) throw new EditorError(['画像が選ばれていません']);
    if (file.size > 3 * 1024 * 1024) throw new EditorError(['画像は3MBまでです']);
    return stageImage(Buffer.from(await file.arrayBuffer()));
  });
}

export async function saveEntryAction(input: {
  collection: string;
  draft: Record<string, unknown>;
  isNew: boolean;
  baseSha: string | null;
  images: StagedImage[];
}) {
  return attempt(async () => {
    const user = await requireUser();
    await limitEditorRequest('save', 30, 3600, user.id);
    if (!isCollection(input.collection)) throw new EditorError(['種類が正しくありません']);
    const images = Array.isArray(input.images)
      ? input.images.map((image) => ({ name: String(image.name), sha: String(image.sha) }))
      : [];
    const commitId = await saveEntry(user, {
      collection: input.collection,
      draft: input.draft,
      isNew: Boolean(input.isNew),
      baseSha: typeof input.baseSha === 'string' ? input.baseSha : null,
      images,
    });
    revalidatePath('/admin');
    return { commitId, id: String(input.draft.id) };
  });
}

export async function revertAction(commitId: string) {
  return attempt(async () => {
    const user = await requireUser();
    await limitEditorRequest('save', 30, 3600, user.id);
    if (!/^[0-9a-f]{40}$/.test(commitId)) throw new EditorError(['変更IDが正しくありません']);
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
    await limitEditorRequest('invite', 10, 3600, user.id);
    if (!name || name.length > 80) throw new EditorError(['名前は1〜80文字で入れてください']);
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
    await requireManageTarget(user, userId);
    await limitEditorRequest('invite', 10, 3600, user.id);
    const token = await createInvite({ kind: 'register', userId, createdBy: user.id });
    return inviteUrl('invite', token);
  });
}

export async function loginLinkCreateAction(userId: string) {
  return attempt(async () => {
    const user = await requireManager();
    await requireManageTarget(user, userId);
    await limitEditorRequest('invite', 10, 3600, user.id);
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

export async function deletePasskeyAction(credentialId: string) {
  return attempt(async () => {
    const user = await requireUser();
    await deletePasskey(user, credentialId);
    revalidatePath('/admin/account');
    revalidatePath('/admin/members');
  });
}

export async function revokeInviteAction(id: string) {
  return attempt(async () => {
    const user = await requireManager();
    await revokeInvite(user, id);
    revalidatePath('/admin/members');
  });
}

export async function setRoleAction(userId: string, role: Role) {
  return attempt(async () => {
    const user = await requireManager();
    if (!['editor', 'lead', 'developer'].includes(role)) throw new EditorError(['役割が正しくありません']);
    try {
      await setUserRole(user, userId, role);
    } catch (error) {
      throw new EditorError([error instanceof Error ? error.message : '役割を変えられませんでした']);
    }
    revalidatePath('/admin/members');
  });
}

export async function savePeopleAction(input: { people: unknown; baseSha: string | null; images: StagedImage[] }) {
  return attempt(async () => {
    const user = await requireUser();
    await limitEditorRequest('save', 30, 3600, user.id);
    const images = Array.isArray(input.images)
      ? input.images.map((image) => ({ name: String(image.name), sha: String(image.sha) }))
      : [];
    await savePeople(user, { people: input.people, baseSha: input.baseSha ?? null, images });
    revalidatePath('/admin/people');
  });
}
