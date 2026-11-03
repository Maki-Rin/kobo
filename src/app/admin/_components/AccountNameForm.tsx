'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateDisplayNameAction } from '../actions';
import ErrorList from './ErrorList';
import { button, input } from './ui';

export default function AccountNameForm({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [savedName, setSavedName] = useState(displayName);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  return (
    <form className='space-y-3' onSubmit={async (event) => {
      event.preventDefault();
      setBusy(true);
      setErrors([]);
      setNotice('');
      try {
        const result = await updateDisplayNameAction(name);
        if (!result.ok) return setErrors(result.errors);
        setName(result.value);
        setSavedName(result.value);
        setNotice('表示名を変更しました。');
        router.refresh();
      } catch {
        setErrors(['変更できませんでした。もう一度お試しください']);
      } finally {
        setBusy(false);
      }
    }}>
      <label htmlFor='account-name' className='block text-sm font-medium'>アカウントの表示名</label>
      <input id='account-name' value={name} onChange={(event) => setName(event.target.value)}
        maxLength={80} required disabled={busy} className={input} aria-describedby='account-name-help' />
      <p id='account-name-help' className='text-xs leading-5 text-slate-500'>
        メンバー一覧や変更履歴に表示する名前です。日本語・英語どちらでも使えます（1〜80文字）。
        記事の「書いた人」や作品の「作った人」は「人物」で別に変更します。
      </p>
      <ErrorList errors={errors} />
      <p role='status' className='text-sm text-slate-600'>{notice}</p>
      <button type='submit' disabled={busy || !name.trim() || name.trim() === savedName} className={button('primary')}>
        {busy ? '変更中…' : '表示名を変更'}
      </button>
    </form>
  );
}
