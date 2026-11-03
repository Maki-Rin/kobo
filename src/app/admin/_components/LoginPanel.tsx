'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import { loginOptionsAction, loginVerifyAction } from '../actions';
import AuthCard from './AuthCard';
import ErrorList from './ErrorList';
import SharedDeviceCheckbox from './SharedDeviceCheckbox';
import { button } from './ui';

export default function LoginPanel() {
  const router = useRouter();
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const login = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const options = await loginOptionsAction();
      if (!options.ok) return setErrors(options.errors);
      const response = await startAuthentication({ optionsJSON: options.value.options });
      const result = await loginVerifyAction(options.value.challengeId, response, shared);
      if (!result.ok) return setErrors(result.errors);
      router.refresh();
    } catch {
      setErrors(['パスキーの確認がキャンセルされたか、失敗しました']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title='ログイン'>
      <p className='text-sm leading-6 text-slate-600'>
        登録した端末の指紋・顔認証・PINでログインします。この端末で登録していない場合は、表示されるQRコードを自分のスマホで読み取ってください。
      </p>
      <SharedDeviceCheckbox checked={shared} onChange={setShared} />
      <ErrorList errors={errors} />
      <button onClick={login} disabled={busy} className={`${button('primary', 'lg')} w-full`}>
        {busy ? '確認中…' : 'パスキーでログイン'}
      </button>
      <p className='text-xs leading-5 text-slate-500'>
        スマホを持っていない・なくしたときは、まとめ役に「ログインリンク」を発行してもらってください。
      </p>
    </AuthCard>
  );
}
