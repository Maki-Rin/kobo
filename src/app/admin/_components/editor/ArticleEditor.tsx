'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ArticleDraft } from '@/lib/editor/articles';
import { previewAction, saveArticleAction, uploadImageAction } from '../../actions';
import { badge, button, fontFamily } from '../ui';
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

type View = 'write' | 'split' | 'preview';

const PREVIEW_DELAY = 300;
const AUTOSAVE_DELAY = 800;
const IMAGE_PATH = /^\/images\/articles\/[^/]+\/([^/]+)$/;
const SPLIT_KEY = 'kobo-editor:split';

const autosaveKey = (isNew: boolean, id: string) => `kobo-editor:${isNew ? 'new' : id}`;

function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const randomId = () => Math.random().toString(36).slice(2, 8);

const dateFormatter = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

function ToolButton({ onClick, children, label }: { onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type='button'
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`${button('ghost', 'sm')} px-2`}
    >
      {children}
    </button>
  );
}

function Banner({
  tone,
  children,
  onClose,
}: {
  tone: 'amber' | 'emerald' | 'red';
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    red: 'border-red-200 bg-red-50 text-red-900',
  };
  return (
    <div role={tone === 'red' ? 'alert' : 'status'} className={`flex items-start gap-3 border-b px-4 py-2.5 text-sm ${tones[tone]}`}>
      <div className='min-w-0 flex-1 leading-6'>{children}</div>
      {onClose && (
        <button type='button' onClick={onClose} className={`${button('ghost', 'sm')} -my-1 h-7`}>
          閉じる
        </button>
      )}
    </div>
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
  const [view, setView] = useState<View>('split');
  const [split, setSplit] = useState(50);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState(initialNotice);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [restorable, setRestorable] = useState<Autosave | null>(null);
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);
  const [caretLine, setCaretLine] = useState(1);

  const mainRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const bodyFileInput = useRef<HTMLInputElement>(null);
  const selection = useRef<{ start: number; end: number } | null>(null);
  const dragDepth = useRef(0);
  const latestDraft = useRef(draft);
  const key = autosaveKey(isNew, initial.id);

  const uploading = images.some((image) => image.status === 'uploading') || coverUploading;
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  const primaryPublish = !isNew && initial.published;

  useEffect(() => {
    latestDraft.current = draft;
  }, [draft]);

  useEffect(() => {
    const saved = readStorage<number>(SPLIT_KEY);
    if (saved) setSplit(saved);
    if (window.matchMedia('(max-width: 767px)').matches) setView('write');
  }, []);

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
    const saved = readStorage<Autosave>(key);
    if (saved && JSON.stringify(saved.draft) !== JSON.stringify(initial)) setRestorable(saved);
  }, [key, initial]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      writeStorage(key, {
        draft,
        images: images.filter((i) => i.sha).map((i) => ({ name: i.name, sha: i.sha! })),
        baseSha,
        savedAt,
      } satisfies Autosave);
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
      if (!cancelled && result.ok) setPreviewHtml(result.value);
    }, PREVIEW_DELAY);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draft.body]);

  const renderedPreview = useMemo(
    () => previewHtml.replace(/src="(\/images\/articles\/[^"]+)"/g, (_m, src: string) => `src="${resolveSrc(src)}"`),
    [previewHtml, resolveSrc]
  );

  useEffect(() => {
    const pane = previewRef.current;
    if (!pane) return;
    const blocks = [...pane.querySelectorAll<HTMLElement>('[data-line]')];
    const target = blocks.filter((block) => Number(block.dataset.line) <= caretLine).pop();
    if (!target) return;
    const paneRect = pane.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (rect.top < paneRect.top + 40 || rect.top > paneRect.bottom - 80) {
      pane.scrollTo({ top: pane.scrollTop + rect.top - paneRect.top - paneRect.height * 0.3, behavior: 'smooth' });
    }
  }, [caretLine, renderedPreview]);

  const trackCaret = () => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    selection.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
    setCaretLine(textarea.value.slice(0, textarea.selectionStart).split('\n').length);
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
      const head = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
      const numbered = prefix === '1. ';
      const lines = (selected || placeholder).split('\n').map((line, i) => (numbered ? `${i + 1}. ${line}` : `${prefix}${line}`));
      const text = `${head}${lines.join('\n')}\n`;
      return { text, select: [head.length + prefix.length, text.length - 1] };
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
    if (view === 'preview') setView('split');
    const tokens = files.map(() => `uploading-${randomId()}`);
    replaceSelection((selected) => {
      const value = draft.body;
      const { start, end } = selection.current ?? { start: value.length, end: value.length };
      const before = value.slice(0, start) + selected;
      const after = value.slice(end);
      const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const trail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
      const block = tokens.map((token) => `![画像をアップロード中…](#${token})`).join('\n\n');
      return { text: `${selected}${lead}${block}${trail}` };
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
      (image) => image.sha && (next.body.includes(imagePath(image.name)) || next.coverImage === imagePath(image.name))
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
    writeStorage(key, null);
    setSettingsOpen(false);
    router.replace(`/admin/articles/${result.value.id}?saved=${publish ? 'published' : 'draft'}`);
    router.refresh();
  };

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

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const main = mainRef.current;
    if (!main) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = main.getBoundingClientRect();
    const move = (moveEvent: PointerEvent) => {
      const ratio = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(75, Math.max(25, Math.round(ratio))));
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      setSplit((value) => {
        writeStorage(SPLIT_KEY, value);
        return value;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  };

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

  const viewOptions: { value: View; label: string; desktopOnly?: boolean }[] = [
    { value: 'write', label: '書く' },
    { value: 'split', label: '左右', desktopOnly: true },
    { value: 'preview', label: 'プレビュー' },
  ];

  return (
    <div className='fixed inset-0 z-40 flex flex-col bg-slate-50 text-slate-900 antialiased' style={{ fontFamily }}>
      <header className='flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-3 py-2.5 md:h-14 md:flex-nowrap md:py-0'>
        <Link href='/admin' className={`${button('ghost', 'sm')} px-2`} aria-label='記事一覧に戻る'>
          ← <span className='hidden sm:inline'>記事一覧</span>
        </Link>
        <input
          value={draft.title}
          onChange={(event) => update('title', event.target.value)}
          placeholder='タイトルを入力'
          aria-label='タイトル'
          className={`h-9 min-w-0 flex-1 rounded-md border border-transparent px-2.5 text-base font-bold placeholder:font-normal placeholder:text-slate-400 hover:border-slate-200 focus:border-slate-400 focus:outline-none md:max-w-xl ${
            highlightMissing && !draft.title.trim() ? 'border-red-300 bg-red-50' : ''
          }`}
        />
        <span className={`${badge} ${primaryPublish ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
          {primaryPublish ? '公開中' : '下書き'}
        </span>
        <span className='hidden min-w-0 flex-1 truncate text-xs text-slate-500 lg:block' aria-live='polite'>
          {status}
        </span>
        <div className='flex w-full items-center gap-2 md:w-auto'>
          <div className='flex h-9 rounded-md border border-slate-300 bg-white p-0.5' role='group' aria-label='表示'>
            {viewOptions.map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() => setView(option.value)}
                aria-pressed={view === option.value}
                className={`${option.desktopOnly ? 'hidden md:block' : ''} whitespace-nowrap rounded-[5px] px-2 text-sm sm:px-3 ${
                  view === option.value ? 'bg-slate-900 font-medium text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className='ml-auto flex items-center gap-2'>
            <button type='button' onClick={() => setSettingsOpen(true)} className={`${button('secondary')} max-sm:px-2.5`} aria-label='記事の設定'>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                <path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' />
                <circle cx='12' cy='12' r='3' />
              </svg>
              <span className='hidden sm:inline'>設定</span>
            </button>
            {!primaryPublish && (
              <button type='button' onClick={() => save(false)} disabled={saving} className={`${button('secondary')} max-sm:px-3`}>
                <span className='sm:hidden'>下書き</span>
                <span className='hidden sm:inline'>下書き保存</span>
              </button>
            )}
            <button type='button' onClick={() => save(true)} disabled={saving} className={`${button('primary')} max-sm:px-3`}>
              {saving ? '保存中…' : primaryPublish ? '更新する' : '公開する'}
            </button>
          </div>
        </div>
      </header>

      {restorable && (
        <Banner tone='amber'>
          <span>
            前回の書きかけがこの端末に残っています（{new Date(restorable.savedAt).toLocaleString('ja-JP')}）。
            {restorable.baseSha !== baseSha && 'その後、記事はほかの人によって更新されています。'}
          </span>
          <span className='ml-3 inline-flex gap-2 align-middle'>
            <button type='button' onClick={restore} className={`${button('primary', 'sm')} h-7`}>
              書きかけを開く
            </button>
            <button
              type='button'
              onClick={() => {
                writeStorage(key, null);
                setRestorable(null);
              }}
              className={`${button('secondary', 'sm')} h-7`}
            >
              捨てる
            </button>
          </span>
        </Banner>
      )}
      {notice && (
        <Banner tone='emerald' onClose={() => setNotice('')}>
          {notice}
        </Banner>
      )}
      {errors.length > 0 && (
        <Banner tone='red' onClose={() => setErrors([])}>
          {errors.length === 1 ? errors[0] : (
            <ul className='list-disc pl-5'>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </Banner>
      )}

      <div
        ref={mainRef}
        className='flex min-h-0 flex-1'
        style={{ '--split': `${split}%` } as React.CSSProperties}
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
        <section
          aria-label='本文'
          className={`relative min-w-0 flex-col overflow-hidden bg-white ${view === 'preview' ? 'hidden' : 'flex'} ${
            view === 'split' ? 'w-full md:w-[var(--split)] md:shrink-0' : 'w-full'
          }`}
        >
          <div className='flex min-h-11 shrink-0 flex-wrap items-center gap-0.5 border-b border-slate-200 px-2 py-1'>
            <ToolButton onClick={() => linePrefix('## ', '見出し')} label='大きい見出し'>見出し</ToolButton>
            <ToolButton onClick={() => linePrefix('### ', '小見出し')} label='小さい見出し'>小見出し</ToolButton>
            <ToolButton onClick={() => wrap('**', '**', '太字')} label='太字'>
              <b>太字</b>
            </ToolButton>
            <ToolButton onClick={() => wrap('[', '](https://)', 'リンクの文字')} label='リンク'>リンク</ToolButton>
            <ToolButton onClick={() => linePrefix('- ', '項目')} label='箇条書き'>リスト</ToolButton>
            <ToolButton onClick={() => linePrefix('1. ', '項目')} label='番号付きリスト'>番号リスト</ToolButton>
            <ToolButton onClick={() => linePrefix('> ', '引用')} label='引用'>引用</ToolButton>
            <span className='mx-1 h-5 w-px shrink-0 bg-slate-200' aria-hidden='true' />
            <button
              type='button'
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => bodyFileInput.current?.click()}
              className={button('secondary', 'sm')}
            >
              ＋ 画像
            </button>
            <div className='relative ml-auto'>
              <ToolButton onClick={() => setHelpOpen((open) => !open)} label='書き方'>
                書き方
              </ToolButton>
              {helpOpen && (
                <div className='absolute right-0 top-10 z-20 w-80 space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 shadow-lg'>
                  <p className='font-bold'>本文の書き方</p>
                  <ul className='space-y-1 text-slate-700'>
                    <li><code>## 見出し</code>・<code>### 小見出し</code></li>
                    <li><code>**太字**</code>・<code>[文字](https://…)</code></li>
                    <li><code>- リスト</code>・<code>1. 番号付き</code>・<code>&gt; 引用</code></li>
                    <li>画像のすぐ下の行に <code>*説明*</code> でキャプション</li>
                    <li>URLだけの行はリンクカードになります</li>
                    <li>⌘S（Ctrl+S）で保存</li>
                  </ul>
                  <button type='button' onClick={() => setHelpOpen(false)} className={`${button('secondary', 'sm')} w-full`}>
                    閉じる
                  </button>
                </div>
              )}
            </div>
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
              trackCaret();
            }}
            onSelect={trackCaret}
            onKeyUp={trackCaret}
            onClick={trackCaret}
            onPaste={(event) => {
              const files = imageFiles(event.clipboardData.files);
              if (files.length === 0) return;
              event.preventDefault();
              trackCaret();
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
            placeholder={'ここに本文を書きます。\n\n画像は、ドラッグ＆ドロップ・コピーして貼り付け・「＋ 画像」ボタンで入れられます。'}
            aria-label='本文（Markdown）'
            className='min-h-0 w-full flex-1 resize-none bg-[#fcfbf8] px-[max(1.25rem,calc((100%_-_40rem)/2))] py-8 text-base leading-[1.7] text-stone-800 placeholder:text-stone-400 focus:outline-none'
          />

          <button
            type='button'
            onClick={() => {
              trackCaret();
              bodyFileInput.current?.click();
            }}
            className='flex h-10 shrink-0 items-center justify-center gap-1 border-t border-dashed border-stone-300 bg-[#fcfbf8] px-4 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700'
          >
            <span className='hidden md:inline'>
              画像はドラッグ＆ドロップ ／ コピーして貼り付け（⌘V・Ctrl+V）／ <span className='underline underline-offset-2'>クリックして選ぶ</span>
            </span>
            <span className='underline underline-offset-2 md:hidden'>タップして写真を追加</span>
          </button>

          {dragging && (
            <div
              className='absolute inset-3 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500 bg-blue-50/95 px-6 text-center text-base font-bold text-blue-800'
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
        </section>

        {view === 'split' && (
          <div
            role='separator'
            aria-orientation='vertical'
            aria-label='幅を変える'
            onPointerDown={startResize}
            onDoubleClick={() => {
              setSplit(50);
              writeStorage(SPLIT_KEY, 50);
            }}
            className='group relative hidden w-px shrink-0 cursor-col-resize bg-slate-200 md:block'
          >
            <span className='absolute inset-y-0 -left-1.5 -right-1.5 group-hover:bg-slate-300/60' />
          </div>
        )}

        <section
          aria-label='プレビュー'
          className={`min-w-0 flex-1 flex-col bg-slate-100 ${view === 'write' ? 'hidden' : view === 'split' ? 'hidden md:flex' : 'flex'}`}
        >
          <div className='flex h-11 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 text-sm'>
            <span className='font-medium text-slate-700'>プレビュー</span>
            <span className='truncate text-xs text-slate-500'>公開したときの見た目です</span>
          </div>
          <div ref={previewRef} className='min-h-0 flex-1 overflow-y-auto md:px-6'>
            <article style={{ fontFamily: 'Arial, Helvetica, sans-serif' }} className='mx-auto my-6 max-w-3xl bg-white px-6 py-8 shadow-sm ring-1 ring-slate-200 md:my-8 md:rounded-lg md:px-10 md:py-10'>
              {draft.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveSrc(draft.coverImage)} alt='' className='mb-6 aspect-[1200/630] w-full rounded-lg object-cover' />
              )}
              <h1 className='text-3xl font-bold leading-tight'>
                {draft.title || <span className='text-slate-300'>タイトル</span>}
              </h1>
              <p className='mt-3 text-sm text-slate-500'>
                {draft.authorName || '書いた人'}・{draft.date ? dateFormatter.format(new Date(draft.date)) : ''}
              </p>
              <div className='mt-8'>
                {draft.body.trim() ? (
                  <div className='article-body' dangerouslySetInnerHTML={{ __html: renderedPreview }} />
                ) : (
                  <p className='text-sm text-slate-400'>本文を書くと、ここにサイトでの見え方が出ます。</p>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>

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
