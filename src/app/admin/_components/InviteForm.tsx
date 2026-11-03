'use client';

import { useState } from 'react';
import type { Role } from '@/lib/editor/auth';
import { createInviteAction } from '../actions';
import LinkButton from './LinkButton';
import { select } from './ui';

export default function InviteForm({ canInviteDeveloper }: { canInviteDeveloper: boolean }) {
  const [role, setRole] = useState<Role>('editor');
  return (
    <div className='space-y-3'>
      <label htmlFor='invite-role' className='block text-sm font-medium'>役割</label>
      <div>
        <select id='invite-role' value={role} onChange={(e) => setRole(e.target.value as Role)} className={`${select} w-full sm:w-36`}>
          <option value='editor'>編集者</option>
          <option value='lead'>管理者</option>
          {canInviteDeveloper && <option value='developer'>開発者</option>}
        </select>
      </div>
      <p className='text-xs leading-5 text-slate-500'>
        表示名は本人が参加時に決め、登録後も「アカウント」で変更できます。日本語・英語どちらでも使えます。
        記事の「書いた人」や作品の「作った人」は「人物」で別に設定します。
      </p>
      <LinkButton
        key={role}
        label='招待リンクを発行'
        note='本人にこのリンクを送ってください（7日間有効・1回だけ使えます）。'
        create={() => createInviteAction('', role)}
      />
    </div>
  );
}
