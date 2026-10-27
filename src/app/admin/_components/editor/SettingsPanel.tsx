'use client';

import { useState } from 'react';
import machines from '@/content/machines.json';
import { isPastEvent, type Entry } from '@/lib/content-schema';
import { badge, button, input, select, textarea } from '../ui';
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

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className='inline-flex h-9 rounded-md border border-slate-300 bg-white p-0.5'>
      {options.map(([option, label]) => (
        <button
          key={option}
          type='button'
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`rounded-[5px] px-3 text-sm ${value === option ? 'bg-slate-900 font-medium text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export interface EventOption {
  id: string;
  title: string;
  date: string;
}

export default function SettingsPanel({
  draft,
  isNew,
  wasPublished,
  resolveSrc,
  coverChoices,
  uploading,
  highlightMissing,
  eventOptions,
  onChange,
  onIdChange,
  onCoverFiles,
  onGalleryFiles,
  onUnpublish,
  onClose,
}: {
  draft: Entry;
  isNew: boolean;
  wasPublished: boolean;
  resolveSrc: (src: string) => string;
  coverChoices: { path: string; src: string }[];
  uploading: boolean;
  highlightMissing: boolean;
  eventOptions: EventOption[];
  onChange: <K extends keyof Entry>(key: K, value: Entry[K]) => void;
  onIdChange: (id: string) => void;
  onCoverFiles: (files: File[]) => void;
  onGalleryFiles: (files: File[]) => void;
  onUnpublish: () => void;
  onClose: () => void;
}) {
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const { collection } = draft;
  const coverLabel = collection === 'events' ? '告知画像（チラシなど）' : 'カバー画像';
  const personLabel = collection === 'works' ? '作った人' : '書いた人';
  const toggleMachine = (slug: string) =>
    onChange(
      'machines',
      draft.machines.includes(slug) ? draft.machines.filter((item) => item !== slug) : [...draft.machines, slug]
    );
  const moveImage = (index: number, delta: number) => {
    const next = [...draft.images];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange('images', next);
  };

  return (
    <div className='fixed inset-0 z-50 flex justify-end' role='dialog' aria-modal='true' aria-label='設定'>
      <button type='button' aria-label='閉じる' className='absolute inset-0 bg-slate-900/30' onClick={onClose} />
      <aside className='relative flex h-full w-full max-w-md flex-col bg-white shadow-xl'>
        <div className='flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-5'>
          <h2 className='font-bold'>設定</h2>
          <button type='button' onClick={onClose} className={button('ghost', 'sm')}>
            閉じる
          </button>
        </div>
        <div className='flex-1 space-y-7 overflow-y-auto px-5 py-6'>
          {collection === 'articles' && (
            <Field label='種類' hint='ガイド: 使い方を順番に説明するもの。テック: 使ってみて分かったこと、検証、トラブルの対処など。'>
              <Segmented
                value={draft.type}
                options={[
                  ['guide', 'ガイド'],
                  ['tech', 'テック'],
                ]}
                onChange={(value) => onChange('type', value)}
              />
            </Field>
          )}

          {collection === 'events' && (
            <>
              <Field label='開催日'>
                <input type='date' className={input} value={draft.date} onChange={(e) => onChange('date', e.target.value)} />
              </Field>
              <Field label='時間'>
                <div className='flex items-center gap-2'>
                  <input type='time' className={input} value={draft.startTime} onChange={(e) => onChange('startTime', e.target.value)} />
                  <span className='text-slate-500'>〜</span>
                  <input type='time' className={input} value={draft.endTime} onChange={(e) => onChange('endTime', e.target.value)} />
                </div>
              </Field>
              <Field label='場所'>
                <input className={input} value={draft.place} placeholder='例: H棟1F テラスゲート前' onChange={(e) => onChange('place', e.target.value)} />
              </Field>
              <Field label='定員（なくてもOK）'>
                <input className={input} value={draft.capacity} placeholder='例: 10名' onChange={(e) => onChange('capacity', e.target.value)} />
              </Field>
              <Field label='申し込みリンク（なくてもOK）' hint='Googleフォームなど。空なら申し込みボタンは出ません。'>
                <input className={input} value={draft.applyUrl} placeholder='https://' onChange={(e) => onChange('applyUrl', e.target.value)} />
              </Field>
              {isPastEvent(draft) && (
                <Field label='参加人数（開催後）'>
                  <input className={input} value={draft.participants} placeholder='例: 23名' onChange={(e) => onChange('participants', e.target.value)} />
                </Field>
              )}
            </>
          )}

          <Field
            label={coverLabel}
            missing={highlightMissing && collection !== 'events' && !draft.coverImage}
            hint={collection === 'events' ? 'イベント一覧と告知に出ます。縦長のチラシでも大丈夫です。' : '一覧やSNSでシェアされたときに出る画像です。横長がおすすめ。'}
          >
            <ImageDropZone onFiles={onCoverFiles} label={`${coverLabel}を選ぶ`} className='overflow-hidden'>
              {draft.coverImage ? (
                <div className='relative'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveSrc(draft.coverImage)}
                    alt=''
                    className={`w-full ${collection === 'events' ? 'max-h-80 bg-slate-100 object-contain' : 'aspect-[1200/630] object-cover'}`}
                  />
                  <span className='absolute bottom-2 right-2 rounded-md bg-white/90 px-2 py-1 text-xs shadow-sm'>
                    {uploading ? 'アップロード中…' : 'クリックかドロップで変更'}
                  </span>
                </div>
              ) : (
                <div className='flex aspect-[1200/630] flex-col items-center justify-center gap-1.5 p-4 text-center text-sm text-slate-600'>
                  <span className='text-2xl leading-none text-slate-400' aria-hidden='true'>＋</span>
                  {uploading ? 'アップロード中…' : 'クリックして選ぶか、ここに画像をドロップ'}
                </div>
              )}
            </ImageDropZone>
            {coverChoices.length > 0 && (
              <div className='space-y-1.5'>
                <p className='text-xs text-slate-500'>入っている画像から選ぶ</p>
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {coverChoices.map((choice) => (
                    <button
                      key={choice.path}
                      type='button'
                      onClick={() => onChange('coverImage', choice.path)}
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

          {collection === 'works' && (
            <>
              <Field label='写真' hint='作品ページに大きく並びます。最初の1枚が一番上です。'>
                {draft.images.length > 0 && (
                  <ul className='grid grid-cols-3 gap-2'>
                    {draft.images.map((image, index) => (
                      <li key={image} className='relative overflow-hidden rounded-md bg-slate-100'>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveSrc(image)} alt='' className='aspect-square w-full object-cover' />
                        <div className='absolute inset-x-0 bottom-0 flex justify-between bg-white/90 px-1 py-0.5 text-xs'>
                          <button type='button' disabled={index === 0} onClick={() => moveImage(index, -1)} className='px-1 disabled:opacity-30' aria-label='前へ'>
                            ←
                          </button>
                          <button
                            type='button'
                            onClick={() => onChange('images', draft.images.filter((item) => item !== image))}
                            className='px-1 text-red-700'
                          >
                            外す
                          </button>
                          <button
                            type='button'
                            disabled={index === draft.images.length - 1}
                            onClick={() => moveImage(index, 1)}
                            className='px-1 disabled:opacity-30'
                            aria-label='後ろへ'
                          >
                            →
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <ImageDropZone onFiles={onGalleryFiles} label='写真を追加' multiple className='p-4 text-center text-sm text-slate-600'>
                  {uploading ? 'アップロード中…' : '＋ 写真を追加（クリックかドロップ、何枚でも）'}
                </ImageDropZone>
              </Field>
              <Field label='状態'>
                <Segmented
                  value={draft.status}
                  options={[
                    ['done', '完成'],
                    ['wip', '制作中'],
                  ]}
                  onChange={(value) => onChange('status', value)}
                />
              </Field>
              <Field label='難易度（なくてもOK）'>
                <select className={`${select} w-full`} value={draft.difficulty} onChange={(e) => onChange('difficulty', e.target.value)}>
                  <option value=''>選ばない</option>
                  <option value='はじめてでもOK'>はじめてでもOK</option>
                  <option value='少し慣れてから'>少し慣れてから</option>
                  <option value='じっくり取り組む'>じっくり取り組む</option>
                </select>
              </Field>
              <Field label='かかった時間（なくてもOK）'>
                <input className={input} value={draft.duration} placeholder='例: 造形3時間＋仕上げ1時間' onChange={(e) => onChange('duration', e.target.value)} />
              </Field>
              {eventOptions.length > 0 && (
                <Field label='関連イベント（なくてもOK）' hint='イベントでつくった作品なら選ぶと、イベントのページにも出ます。'>
                  <select className={`${select} w-full`} value={draft.event} onChange={(e) => onChange('event', e.target.value)}>
                    <option value=''>なし</option>
                    {eventOptions.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.date} {event.title}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </>
          )}

          {collection !== 'events' && (
            <>
              <Field label={personLabel} missing={highlightMissing && !draft.authorName.trim()}>
                <input className={input} value={draft.authorName} onChange={(e) => onChange('authorName', e.target.value)} />
              </Field>
              <Field label='日付'>
                <input type='date' className={input} value={draft.date} onChange={(e) => onChange('date', e.target.value)} />
              </Field>
            </>
          )}

          <Field label='使った機材' hint='同じ機材の記事・作品・イベントがつながって表示されます。'>
            <div className='flex flex-wrap gap-2'>
              {machines.map((machine) => (
                <label
                  key={machine.slug}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                    draft.machines.includes(machine.slug) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type='checkbox'
                    className='sr-only'
                    checked={draft.machines.includes(machine.slug)}
                    onChange={() => toggleMachine(machine.slug)}
                  />
                  {machine.name}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label='概要（なくてもOK）'
            hint={`一覧や検索結果に出る説明です。空なら本文の最初から作ります（${draft.excerpt.length}/200文字）`}
          >
            <textarea rows={3} className={textarea} value={draft.excerpt} maxLength={200} onChange={(e) => onChange('excerpt', e.target.value)} />
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
              <span className='shrink-0 text-slate-500'>/{collection}/</span>
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
                <p className='mt-1 text-xs leading-5 text-slate-500'>サイトから見えなくなり、下書きに戻ります。消えはしません。</p>
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
