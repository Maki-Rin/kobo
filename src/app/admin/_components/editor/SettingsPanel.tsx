'use client';

import { useState } from 'react';
import type { ArticleDraft } from '@/lib/editor/articles';
import ImageDropZone from './ImageDropZone';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none';

function Field({
  label,
  hint,
  missing,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  missing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-2 text-sm font-bold'>
        {label}
        {missing && <span className='rounded bg-red-100 px-1.5 text-xs font-normal text-red-800'>公開に必要</span>}
      </div>
      {children}
      {hint && <p className='text-xs text-slate-500'>{hint}</p>}
    </div>
  );
}

export default function SettingsPanel({
  draft,
  isNew,
  wasPublished,
  coverSrc,
  coverUploading,
  coverChoices,
  onCoverChoice,
  highlightMissing,
  onChange,
  onIdChange,
  onCoverFiles,
  onUnpublish,
  onClose,
}: {
  draft: ArticleDraft;
  isNew: boolean;
  wasPublished: boolean;
  coverSrc: string | null;
  coverUploading: boolean;
  coverChoices: { path: string; src: string }[];
  onCoverChoice: (path: string) => void;
  highlightMissing: boolean;
  onChange: <K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) => void;
  onIdChange: (id: string) => void;
  onCoverFiles: (files: File[]) => void;
  onUnpublish: () => void;
  onClose: () => void;
}) {
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  return (
    <div className='fixed inset-0 z-40 flex justify-end' role='dialog' aria-modal='true' aria-label='記事の設定'>
      <button type='button' aria-label='閉じる' className='absolute inset-0 bg-slate-900/30' onClick={onClose} />
      <aside className='relative flex h-full w-full max-w-md flex-col bg-white shadow-xl'>
        <div className='flex items-center justify-between border-b border-slate-200 px-5 py-3'>
          <h2 className='font-bold'>記事の設定</h2>
          <button type='button' onClick={onClose} className='rounded px-2 py-1 text-sm hover:bg-slate-100'>
            閉じる
          </button>
        </div>
        <div className='flex-1 space-y-6 overflow-y-auto px-5 py-5'>
          <Field label='カバー画像' missing={highlightMissing && !draft.coverImage} hint='記事一覧やSNSでシェアされたときに出る画像です。横長がおすすめ。'>
            <ImageDropZone onFiles={onCoverFiles} label='カバー画像を選ぶ' className='overflow-hidden'>
              {coverSrc ? (
                <div className='relative'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverSrc} alt='' className='aspect-[1200/630] w-full object-cover' />
                  <span className='absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-xs shadow'>
                    {coverUploading ? 'アップロード中…' : 'クリックかドロップで変更'}
                  </span>
                </div>
              ) : (
                <div className='flex aspect-[1200/630] flex-col items-center justify-center gap-1 p-4 text-center text-sm text-slate-600'>
                  <span className='text-2xl' aria-hidden='true'>＋</span>
                  {coverUploading ? 'アップロード中…' : 'クリックして選ぶか、ここに画像をドロップ'}
                </div>
              )}
            </ImageDropZone>
            {coverChoices.length > 0 && (
              <div className='space-y-1 pt-2'>
                <p className='text-xs text-slate-500'>本文の画像から選ぶ</p>
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {coverChoices.map((choice) => (
                    <button
                      key={choice.path}
                      type='button'
                      onClick={() => onCoverChoice(choice.path)}
                      className={`shrink-0 overflow-hidden rounded-lg border-2 ${draft.coverImage === choice.path ? 'border-slate-900' : 'border-transparent hover:border-slate-400'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={choice.src} alt='' className='h-14 w-24 object-cover' />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>

          <Field label='書いた人' missing={highlightMissing && !draft.authorName.trim()}>
            <input className={inputClass} value={draft.authorName} onChange={(e) => onChange('authorName', e.target.value)} />
          </Field>

          <Field label='日付'>
            <input type='date' className={inputClass} value={draft.date} onChange={(e) => onChange('date', e.target.value)} />
          </Field>

          <Field label='概要（なくてもOK）' hint={`記事一覧や検索結果に出る説明です。空なら本文の最初から作ります（${draft.excerpt.length}/200文字）`}>
            <textarea
              rows={3}
              className={inputClass}
              value={draft.excerpt}
              maxLength={200}
              onChange={(e) => onChange('excerpt', e.target.value)}
            />
          </Field>

          <Field
            label='URL'
            hint={isNew ? '自動で決まっています。英語にしておくと覚えやすくなります（半角の英小文字・数字・ハイフン）。公開後は変えられません。' : '公開後は変えられません。'}
          >
            <div className='flex items-center gap-1 font-mono text-sm'>
              <span className='text-slate-500'>/articles/</span>
              {isNew ? (
                <input
                  className={`${inputClass} font-mono`}
                  value={draft.id}
                  onChange={(e) => onIdChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              ) : (
                <span>{draft.id}</span>
              )}
            </div>
          </Field>

          {wasPublished && (
            <div className='space-y-2 rounded-lg border border-slate-200 p-4'>
              <p className='text-sm font-bold'>公開をやめる</p>
              <p className='text-xs text-slate-500'>サイトから見えなくなり、下書きに戻ります。記事は消えません。</p>
              {confirmUnpublish ? (
                <div className='flex gap-2'>
                  <button type='button' onClick={onUnpublish} className='rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700'>
                    下書きに戻す
                  </button>
                  <button type='button' onClick={() => setConfirmUnpublish(false)} className='rounded border border-slate-300 px-3 py-1.5 text-sm'>
                    やめる
                  </button>
                </div>
              ) : (
                <button
                  type='button'
                  onClick={() => setConfirmUnpublish(true)}
                  className='rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50'
                >
                  下書きに戻す…
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
