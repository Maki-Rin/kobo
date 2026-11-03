'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { registrationOptionsAction, registrationVerifyAction } from '../actions';
import AuthCard from './AuthCard';
import ErrorList from './ErrorList';
import SharedDeviceCheckbox from './SharedDeviceCheckbox';
import { button } from './ui';

export default function RegisterPanel({
  token,
  displayName,
  addingDevice,
}: {
  token: string;
  displayName: string;
  addingDevice: boolean;
}) {
  const router = useRouter();
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const register = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const options = await registrationOptionsAction(token);
      if (!options.ok) return setErrors(options.errors);
      const response = await startRegistration({ optionsJSON: options.value.options });
      const result = await registrationVerifyAction(token, options.value.challengeId, response, shared);
      if (!result.ok) return setErrors(result.errors);
      router.push('/admin');
      router.refresh();
    } catch {
      setErrors(['パスキーの作成がキャンセルされたか、失敗しました']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title={addingDevice ? `${displayName} さんの端末を追加` : `${displayName} さん、ようこそ`}>
      <div className='space-y-3 text-sm leading-6 text-slate-600'>
        <p>この端末にパスキーを作ります。次回からは指紋・顔認証・PINだけでログインできます。パスワードはありません。</p>
        <p>
          <strong className='text-slate-900'>自分のスマホかPCで開いてください。</strong>
          工房の共有PCで開いた場合は、表示されるQRコードを自分のスマホで読み取ると、パスキーはスマホ側に保存されます。
        </p>
        <p>iPhone・MacならiCloudキーチェーン、AndroidならGoogleパスワードマネージャーに保存され、同じアカウントの端末で使えます。</p>
      </div>
      <SharedDeviceCheckbox checked={shared} onChange={setShared} />
      <ErrorList errors={errors} />
      <button onClick={register} disabled={busy} className={`${button('primary', 'lg')} w-full`}>
        {busy ? '作成中…' : 'パスキーを作成'}
      </button>
    </AuthCard>
  );
}
