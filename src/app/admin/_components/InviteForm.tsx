'use client';

import { useState } from 'react';
import type { Role } from '@/lib/editor/auth';
import { createInviteAction } from '../actions';
import LinkButton from './LinkButton';

export default function InviteForm({ canInviteDeveloper }: { canInviteDeveloper: boolean }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('editor');
  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2'>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='名前（サイトに表示されます）'
          className='min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2'
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className='rounded-lg border border-slate-300 px-3 py-2'
        >
          <option value='editor'>編集者</option>
          <option value='lead'>まとめ役</option>
          {canInviteDeveloper && <option value='developer'>開発者</option>}
        </select>
      </div>
      <LinkButton
        key={`${name}-${role}`}
        label='招待リンクを発行'
        note='本人にこのリンクを送ってください（7日間有効・1回だけ使えます）。'
        create={() => createInviteAction(name, role)}
      />
    </div>
  );
}
