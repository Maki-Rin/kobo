'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { registrationOptionsAction, registrationVerifyAction } from '../actions';
import AuthCard from './AuthCard';
import ErrorList from './ErrorList';
import SharedDeviceCheckbox from './SharedDeviceCheckbox';
import { button, input } from './ui';

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
  const [name, setName] = useState(displayName);

  const register = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const options = await registrationOptionsAction(token, addingDevice ? undefined : name);
      if (!options.ok) return setErrors(options.errors);
      const response = await startRegistration({ optionsJSON: options.value.options });
      const result = await registrationVerifyAction(token, options.value.challengeId, response, shared, addingDevice ? undefined : name);
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
    <AuthCard title={addingDevice ? `${displayName} さんの端末を追加` : 'KOBO 投稿画面へようこそ'}>
      {!addingDevice && (
        <div className='space-y-2'>
          <label htmlFor='registration-name' className='block text-sm font-medium'>アカウントの表示名</label>
          <input id='registration-name' value={name} onChange={(e) => setName(e.target.value)}
            disabled={busy} maxLength={80} placeholder='例：山田 太郎' className={input} aria-describedby='registration-name-help' />
          <p id='registration-name-help' className='text-xs leading-5 text-slate-500'>
            メンバー一覧や変更履歴に表示します。日本語・英語とも使え、登録後も変更できます。
            記事の「書いた人」や作品の「作った人」は「人物」で別に設定します。
          </p>
        </div>
      )}
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
      <button onClick={register} disabled={busy || (!addingDevice && !name.trim())} className={`${button('primary', 'lg')} w-full`}>
        {busy ? '作成中…' : 'パスキーを作成'}
      </button>
    </AuthCard>
  );
}
