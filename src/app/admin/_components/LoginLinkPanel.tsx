'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginLinkAction } from '../actions';
import ErrorList from './ErrorList';
import SharedDeviceCheckbox from './SharedDeviceCheckbox';

export default function LoginLinkPanel({ token }: { token: string }) {
  const router = useRouter();
  const [shared, setShared] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const login = async () => {
    setBusy(true);
    const result = await loginLinkAction(token, shared);
    setBusy(false);
    if (!result.ok) return setErrors(result.errors);
    router.push('/admin');
    router.refresh();
  };

  return (
    <section className='mx-auto max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-6'>
      <div>
        <h1 className='text-xl font-bold'>ログインリンク</h1>
        <p className='mt-2 text-sm text-slate-600'>
          まとめ役が発行した1回だけ使えるリンクです。ログイン後、自分のスマホがあれば記事一覧の画面から「端末を追加」しておくと次から楽です。
        </p>
      </div>
      <SharedDeviceCheckbox checked={shared} onChange={setShared} />
      <ErrorList errors={errors} />
      <button
        onClick={login}
        disabled={busy}
        className='w-full rounded-lg bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-700 disabled:opacity-50'
      >
        ログイン
      </button>
    </section>
  );
}
