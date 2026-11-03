'use client';

import { useEffect, useState } from 'react';
import { collectionLabels, type Entry } from '@/lib/content-schema';
import { publishChecks, publishPlaces } from '@/lib/editor/publish-checks';
import { button } from '../ui';

export default function PublishDialog({
  draft,
  updating,
  firstPublish,
  busy,
  onOpenSettings,
  onPublish,
  onClose,
}: {
  draft: Entry;
  updating: boolean;
  firstPublish: boolean;
  busy: boolean;
  onOpenSettings: () => void;
  onPublish: () => void;
  onClose: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const checks = publishChecks(draft);
  const blockers = checks.filter((check) => check.level === 'block');
  const warnings = checks.filter((check) => check.level === 'warn');
  const label = collectionLabels[draft.collection];
  const canPublish = blockers.length === 0 && (warnings.length === 0 || acknowledged) && !busy;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role='dialog' aria-modal='true' aria-labelledby='publish-title' className='w-full max-w-lg rounded-xl bg-white shadow-xl'>
        <div className='border-b border-slate-200 px-5 py-4'>
          <h2 id='publish-title' className='text-base font-bold'>
            {updating ? `公開中の${label}を更新する前に確認` : `${label}を公開する前に確認`}
          </h2>
        </div>

        <div className='max-h-[65vh] space-y-5 overflow-y-auto px-5 py-4 text-sm'>
          <dl className='space-y-3'>
            <div>
              <dt className='text-xs font-bold text-slate-500'>タイトル</dt>
              <dd className='mt-0.5 font-medium'>{draft.title || '（未入力）'}</dd>
            </div>
            <div>
              <dt className='text-xs font-bold text-slate-500'>URL</dt>
              <dd className='mt-0.5 font-mono'>
                /{draft.collection}/{draft.id}
              </dd>
              {firstPublish && <dd className='mt-1 text-xs text-amber-800'>公開するとURLは変えられなくなります。</dd>}
            </div>
            <div>
              <dt className='text-xs font-bold text-slate-500'>載る場所</dt>
              <dd className='mt-0.5'>{publishPlaces(draft).join('・')}</dd>
            </div>
          </dl>

          {blockers.length > 0 && (
            <section className='rounded-lg border border-red-200 bg-red-50 p-3'>
              <p className='font-bold text-red-800'>このままでは公開できません</p>
              <ul className='mt-2 list-disc space-y-1 pl-5 text-red-800'>
                {blockers.map((check) => (
                  <li key={check.message}>{check.message}</li>
                ))}
              </ul>
            </section>
          )}

          {warnings.length > 0 && (
            <section className='rounded-lg border border-amber-200 bg-amber-50 p-3'>
              <p className='font-bold text-amber-900'>確認してください</p>
              <ul className='mt-2 list-disc space-y-1 pl-5 text-amber-900'>
                {warnings.map((check) => (
                  <li key={check.message}>{check.message}</li>
                ))}
              </ul>
              {blockers.length === 0 && (
                <label className='mt-3 flex items-center gap-2 font-medium text-amber-900'>
                  <input type='checkbox' checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
                  確認したので、このまま公開する
                </label>
              )}
            </section>
          )}

          {checks.length === 0 && <p className='text-emerald-800'>足りないところはありません。</p>}
        </div>

        <div className='flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-3'>
          <button
            type='button'
            className={`${button('ghost', 'sm')} mr-auto`}
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
          >
            設定を開く
          </button>
          <button type='button' className={button('secondary', 'sm')} onClick={onClose}>
            戻る
          </button>
          <button type='button' className={button('primary', 'sm')} disabled={!canPublish} onClick={onPublish}>
            {busy ? '保存中…' : updating ? '更新を確定' : '公開する'}
          </button>
        </div>
      </div>
    </div>
  );
}
