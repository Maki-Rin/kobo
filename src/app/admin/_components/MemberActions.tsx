'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDeviceInviteAction, loginLinkCreateAction, setDisabledAction } from '../actions';
import ErrorList from './ErrorList';
import LinkButton from './LinkButton';
import { button } from './ui';

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
  const [confirm, setConfirm] = useState(false);

  const toggle = async () => {
    const result = await setDisabledAction(userId, !disabled);
    setConfirm(false);
    if (!result.ok) return setErrors(result.errors);
    router.refresh();
  };

  return (
    <div className='space-y-3'>
      {!disabled && (
        <div className='flex flex-wrap items-start gap-2'>
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
      {!isSelf &&
        (disabled ? (
          <button onClick={toggle} className={button('secondary', 'sm')}>
            有効に戻す
          </button>
        ) : confirm ? (
          <div className='flex gap-2'>
            <button onClick={() => setConfirm(false)} className={button('secondary', 'sm')}>
              やめる
            </button>
            <button onClick={toggle} className={button('danger', 'sm')}>
              無効にする
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className={button('dangerOutline', 'sm')}>
            無効にする（退任・端末紛失時）
          </button>
        ))}
      <ErrorList errors={errors} />
    </div>
  );
}
