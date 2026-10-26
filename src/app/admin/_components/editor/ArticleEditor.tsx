'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ArticleDraft } from '@/lib/editor/articles';
import { previewAction, saveArticleAction, uploadImageAction } from '../../actions';
import ErrorList from '../ErrorList';
import { IMAGE_ACCEPT } from './ImageDropZone';
import SettingsPanel from './SettingsPanel';
import { ImageError, imageFiles, prepareImage } from './prepareImage';

interface EditorImage {
  name: string;
  sha: string | null;
  url: string;
  status: 'uploading' | 'ready';
}

interface Autosave {
  draft: ArticleDraft;
  images: { name: string; sha: string }[];
  baseSha: string | null;
  savedAt: string;
}

const PREVIEW_DELAY = 400;
const AUTOSAVE_DELAY = 800;
const IMAGE_PATH = /^\/images\/articles\/[^/]+\/([^/]+)$/;

const autosaveKey = (isNew: boolean, id: string) => `kobo-editor:${isNew ? 'new' : id}`;

function readAutosave(key: string): Autosave | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Autosave) : null;
  } catch {
    return null;
  }
}

function writeAutosave(key: string, value: Autosave | null) {
  try {
    if (value) window.localStorage.setItem(key, JSON.stringify(value));
    else window.localStorage.removeItem(key);
  } catch {}
}

const randomId = () => Math.random().toString(36).slice(2, 8);

function ToolButton({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type='button'
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className='shrink-0 rounded px-2 py-1 hover:bg-slate-100'
    >
      {children}
    </button>
  );
}

export default function ArticleEditor({
  initial,
  isNew,
  baseSha,
  notice: initialNotice,
}: {
  initial: ArticleDraft;
  isNew: boolean;
  baseSha: string | null;
  notice: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [images, setImages] = useState<EditorImage[]>([]);
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState(initialNotice);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [restorable, setRestorable] = useState<Autosave | null>(null);
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const bodyFileInput = useRef<HTMLInputElement>(null);
  const selection = useRef<{ start: number; end: number } | null>(null);
  const dragDepth = useRef(0);
  const latestDraft = useRef(draft);
  const key = autosaveKey(isNew, initial.id);

  const uploading = images.some((image) => image.status === 'uploading') || coverUploading;
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);

  useEffect(() => {
    latestDraft.current = draft;
  }, [draft]);

  const update = useCallback(<K extends keyof ArticleDraft>(field: K, value: ArticleDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const imagePath = useCallback((name: string, id = draft.id) => `/images/articles/${id}/${name}`, [draft.id]);

  const resolveSrc = useCallback(
    (src: string) => {
      const name = src.match(IMAGE_PATH)?.[1];
      return images.find((image) => image.name === name)?.url ?? src;
    },
    [images]
  );

  useEffect(() => {
    const saved = readAutosave(key);
    if (saved && JSON.stringify(saved.draft) !== JSON.stringify(initial)) setRestorable(saved);
  }, [key, initial]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      writeAutosave(key, {
        draft,
        images: images.filter((i) => i.sha).map((i) => ({ name: i.name, sha: i.sha! })),
        baseSha,
        savedAt,
      });
      setAutosavedAt(savedAt);
    }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [draft, images, dirty, key, baseSha]);

  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading]);

  useEffect(() => {
    const block = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await previewAction(draft.body);
      if (cancelled || !result.ok) return;
      setPreviewHtml(result.value);
    }, PREVIEW_DELAY);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draft.body]);

  const renderedPreview = useMemo(
    () =>
      previewHtml.replace(/src="(\/images\/articles\/[^"]+)"/g, (_match, src: string) => `src="${resolveSrc(src)}"`),
    [previewHtml, resolveSrc]
  );

  const rememberSelection = () => {
    const textarea = bodyRef.current;
    if (textarea) selection.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
  };

  const replaceSelection = (make: (selected: string) => { text: string; select?: [number, number] }) => {
    const textarea = bodyRef.current;
    const value = draft.body;
    const { start, end } = selection.current ?? { start: value.length, end: value.length };
    const { text, select } = make(value.slice(start, end));
    update('body', value.slice(0, start) + text + value.slice(end));
    const [from, to] = select ?? [text.length, text.length];
    selection.current = { start: start + from, end: start + to };
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + from, start + to);
    });
  };

  const wrap = (before: string, after: string, placeholder: string) =>
    replaceSelection((selected) => {
      const inner = selected || placeholder;
      return { text: before + inner + after, select: [before.length, before.length + inner.length] };
    });

  const linePrefix = (prefix: string, placeholder: string) =>
    replaceSelection((selected) => {
      const value = draft.body;
      const start = selection.current?.start ?? value.length;
      const needsBreak = start > 0 && value[start - 1] !== '\n';
      const lines = (selected || placeholder).split('\n').map((line, i) =>
        prefix === '1. ' ? `${i + 1}. ${line}` : `${prefix}${line}`
      );
      const head = needsBreak ? '\n' : '';
      const text = `${head}${lines.join('\n')}\n`;
      return { text, select: [head.length + (prefix === '1. ' ? 3 : prefix.length), text.length - 1] };
    });

  const replacePlaceholder = (placeholder: string, make: (id: string) => string) => {
    const current = latestDraft.current;
    const index = current.body.indexOf(placeholder);
    if (index === -1) return;
    const replacement = make(current.id);
    const delta = replacement.length - placeholder.length;
    const caret = selection.current;
    if (caret && caret.start >= index + placeholder.length) {
      selection.current = { start: caret.start + delta, end: caret.end + delta };
    }
    const next = {
      ...current,
      body: current.body.slice(0, index) + replacement + current.body.slice(index + placeholder.length),
    };
    latestDraft.current = next;
    setDraft(next);
  };

  const uploadOne = async (file: File): Promise<EditorImage> => {
    const { blob, extension } = await prepareImage(file);
    const name = `img-${Date.now().toString(36)}${randomId()}.${extension}`;
    const form = new FormData();
    form.set('image', new File([blob], name, { type: blob.type || file.type }));
    const result = await uploadImageAction(form);
    if (!result.ok) throw new ImageError(result.errors.join(' '));
    return { name, sha: result.value.sha, url: URL.createObjectURL(blob), status: 'ready' };
  };

  const insertImages = async (files: File[]) => {
    if (files.length === 0) return;
    setErrors([]);
    const tokens = files.map(() => `uploading-${randomId()}`);
    replaceSelection((selected) => {
      const value = draft.body;
      const { start, end } = selection.current ?? { start: value.length, end: value.length };
      const before = value.slice(0, start) + selected;
      const after = value.slice(end);
      const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const trail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
      const block = tokens.map((token) => `![画像をアップロード中…](#${token})`).join('\n\n');
      const text = `${selected}${lead}${block}${trail}`;
      return { text };
    });
    setImages((current) => [
      ...current,
      ...tokens.map((token) => ({ name: token, sha: null, url: '', status: 'uploading' as const })),
    ]);

    for (const [index, file] of files.entries()) {
      const token = tokens[index];
      const placeholder = `![画像をアップロード中…](#${token})`;
      try {
        const image = await uploadOne(file);
        setImages((current) => [...current.filter((i) => i.name !== token), image]);
        replacePlaceholder(placeholder, (id) => `![](${imagePath(image.name, id)})`);
      } catch (error) {
        setImages((current) => current.filter((i) => i.name !== token));
        replacePlaceholder(`${placeholder}\n\n`, () => '');
        replacePlaceholder(placeholder, () => '');
        setErrors((current) => [
          ...current,
          error instanceof ImageError ? error.message : `「${file.name}」をアップロードできませんでした。もう一度試してください`,
        ]);
      }
    }
  };

  const setCover = async (files: File[]) => {
    const [file] = files;
    if (!file) return;
    setErrors([]);
    setCoverUploading(true);
    try {
      const image = await uploadOne(file);
      setImages((current) => [...current, image]);
      setDraft((current) => ({ ...current, coverImage: imagePath(image.name, current.id) }));
    } catch (error) {
      setErrors([error instanceof ImageError ? error.message : 'カバー画像をアップロードできませんでした。もう一度試してください']);
    } finally {
      setCoverUploading(false);
    }
  };

  const changeId = (id: string) =>
    setDraft((current) => {
      const from = `/images/articles/${current.id}/`;
      const to = `/images/articles/${id}/`;
      return {
        ...current,
        id,
        body: current.body.split(from).join(to),
        coverImage: current.coverImage.startsWith(from) ? to + current.coverImage.slice(from.length) : current.coverImage,
      };
    });

  const restore = () => {
    if (!restorable) return;
    setDraft(restorable.draft);
    setImages(restorable.images.map((image) => ({ ...image, url: `/admin/staged/${image.sha}`, status: 'ready' })));
    setRestorable(null);
  };

  const discardRestore = () => {
    writeAutosave(key, null);
    setRestorable(null);
  };

  const save = async (publish: boolean) => {
    if (uploading) {
      setErrors(['画像のアップロードが終わるまで待ってください']);
      return;
    }
    const next = { ...draft, published: publish };
    const missingSettings = publish
      ? [...(!next.coverImage ? ['カバー画像'] : []), ...(!next.authorName.trim() ? ['書いた人'] : [])]
      : [];
    if (!next.title.trim() || (publish && !next.body.trim()) || missingSettings.length > 0) {
      setHighlightMissing(true);
      setErrors([
        ...(!next.title.trim() ? ['タイトルを入れてください'] : []),
        ...(publish && !next.body.trim() ? ['本文が空です'] : []),
        ...(missingSettings.length > 0 ? [`公開するには「設定」で${missingSettings.join('と')}を入れてください`] : []),
      ]);
      if (missingSettings.length > 0) setSettingsOpen(true);
      return;
    }
    const used = images.filter(
      (image) =>
        image.sha && (next.body.includes(imagePath(image.name)) || next.coverImage === imagePath(image.name))
    );
    setSaving(true);
    setErrors([]);
    setNotice('');
    const result = await saveArticleAction({
      draft: next,
      isNew,
      baseSha,
      images: used.map((image) => ({ name: image.name, sha: image.sha! })),
    });
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    writeAutosave(key, null);
    setSettingsOpen(false);
    router.replace(`/admin/articles/${result.value.id}?saved=${publish ? 'published' : 'draft'}`);
    router.refresh();
  };

  const primaryPublish = !isNew && initial.published;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        save(primaryPublish);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const status = saving
    ? '保存中…'
    : uploading
      ? '画像をアップロード中…'
      : dirty
        ? autosavedAt
          ? '書きかけをこの端末に一時保存しました'
          : '未保存の変更があります'
        : '';

  const bodyImages = useMemo(() => {
    const names = new Set<string>();
    for (const match of draft.body.matchAll(/!\[[^\]]*\]\((\/images\/articles\/[^)\s]+)\)/g)) {
      const name = match[1].match(IMAGE_PATH)?.[1];
      if (name) names.add(name);
    }
    return [...names];
  }, [draft.body]);

  return (
    <div
      className='space-y-4'
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={() => {
        dragDepth.current = 0;
        setDragging(false);
      }}
    >
      <div className='sticky top-0 z-30 -mx-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur'>
        <Link href='/admin' className='text-sm text-slate-600 hover:underline'>
          ← 記事一覧
        </Link>
        <span className='rounded-full bg-slate-200 px-2 py-0.5 text-xs'>
          {isNew || !initial.published ? '下書き' : '公開中'}
        </span>
        <span className='min-w-0 flex-1 truncate text-xs text-slate-500' aria-live='polite'>
          {status}
        </span>
        <div className='flex items-center gap-2'>
          <div className='flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm lg:hidden'>
            {(['write', 'preview'] as const).map((mode) => (
              <button
                key={mode}
                type='button'
                onClick={() => setView(mode)}
                className={`rounded-md px-3 py-1 ${view === mode ? 'bg-slate-900 text-white' : ''}`}
              >
                {mode === 'write' ? '書く' : 'プレビュー'}
              </button>
            ))}
          </div>
          <button
            type='button'
            onClick={() => setSettingsOpen(true)}
            className='rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100'
          >
            設定
          </button>
          {!primaryPublish && (
            <button
              type='button'
              onClick={() => save(false)}
              disabled={saving}
              className='rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50'
            >
              下書き保存
            </button>
          )}
          <button
            type='button'
            onClick={() => save(true)}
            disabled={saving}
            className='rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50'
          >
            {primaryPublish ? '更新する' : '公開する'}
          </button>
        </div>
      </div>

      {restorable && (
        <div className='flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm'>
          <span className='flex-1'>
            前回の書きかけがこの端末に残っています（{new Date(restorable.savedAt).toLocaleString('ja-JP')}）。
            {restorable.baseSha !== baseSha && ' その後、記事がほかの人によって更新されています。'}
          </span>
          <button type='button' onClick={restore} className='rounded bg-slate-900 px-3 py-1 text-white'>
            書きかけを開く
          </button>
          <button type='button' onClick={discardRestore} className='rounded border border-slate-300 bg-white px-3 py-1'>
            捨てる
          </button>
        </div>
      )}
      {notice && (
        <div className='flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'>
          <span className='flex-1'>{notice}</span>
          <button type='button' onClick={() => setNotice('')} className='text-emerald-700 hover:underline'>
            閉じる
          </button>
        </div>
      )}
      <ErrorList errors={errors} />

      <input
        value={draft.title}
        onChange={(event) => update('title', event.target.value)}
        placeholder='タイトル'
        aria-label='タイトル'
        className={`w-full rounded-lg bg-transparent px-1 py-2 text-2xl font-bold placeholder:text-slate-400 focus:outline-none md:text-3xl ${
          highlightMissing && !draft.title.trim() ? 'ring-2 ring-red-300' : ''
        }`}
      />

      <div className='grid gap-4 lg:grid-cols-2'>
        <div className={`${view === 'write' ? 'block' : 'hidden'} lg:block`}>
          <div className='relative flex flex-col rounded-xl border border-slate-300 bg-white'>
            <div className='flex flex-wrap gap-1 border-b border-slate-200 p-1.5 text-sm'>
              <ToolButton onClick={() => linePrefix('## ', '見出し')} title='大きい見出し'>見出し</ToolButton>
              <ToolButton onClick={() => linePrefix('### ', '小見出し')} title='小さい見出し'>小見出し</ToolButton>
              <ToolButton onClick={() => wrap('**', '**', '太字')}><b>太字</b></ToolButton>
              <ToolButton onClick={() => wrap('[', '](https://)', 'リンクの文字')}>リンク</ToolButton>
              <ToolButton onClick={() => linePrefix('- ', '項目')}>・リスト</ToolButton>
              <ToolButton onClick={() => linePrefix('1. ', '項目')}>1. リスト</ToolButton>
              <ToolButton onClick={() => linePrefix('> ', '引用')}>引用</ToolButton>
              <button
                type='button'
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => bodyFileInput.current?.click()}
                className='ml-auto shrink-0 rounded-md border border-slate-300 px-2.5 py-1 font-bold hover:bg-slate-100'
              >
                ＋ 画像を追加
              </button>
              <input
                ref={bodyFileInput}
                type='file'
                multiple
                accept={IMAGE_ACCEPT}
                className='hidden'
                onChange={(event) => {
                  insertImages(imageFiles(event.target.files));
                  event.target.value = '';
                }}
              />
            </div>
            <textarea
              ref={bodyRef}
              value={draft.body}
              onChange={(event) => {
                update('body', event.target.value);
                selection.current = { start: event.target.selectionStart, end: event.target.selectionEnd };
              }}
              onSelect={rememberSelection}
              onKeyUp={rememberSelection}
              onClick={rememberSelection}
              onPaste={(event) => {
                const files = imageFiles(event.clipboardData.files);
                if (files.length === 0) return;
                event.preventDefault();
                rememberSelection();
                insertImages(files);
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes('Files')) event.preventDefault();
              }}
              onDrop={(event) => {
                const files = imageFiles(event.dataTransfer.files);
                if (files.length === 0) return;
                event.preventDefault();
                insertImages(files);
              }}
              placeholder={'ここに本文を書きます。\n\n画像は、ドラッグ＆ドロップ・コピーして貼り付け・「画像を追加」ボタンで入れられます。'}
              className='min-h-[60vh] w-full flex-1 resize-y p-4 font-mono text-[15px] leading-7 focus:outline-none'
            />
            <button
              type='button'
              onClick={() => {
                rememberSelection();
                bodyFileInput.current?.click();
              }}
              className='rounded-b-xl border-t border-dashed border-slate-300 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50'
            >
              <span className='hidden md:inline'>
                画像は、ここにドラッグ＆ドロップ／コピーして貼り付け（⌘V・Ctrl+V）／<span className='underline'>クリックして選ぶ</span>
              </span>
              <span className='md:hidden underline'>タップして写真を追加</span>
            </button>
            {dragging && (
              <div
                className='absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-50/90 text-lg font-bold text-blue-800'
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  dragDepth.current = 0;
                  setDragging(false);
                  insertImages(imageFiles(event.dataTransfer.files));
                }}
              >
                ここにドロップすると、カーソルの位置に画像が入ります
              </div>
            )}
          </div>
        </div>

        <div className={`${view === 'preview' ? 'block' : 'hidden'} lg:block`}>
          <div className='rounded-xl border border-slate-200 bg-white p-6 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto'>
            <p className='mb-4 text-xs font-bold text-slate-400'>プレビュー</p>
            {draft.body.trim() ? (
              <div className='article-body' dangerouslySetInnerHTML={{ __html: renderedPreview }} />
            ) : (
              <p className='text-sm text-slate-400'>本文を書くと、ここにサイトでの見え方が出ます。</p>
            )}
          </div>
        </div>
      </div>

      {(bodyImages.length > 0 || draft.coverImage) && (
        <section className='space-y-2 rounded-xl border border-slate-200 bg-white p-4'>
          <h2 className='text-sm font-bold'>この記事の画像</h2>
          <ul className='flex gap-3 overflow-x-auto pb-1'>
            {[...new Set([...(draft.coverImage ? [draft.coverImage.match(IMAGE_PATH)?.[1] ?? draft.coverImage] : []), ...bodyImages])].map(
              (name) => {
                const path = name.startsWith('/') ? name : imagePath(name);
                const isCover = draft.coverImage === path;
                return (
                  <li key={name} className='w-36 shrink-0 space-y-1 text-xs'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveSrc(path)} alt='' className='h-24 w-36 rounded-lg border border-slate-200 object-cover' />
                    {isCover ? (
                      <p className='font-bold text-slate-600'>カバー画像</p>
                    ) : (
                      <button type='button' onClick={() => update('coverImage', path)} className='text-slate-600 underline'>
                        カバーにする
                      </button>
                    )}
                  </li>
                );
              }
            )}
          </ul>
        </section>
      )}

      <details className='rounded-xl border border-slate-200 bg-white p-4 text-sm'>
        <summary className='cursor-pointer font-bold'>本文の書き方</summary>
        <div className='mt-3 space-y-1 text-slate-700'>
          <p>上のボタンで記号が入ります。手で書いてもOKです。</p>
          <p>
            <code>## 見出し</code>　<code>### 小見出し</code>　<code>**太字**</code>　<code>[文字](https://…)</code>　<code>- リスト</code>
          </p>
          <p>
            画像のすぐ下の行に <code>*説明文*</code> と書くと、画像の説明（キャプション）になります。
          </p>
          <p>URLだけを1行に書くと、リンクカードになります。</p>
          <p>スマホの写真など大きい画像は、自動で縮小されます。⌘S（Ctrl+S）でも保存できます。</p>
        </div>
      </details>

      {settingsOpen && (
        <SettingsPanel
          draft={draft}
          isNew={isNew}
          wasPublished={primaryPublish}
          coverSrc={draft.coverImage ? resolveSrc(draft.coverImage) : null}
          coverChoices={bodyImages.map((name) => ({ path: imagePath(name), src: resolveSrc(imagePath(name)) }))}
          onCoverChoice={(path) => update('coverImage', path)}
          coverUploading={coverUploading}
          highlightMissing={highlightMissing}
          onChange={update}
          onIdChange={changeId}
          onCoverFiles={setCover}
          onUnpublish={() => save(false)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
