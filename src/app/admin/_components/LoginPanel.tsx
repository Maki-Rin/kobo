'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import { loginOptionsAction, loginVerifyAction } from '../actions';
import ErrorList from './ErrorList';
import SharedDeviceCheckbox from './SharedDeviceCheckbox';

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
    <section className='mx-auto max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-6'>
      <div>
        <h1 className='text-xl font-bold'>ログイン</h1>
        <p className='mt-2 text-sm text-slate-600'>
          登録した端末の指紋・顔認証・PINでログインします。この端末で登録していない場合は、表示されるQRコードを自分のスマホで読み取ってください。
        </p>
      </div>
      <SharedDeviceCheckbox checked={shared} onChange={setShared} />
      <ErrorList errors={errors} />
      <button
        onClick={login}
        disabled={busy}
        className='w-full rounded-lg bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-700 disabled:opacity-50'
      >
        {busy ? '確認中…' : 'パスキーでログイン'}
      </button>
      <p className='text-xs text-slate-500'>
        スマホを持っていない・なくしたときは、まとめ役に「ログインリンク」を発行してもらってください。
      </p>
    </section>
  );
}
