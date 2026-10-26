'use client';

import { useState } from 'react';
import type { Role } from '@/lib/editor/auth';
import { createInviteAction } from '../actions';
import LinkButton from './LinkButton';
import { input } from './ui';

export default function InviteForm({ canInviteDeveloper }: { canInviteDeveloper: boolean }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('editor');
  return (
    <div className='space-y-3'>
      <div className='flex flex-col gap-2 sm:flex-row'>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='名前（記事の「書いた人」に使われます）'
          className={input}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={`${input} sm:w-36`}>
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
