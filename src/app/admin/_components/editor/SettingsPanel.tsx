'use client';

import { useState } from 'react';
import type { ArticleDraft } from '@/lib/editor/articles';
import { badge, button, input, textarea } from '../ui';
import ImageDropZone from './ImageDropZone';

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
    <div className='space-y-2'>
      <div className='flex items-center gap-2 text-sm font-bold'>
        {label}
        {missing && <span className={`${badge} bg-red-100 text-red-800`}>公開に必要</span>}
      </div>
      {children}
      {hint && <p className='text-xs leading-5 text-slate-500'>{hint}</p>}
    </div>
  );
}

export default function SettingsPanel({
  draft,
  isNew,
  wasPublished,
  coverSrc,
  coverChoices,
  onCoverChoice,
  coverUploading,
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
  coverChoices: { path: string; src: string }[];
  onCoverChoice: (path: string) => void;
  coverUploading: boolean;
  highlightMissing: boolean;
  onChange: <K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) => void;
  onIdChange: (id: string) => void;
  onCoverFiles: (files: File[]) => void;
  onUnpublish: () => void;
  onClose: () => void;
}) {
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  return (
    <div className='fixed inset-0 z-50 flex justify-end' role='dialog' aria-modal='true' aria-label='記事の設定'>
      <button type='button' aria-label='閉じる' className='absolute inset-0 bg-slate-900/30' onClick={onClose} />
      <aside className='relative flex h-full w-full max-w-md flex-col bg-white shadow-xl'>
        <div className='flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-5'>
          <h2 className='font-bold'>記事の設定</h2>
          <button type='button' onClick={onClose} className={button('ghost', 'sm')}>
            閉じる
          </button>
        </div>
        <div className='flex-1 space-y-7 overflow-y-auto px-5 py-6'>
          <Field
            label='カバー画像'
            missing={highlightMissing && !draft.coverImage}
            hint='記事一覧やSNSでシェアされたときに出る画像です。横長がおすすめ。'
          >
            <ImageDropZone onFiles={onCoverFiles} label='カバー画像を選ぶ' className='overflow-hidden'>
              {coverSrc ? (
                <div className='relative'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverSrc} alt='' className='aspect-[1200/630] w-full object-cover' />
                  <span className='absolute bottom-2 right-2 rounded-md bg-white/90 px-2 py-1 text-xs shadow-sm'>
                    {coverUploading ? 'アップロード中…' : 'クリックかドロップで変更'}
                  </span>
                </div>
              ) : (
                <div className='flex aspect-[1200/630] flex-col items-center justify-center gap-1.5 p-4 text-center text-sm text-slate-600'>
                  <span className='text-2xl leading-none text-slate-400' aria-hidden='true'>＋</span>
                  {coverUploading ? 'アップロード中…' : 'クリックして選ぶか、ここに画像をドロップ'}
                </div>
              )}
            </ImageDropZone>
            {coverChoices.length > 0 && (
              <div className='space-y-1.5'>
                <p className='text-xs text-slate-500'>本文の画像から選ぶ</p>
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {coverChoices.map((choice) => (
                    <button
                      key={choice.path}
                      type='button'
                      onClick={() => onCoverChoice(choice.path)}
                      aria-pressed={draft.coverImage === choice.path}
                      className={`shrink-0 overflow-hidden rounded-md ring-2 ring-offset-1 ${
                        draft.coverImage === choice.path ? 'ring-slate-900' : 'ring-transparent hover:ring-slate-300'
                      }`}
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
            <input className={input} value={draft.authorName} onChange={(e) => onChange('authorName', e.target.value)} />
          </Field>

          <Field label='日付'>
            <input type='date' className={input} value={draft.date} onChange={(e) => onChange('date', e.target.value)} />
          </Field>

          <Field
            label='概要（なくてもOK）'
            hint={`記事一覧や検索結果に出る説明です。空なら本文の最初から作ります（${draft.excerpt.length}/200文字）`}
          >
            <textarea
              rows={3}
              className={textarea}
              value={draft.excerpt}
              maxLength={200}
              onChange={(e) => onChange('excerpt', e.target.value)}
            />
          </Field>

          <Field
            label='URL'
            hint={
              isNew
                ? '自動で決まっています。英語にしておくと覚えやすくなります（半角の英小文字・数字・ハイフン）。公開後は変えられません。'
                : '公開後は変えられません。'
            }
          >
            <div className='flex items-center gap-1.5 font-mono text-sm'>
              <span className='shrink-0 text-slate-500'>/articles/</span>
              {isNew ? (
                <input
                  className={`${input} font-mono`}
                  value={draft.id}
                  onChange={(e) => onIdChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              ) : (
                <span>{draft.id}</span>
              )}
            </div>
          </Field>

          {wasPublished && (
            <div className='space-y-3 rounded-lg border border-slate-200 p-4'>
              <div>
                <p className='text-sm font-bold'>公開をやめる</p>
                <p className='mt-1 text-xs leading-5 text-slate-500'>サイトから見えなくなり、下書きに戻ります。記事は消えません。</p>
              </div>
              {confirmUnpublish ? (
                <div className='flex gap-2'>
                  <button type='button' onClick={() => setConfirmUnpublish(false)} className={button('secondary', 'sm')}>
                    やめる
                  </button>
                  <button type='button' onClick={onUnpublish} className={button('danger', 'sm')}>
                    下書きに戻す
                  </button>
                </div>
              ) : (
                <button type='button' onClick={() => setConfirmUnpublish(true)} className={button('dangerOutline', 'sm')}>
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
