import { editorDbConfigured } from '@/lib/editor/db';
import { findActiveUser, findInvite } from '@/lib/editor/auth';
import AuthCard from '../../_components/AuthCard';
import RegisterPanel from '../../_components/RegisterPanel';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = editorDbConfigured() ? await findInvite(token, 'register') : null;
  const user = invite?.userId ? await findActiveUser(invite.userId) : null;
  if (!invite || (invite.userId && !user)) {
    return (
      <AuthCard title='このリンクは使えません'>
        <p className='text-sm leading-6 text-slate-600'>
          使用済みか、期限（7日）が切れています。まとめ役に新しいリンクを発行してもらってください。
        </p>
      </AuthCard>
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
