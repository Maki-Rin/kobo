'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ArticleDraft } from '@/lib/editor/articles';
import { previewAction, saveArticleAction } from '../actions';
import ErrorList from './ErrorList';

interface PendingImage {
  name: string;
  file: File;
  url: string;
}

const KEEP_AS_IS_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = 3.8 * 1024 * 1024;
const MAX_EDGE = 1920;

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function prepareImage(file: File, index: number): Promise<PendingImage> {
  const stamp = `${Date.now().toString(36)}-${index}`;
  const keep =
    extensions[file.type] &&
    (file.size <= KEEP_AS_IS_BYTES || file.type === 'image/gif');
  if (keep) {
    const name = `img-${stamp}.${extensions[file.type]}`;
    const renamed = new File([file], name, { type: file.type });
    return { name, file: renamed, url: URL.createObjectURL(renamed) };
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('変換失敗'))), 'image/jpeg', 0.85)
  );
  const name = `img-${stamp}.jpg`;
  const converted = new File([blob], name, { type: 'image/jpeg' });
  return { name, file: converted, url: URL.createObjectURL(converted) };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className='block space-y-1'>
      <span className='text-sm font-bold'>{label}</span>
      {children}
      {hint && <span className='block text-xs text-slate-500'>{hint}</span>}
    </label>
  );
}

function ToolButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type='button' onClick={onClick} className='rounded px-2 py-1 hover:bg-slate-100'>
      {children}
    </button>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none';

export default function ArticleEditor({
  initial,
  isNew,
  baseSha,
  saved,
}: {
  initial: ArticleDraft;
  isNew: boolean;
  baseSha: string | null;
  saved: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [previewHtml, setPreviewHtml] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(
    saved ? '保存しました。数分でサイトに反映されます。' : ''
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const bodyImageInput = useRef<HTMLInputElement>(null);
  const coverImageInput = useRef<HTMLInputElement>(null);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial) || images.length > 0,
    [draft, initial, images]
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = <K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const imagePath = (name: string) => `/images/articles/${draft.id}/${name}`;

  const resolveSrc = (src: string) =>
    images.find((image) => imagePath(image.name) === src)?.url ?? src;

  const insert = (before: string, after = '', placeholder = '') => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    update('body', next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const addImages = async (files: FileList | null, target: 'body' | 'cover') => {
    if (!files || files.length === 0) return;
    if (isNew && !/^[a-z0-9][a-z0-9-]{1,59}$/.test(draft.id)) {
      setErrors(['画像を追加する前に「URLの名前」を決めてください']);
      return;
    }
    setErrors([]);
    try {
      const prepared = await Promise.all(
        [...files].map((file, i) => prepareImage(file, images.length + i))
      );
      setImages((current) => [...current, ...prepared]);
      if (target === 'cover') {
        update('coverImage', imagePath(prepared[0].name));
      } else {
        insert(prepared.map((image) => `\n![](${imagePath(image.name)})\n`).join(''));
      }
    } catch {
      setErrors(['画像を読み込めませんでした。JPEG・PNG・WebP・GIFを選んでください']);
    }
  };

  const showPreview = async () => {
    setTab('preview');
    const result = await previewAction(draft.body);
    if (!result.ok) return setErrors(result.errors);
    let html = result.value;
    for (const image of images) {
      html = html.replaceAll(`src="${imagePath(image.name)}"`, `src="${image.url}"`);
    }
    setPreviewHtml(html);
  };

  const save = async () => {
    const used = images.filter(
      (image) =>
        draft.body.includes(imagePath(image.name)) || draft.coverImage === imagePath(image.name)
    );
    const total = used.reduce((sum, image) => sum + image.file.size, 0);
    if (total > MAX_REQUEST_BYTES) {
      setErrors(['画像が多すぎて一度に保存できません。何枚か減らして保存し、続きはそのあと追加してください']);
      return;
    }
    setSaving(true);
    setErrors([]);
    setNotice('');
    const form = new FormData();
    form.set('draft', JSON.stringify(draft));
    form.set('isNew', String(isNew));
    if (baseSha) form.set('baseSha', baseSha);
    for (const image of used) form.append('images', image.file);
    const result = await saveArticleAction(form);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setImages([]);
    router.replace(`/admin/articles/${result.value.id}?saved=1`);
    router.refresh();
  };

  const tabClass = (active: boolean) =>
    `rounded-t-lg px-4 py-2 text-sm font-bold ${active ? 'bg-white border border-b-0 border-slate-300' : 'text-slate-500'}`;

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-2xl font-bold'>{isNew ? '新しい記事' : '記事を編集'}</h1>
        <div className='flex items-center gap-3'>
          {!isNew && draft.published && (
            <a href={`/articles/${draft.id}`} target='_blank' className='text-sm text-slate-500 hover:underline'>
              公開中のページ
            </a>
          )}
          <button
            onClick={save}
            disabled={saving}
            className='rounded-lg bg-slate-900 px-5 py-2 font-bold text-white hover:bg-slate-700 disabled:opacity-50'
          >
            {saving ? '保存中…' : '保存して公開'}
          </button>
        </div>
      </div>

      {notice && (
        <p className='rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'>{notice}</p>
      )}
      <ErrorList errors={errors} />

      <div className='grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2'>
        <div className='md:col-span-2'>
          <Field label='タイトル'>
            <input className={inputClass} value={draft.title} onChange={(e) => update('title', e.target.value)} />
          </Field>
        </div>
        {isNew ? (
          <Field label='URLの名前' hint={`半角の英小文字・数字・ハイフン。/articles/${draft.id || '○○'} になります。画像を追加すると変更できません`}>
            <input
              className={inputClass}
              value={draft.id}
              disabled={images.length > 0}
              onChange={(e) => update('id', e.target.value.toLowerCase())}
              placeholder='例: laser-cutter-basics'
            />
          </Field>
        ) : (
          <Field label='URL'>
            <p className='py-2 font-mono text-sm'>/articles/{draft.id}</p>
          </Field>
        )}
        <Field label='日付'>
          <input type='date' className={inputClass} value={draft.date} onChange={(e) => update('date', e.target.value)} />
        </Field>
        <Field label='書いた人'>
          <input className={inputClass} value={draft.authorName} onChange={(e) => update('authorName', e.target.value)} />
        </Field>
        <Field label='概要（なくてもOK）' hint='記事一覧や検索結果に出る短い説明。空なら本文の最初から作ります'>
          <input className={inputClass} value={draft.excerpt} onChange={(e) => update('excerpt', e.target.value)} />
        </Field>
        <div className='space-y-2 md:col-span-2'>
          <span className='text-sm font-bold'>カバー画像</span>
          <div className='flex flex-wrap items-center gap-4'>
            {draft.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveSrc(draft.coverImage)} alt='' className='h-24 w-40 rounded-lg object-cover' />
            )}
            <button
              type='button'
              onClick={() => coverImageInput.current?.click()}
              className='rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100'
            >
              {draft.coverImage ? 'カバー画像を変える' : 'カバー画像を選ぶ'}
            </button>
            <input
              ref={coverImageInput}
              type='file'
              accept='image/jpeg,image/png,image/webp,image/gif'
              className='hidden'
              onChange={(e) => {
                addImages(e.target.files, 'cover');
                e.target.value = '';
              }}
            />
          </div>
        </div>
        {!isNew && (
          <label className='flex items-center gap-2 text-sm md:col-span-2'>
            <input type='checkbox' checked={draft.published} onChange={(e) => update('published', e.target.checked)} />
            公開する（チェックを外して保存すると、サイトから見えなくなります。記事は消えません）
          </label>
        )}
      </div>

      <div>
        <div className='flex gap-1'>
          <button type='button' className={tabClass(tab === 'write')} onClick={() => setTab('write')}>
            本文を書く
          </button>
          <button type='button' className={tabClass(tab === 'preview')} onClick={showPreview}>
            プレビュー
          </button>
        </div>
        {tab === 'write' ? (
          <div className='rounded-b-xl rounded-tr-xl border border-slate-300 bg-white'>
            <div className='flex flex-wrap gap-1 border-b border-slate-200 p-2 text-sm'>
              <ToolButton onClick={() => insert('\n## ', '\n', '見出し')}>大見出し</ToolButton>
              <ToolButton onClick={() => insert('\n### ', '\n', '見出し')}>小見出し</ToolButton>
              <ToolButton onClick={() => insert('**', '**', '太字')}>太字</ToolButton>
              <ToolButton onClick={() => insert('[', '](https://)', 'リンクの文字')}>リンク</ToolButton>
              <ToolButton onClick={() => insert('\n- ', '\n', '項目')}>箇条書き</ToolButton>
              <ToolButton onClick={() => bodyImageInput.current?.click()}>画像</ToolButton>
              <input
                ref={bodyImageInput}
                type='file'
                multiple
                accept='image/jpeg,image/png,image/webp,image/gif'
                className='hidden'
                onChange={(e) => {
                  addImages(e.target.files, 'body');
                  e.target.value = '';
                }}
              />
            </div>
            <textarea
              ref={bodyRef}
              value={draft.body}
              onChange={(e) => update('body', e.target.value)}
              className='min-h-[60vh] w-full resize-y rounded-b-xl p-4 font-mono text-sm leading-7 focus:outline-none'
              placeholder='ここに本文を書きます。'
            />
          </div>
        ) : (
          <div className='rounded-b-xl rounded-tr-xl border border-slate-300 bg-white p-6'>
            <h1 className='mb-6 text-3xl font-bold'>{draft.title}</h1>
            <div className='article-body' dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}
      </div>

      <details className='rounded-xl border border-slate-200 bg-white p-4 text-sm'>
        <summary className='cursor-pointer font-bold'>本文の書き方</summary>
        <div className='mt-3 space-y-1 text-slate-700'>
          <p>上のボタンで記号が入ります。手で書いてもOKです。</p>
          <p><code>## 見出し</code>　<code>### 小見出し</code>　<code>**太字**</code>　<code>[文字](https://…)</code>　<code>- 箇条書き</code></p>
          <p>画像のすぐ下の行に <code>*説明文*</code> と書くと、画像の説明（キャプション）になります。</p>
          <p>URLだけを1行に書くと、リンクカードになります。</p>
          <p>大きい写真は自動で縮小されます。</p>
        </div>
      </details>
    </div>
  );
}
