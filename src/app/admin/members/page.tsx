import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  canManageMembers,
  currentUser,
  listMembers,
  listPasskeys,
  listPendingInvites,
  roleLabels,
} from '@/lib/editor/auth';
import { articleActionLabels, lastLogins, recentEvents } from '@/lib/editor/activity';
import InviteForm from '../_components/InviteForm';
import MemberActions from '../_components/MemberActions';
import PasskeyList from '../_components/PasskeyList';
import PendingInvites from '../_components/PendingInvites';
import RoleSelect from '../_components/RoleSelect';
import { relativeTime } from '../_components/relativeTime';
import { badge, card, pageTitle } from '../_components/ui';

async function loadMembers() {
  const [members, invites, logins] = await Promise.all([listMembers(), listPendingInvites(), lastLogins()]);
  const details = await Promise.all(
    members.map(async (member) => ({
      ...member,
      lastLogin: logins.get(member.id) ?? null,
      passkeyList: await listPasskeys(member.id),
      edits: await recentEvents({ userId: member.id, limit: 5 }),
    }))
  );
  return { members: details, invites, now: Date.now() };
}

export default async function MembersPage() {
  const user = await currentUser();
  if (!user || !canManageMembers(user)) redirect('/admin');
  const { members, invites, now } = await loadMembers();
  const active = members.filter((member) => !member.disabledAt);
  const disabled = members.filter((member) => member.disabledAt);

  return (
    <div className='space-y-8'>
      <div>
        <h1 className={pageTitle}>メンバー</h1>
        <p className='mt-1 text-sm text-slate-500'>
          {active.length}人が使えます{disabled.length > 0 && `（無効 ${disabled.length}人）`}
        </p>
      </div>

      <section className={`${card} space-y-5 p-5`}>
        <div>
          <h2 className='font-bold'>新しく招待する</h2>
          <p className='mt-1 text-sm text-slate-600'>発行したリンクを本人に送ると、本人の端末でパスキーを作って参加できます。</p>
        </div>
        <InviteForm canInviteDeveloper={user.role === 'developer'} />
        <div className='space-y-2 border-t border-slate-100 pt-5'>
          <h3 className='text-sm font-bold'>まだ使われていないリンク</h3>
          <PendingInvites invites={invites} now={now} />
        </div>
      </section>

      <ul className='space-y-3'>
        {[...active, ...disabled].map((member) => (
          <li key={member.id} className={`${card} ${member.disabledAt ? 'opacity-70' : ''}`}>
            <details className='group'>
              <summary className='flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 [&::-webkit-details-marker]:hidden'>
                <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600'>
                  {member.displayName.slice(0, 1)}
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='flex flex-wrap items-center gap-2 font-medium'>
                    {member.displayName}
                    {member.id === user.id && <span className='text-xs font-normal text-slate-500'>（自分）</span>}
                    <span className={`${badge} bg-slate-100 text-slate-700`}>{roleLabels[member.role]}</span>
                    {member.disabledAt && <span className={`${badge} bg-red-100 text-red-800`}>無効</span>}
                  </p>
                  <p className='mt-0.5 text-xs text-slate-500'>
                    {member.lastLogin ? `最終ログイン ${relativeTime(member.lastLogin, now)}` : 'まだログインしていません'}
                    ・パスキー {member.passkeys}件
                    {member.edits[0] && `・最後の編集 ${relativeTime(member.edits[0].at, now)}`}
                  </p>
                </div>
                <span className='text-sm text-slate-500 group-open:hidden'>詳しく ▾</span>
                <span className='hidden text-sm text-slate-500 group-open:inline'>閉じる ▴</span>
              </summary>
              <div className='space-y-6 border-t border-slate-100 px-5 py-5'>
                {member.id !== user.id && !member.disabledAt && (
                  <div className='space-y-2'>
                    <h3 className='text-sm font-bold'>役割</h3>
                    <RoleSelect userId={member.id} role={member.role} canSetDeveloper={user.role === 'developer'} />
                    <p className='text-xs text-slate-500'>編集者は自分の変更だけ戻せます。まとめ役はメンバーの招待・管理と、全員の変更を戻せます。</p>
                  </div>
                )}
                <div className='space-y-2'>
                  <h3 className='text-sm font-bold'>登録している端末</h3>
                  <PasskeyList passkeys={member.passkeyList} self={member.id === user.id} />
                </div>
                <div className='space-y-2'>
                  <h3 className='text-sm font-bold'>最近の編集</h3>
                  {member.edits.length === 0 ? (
                    <p className='text-sm text-slate-500'>まだありません。</p>
                  ) : (
                    <ul className='space-y-1.5 text-sm'>
                      {member.edits.map((edit) => (
                        <li key={`${edit.commitId}-${edit.articleId}`} className='flex flex-wrap gap-x-2'>
                          <Link href={`/admin/${edit.collection}/${edit.articleId}`} className='font-medium hover:underline'>
                            {edit.title}
                          </Link>
                          <span className='text-slate-500'>
                            を{articleActionLabels[edit.action]}・{relativeTime(edit.at, now)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className='space-y-2'>
                  <h3 className='text-sm font-bold'>ログインの手助け・停止</h3>
                  <MemberActions userId={member.id} disabled={Boolean(member.disabledAt)} isSelf={member.id === user.id} />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
