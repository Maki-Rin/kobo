import { editorDbConfigured } from '@/lib/editor/db';
import { findActiveUser, findInvite } from '@/lib/editor/auth';
import RegisterPanel from '../../_components/RegisterPanel';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = editorDbConfigured() ? await findInvite(token, 'register') : null;
  const user = invite?.userId ? await findActiveUser(invite.userId) : null;
  if (!invite || (invite.userId && !user)) {
    return (
      <p className='mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6'>
        この招待リンクは使えません。使用済みか期限切れ（7日）です。まとめ役に新しいリンクを発行してもらってください。
      </p>
    );
  }
  return (
    <RegisterPanel
      token={token}
      displayName={user?.displayName ?? invite.displayName ?? ''}
      addingDevice={Boolean(user)}
    />
  );
}
