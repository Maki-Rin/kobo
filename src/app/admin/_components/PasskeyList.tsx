'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Passkey } from '@/lib/editor/auth';
import { deletePasskeyAction } from '../actions';
import ErrorList from './ErrorList';
import Icon from './Icon';
import { button } from './ui';

const formatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function PasskeyList({ passkeys, self }: { passkeys: Passkey[]; self: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const remove = async (id: string) => {
    const result = await deletePasskeyAction(id);
    setConfirming(null);
    if (!result.ok) return setErrors(result.errors);
    router.refresh();
  };

  if (passkeys.length === 0) {
    return <p className='text-sm text-slate-500'>登録されている端末はありません。</p>;
  }

  return (
    <div className='space-y-3'>
      <ul className='divide-y divide-slate-100 rounded-md border border-slate-200'>
        {passkeys.map((passkey) => (
          <li key={passkey.id} className='flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3'>
            <Icon name='key' className='text-slate-400' />
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-medium'>{passkey.label ?? '登録した端末'}</p>
              <p className='mt-0.5 text-xs text-slate-500'>
                登録 {formatter.format(new Date(passkey.createdAt))}
                {passkey.lastUsedAt ? `・最後に使った日時 ${formatter.format(new Date(passkey.lastUsedAt))}` : '・まだ使われていません'}
              </p>
            </div>
            {confirming === passkey.id ? (
              <div className='flex gap-2'>
                <button onClick={() => setConfirming(null)} className={button('secondary', 'sm')}>
                  やめる
                </button>
                <button onClick={() => remove(passkey.id)} className={button('danger', 'sm')}>
                  削除する
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirming(passkey.id)} className={button('ghost', 'sm')}>
                削除
              </button>
            )}
          </li>
        ))}
      </ul>
      {confirming && passkeys.length === 1 && (
        <p className='text-xs text-red-700'>
          {self ? 'これを消すとログインできなくなります。' : 'これを消すと、この人はログインできなくなります。'}
          まとめ役に新しいリンクを発行してもらう必要があります。
        </p>
      )}
      <ErrorList errors={errors} />
    </div>
  );
}
