'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/editor/auth';
import { setRoleAction } from '../actions';
import ErrorList from './ErrorList';
import { select } from './ui';

export default function RoleSelect({
  userId,
  role,
  canSetDeveloper,
}: {
  userId: string;
  role: Role;
  canSetDeveloper: boolean;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const change = async (next: Role) => {
    const result = await setRoleAction(userId, next);
    if (!result.ok) return setErrors(result.errors);
    setErrors([]);
    router.refresh();
  };
  return (
    <div className='space-y-2'>
      <select value={role} onChange={(e) => change(e.target.value as Role)} aria-label='役割' className={`${select} h-8`}>
        <option value='editor'>編集者</option>
        <option value='lead'>まとめ役</option>
        {(canSetDeveloper || role === 'developer') && <option value='developer'>開発者</option>}
      </select>
      <ErrorList errors={errors} />
    </div>
  );
}
