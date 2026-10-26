'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDeviceInviteAction, loginLinkCreateAction, setDisabledAction } from '../actions';
import ErrorList from './ErrorList';
import LinkButton from './LinkButton';

export default function MemberActions({
  userId,
  disabled,
  isSelf,
}: {
  userId: string;
  disabled: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);

  const toggle = async () => {
    const result = await setDisabledAction(userId, !disabled);
    if (!result.ok) return setErrors(result.errors);
    router.refresh();
  };

  return (
    <div className='space-y-2'>
      {!disabled && (
        <div className='flex flex-wrap gap-2'>
          <LinkButton
            label='端末を追加するリンク'
            note='本人が新しい端末でこのリンクを開くと、パスキーを追加できます（7日間有効）。'
            create={() => addDeviceInviteAction(userId)}
          />
          <LinkButton
            label='1回だけのログインリンク'
            note='スマホをなくした人などに。15分以内に1回だけ使えます。'
            create={() => loginLinkCreateAction(userId)}
          />
        </div>
      )}
      {!isSelf && (
        <button
          onClick={toggle}
          className={`rounded px-3 py-1.5 text-sm ${disabled ? 'border border-slate-300 hover:bg-slate-100' : 'border border-red-300 text-red-700 hover:bg-red-50'}`}
        >
          {disabled ? '有効に戻す' : '無効にする（退任・端末紛失時）'}
        </button>
      )}
      <ErrorList errors={errors} />
    </div>
  );
}
