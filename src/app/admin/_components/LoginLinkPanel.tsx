'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginLinkAction } from '../actions';
import AuthCard from './AuthCard';
import ErrorList from './ErrorList';
import SharedDeviceCheckbox from './SharedDeviceCheckbox';
import { button } from './ui';

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
    <AuthCard title='ログインリンク'>
      <p className='text-sm leading-6 text-slate-600'>
        まとめ役が発行した、1回だけ使えるリンクです。自分のスマホがあれば、ログイン後に記事一覧の「端末を追加」からパスキーを作っておくと次から楽です。
      </p>
      <SharedDeviceCheckbox checked={shared} onChange={setShared} />
      <ErrorList errors={errors} />
      <button onClick={login} disabled={busy} className={`${button('primary', 'lg')} w-full`}>
        ログイン
      </button>
    </AuthCard>
  );
}
