import { redirect } from 'next/navigation';
import { canManageMembers, currentUser, listMembers, roleLabels } from '@/lib/editor/auth';
import InviteForm from '../_components/InviteForm';
import MemberActions from '../_components/MemberActions';
import { badge, card, pageTitle } from '../_components/ui';

export default async function MembersPage() {
  const user = await currentUser();
  if (!user || !canManageMembers(user)) redirect('/admin');
  const members = await listMembers();
  return (
    <div className='space-y-8'>
      <h1 className={pageTitle}>メンバー</h1>

      <section className={`${card} space-y-4 p-5`}>
        <h2 className='font-bold'>新しく招待する</h2>
        <InviteForm canInviteDeveloper={user.role === 'developer'} />
      </section>

      <ul className={`${card} divide-y divide-slate-100`}>
        {members.map((member) => (
          <li key={member.id} className='space-y-3 px-5 py-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='font-medium'>{member.displayName}</span>
              <span className={`${badge} bg-slate-100 text-slate-700`}>{roleLabels[member.role]}</span>
              {member.disabledAt && <span className={`${badge} bg-red-100 text-red-800`}>無効</span>}
              <span className='ml-auto text-sm text-slate-500'>パスキー {member.passkeys}件</span>
            </div>
            <MemberActions userId={member.id} disabled={Boolean(member.disabledAt)} isSelf={member.id === user.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
