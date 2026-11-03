'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PendingInvite } from '@/lib/editor/auth';
import { revokeInviteAction } from '../actions';
import ErrorList from './ErrorList';
import { relativeTime } from './relativeTime';
import { badge, button } from './ui';

const roleNames = { editor: '編集者', lead: 'まとめ役', developer: '開発者' };

function remaining(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60_000));
  if (minutes < 60) return `あと${minutes}分`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `あと${hours}時間`;
  return `あと${Math.round(hours / 24)}日`;
}

export default function PendingInvites({ invites, now }: { invites: PendingInvite[]; now: number }) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const revoke = async (id: string) => {
    const result = await revokeInviteAction(id);
    if (!result.ok) return setErrors(result.errors);
    router.refresh();
  };
  if (invites.length === 0) {
    return <p className='text-sm text-slate-500'>使われていないリンクはありません。</p>;
  }
  return (
    <div className='space-y-3'>
      <ul className='divide-y divide-slate-100 rounded-md border border-slate-200'>
        {invites.map((invite) => (
          <li key={invite.id} className='flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3'>
            <div className='min-w-0 flex-1'>
              <p className='flex flex-wrap items-center gap-2 text-sm font-medium'>
                {invite.kind === 'login'
                  ? `${invite.targetName ?? ''} さんのログインリンク`
                  : invite.targetName
                    ? `${invite.targetName} さんの端末追加`
                    : `${invite.displayName} さんの招待`}
                {invite.kind === 'register' && !invite.targetName && invite.role && (
                  <span className={`${badge} bg-slate-100 text-slate-700`}>{roleNames[invite.role]}</span>
                )}
              </p>
              <p className='mt-0.5 text-xs text-slate-500'>
                {invite.createdByName ?? 'コマンド'}が{relativeTime(invite.createdAt, now)}に発行・{remaining(invite.expiresAt, now)}で無効
              </p>
            </div>
            <button onClick={() => revoke(invite.id)} className={button('ghost', 'sm')}>
              取り消す
            </button>
          </li>
        ))}
      </ul>
      <ErrorList errors={errors} />
    </div>
  );
}
