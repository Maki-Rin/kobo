'use client';

import { useState } from 'react';
import type { Role } from '@/lib/editor/auth';
import { createInviteAction } from '../actions';
import LinkButton from './LinkButton';
import { input, select } from './ui';

export default function InviteForm({ canInviteDeveloper }: { canInviteDeveloper: boolean }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('editor');
  return (
    <div className='space-y-3'>
      <label htmlFor='invite-name' className='block text-sm font-medium'>表示名の候補（任意）</label>
      <div className='flex flex-col gap-2 sm:flex-row'>
        <input
          id='invite-name'
          aria-describedby='invite-name-help'
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='空欄でも招待できます'
          className={input}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={`${select} w-full sm:w-36`}>
          <option value='editor'>編集者</option>
          <option value='lead'>管理者</option>
          {canInviteDeveloper && <option value='developer'>開発者</option>}
        </select>
      </div>
      <p id='invite-name-help' className='text-xs leading-5 text-slate-500'>
        表示名は本人が参加時に決め、登録後も「アカウント」で変更できます。日本語・英語どちらでも使えます。
        記事の「書いた人」や作品の「作った人」は「人物」で別に設定します。
      </p>
      <LinkButton
        key={`${name}-${role}`}
        label='招待リンクを発行'
        note='本人にこのリンクを送ってください（7日間有効・1回だけ使えます）。'
        create={() => createInviteAction(name, role)}
      />
    </div>
  );
}
