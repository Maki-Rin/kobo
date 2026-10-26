import { redirect } from 'next/navigation';
import { canManageMembers, currentUser, listMembers, roleLabels } from '@/lib/editor/auth';
import InviteForm from '../_components/InviteForm';
import MemberActions from '../_components/MemberActions';

export default async function MembersPage() {
  const user = await currentUser();
  if (!user || !canManageMembers(user)) redirect('/admin');
  const members = await listMembers();
  return (
    <div className='mx-auto max-w-4xl space-y-8'>
      <h1 className='text-2xl font-bold'>メンバー</h1>

      <section className='space-y-3 rounded-xl border border-slate-200 bg-white p-4'>
        <h2 className='font-bold'>新しく招待する</h2>
        <InviteForm canInviteDeveloper={user.role === 'developer'} />
      </section>

      <ul className='divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white'>
        {members.map((member) => (
          <li key={member.id} className='space-y-3 px-4 py-4'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
              <span className='font-medium'>{member.displayName}</span>
              <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs'>{roleLabels[member.role]}</span>
              {member.disabledAt && (
                <span className='rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800'>無効</span>
              )}
              <span className='text-sm text-slate-500'>パスキー {member.passkeys}件</span>
            </div>
            <MemberActions userId={member.id} disabled={Boolean(member.disabledAt)} isSelf={member.id === user.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
