import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { diffLines } from 'diff';
import { currentUser } from '@/lib/editor/auth';
import { getStore } from '@/lib/editor/store';
import { entryFromPath } from '@/lib/editor/entries';
import { parseEntry, type Entry } from '@/lib/content-schema';
import { card, pageTitle } from '../../_components/ui';

const CONTEXT = 3;

const fieldLabels: [keyof Entry, string][] = [
  ['title', 'タイトル'],
  ['date', '日付'],
  ['authors', '書いた人・作った人'],
  ['excerpt', '概要'],
  ['coverImage', 'カバー画像'],
  ['published', '公開'],
  ['type', '種類'],
  ['machines', '使った機材'],
  ['startTime', '開始'],
  ['endTime', '終了'],
  ['place', '場所'],
  ['capacity', '定員'],
  ['applyUrl', '申し込み'],
  ['participants', '参加人数'],
  ['status', '状態'],
  ['images', '写真'],
  ['difficulty', '難易度'],
  ['duration', 'かかった時間'],
  ['event', '関連イベント'],
];

const show = (value: Entry[keyof Entry] | undefined) =>
  value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
    ? '（なし）'
    : typeof value === 'boolean'
      ? value ? '公開' : '下書き'
      : Array.isArray(value)
        ? value.join('、')
        : String(value);

const same = (a: Entry[keyof Entry] | undefined, b: Entry[keyof Entry] | undefined) => JSON.stringify(a) === JSON.stringify(b);

type Line = { kind: 'add' | 'remove' | 'same'; text: string } | { kind: 'skip'; count: number };

function toLines(before: string, after: string): Line[] {
  const lines: Line[] = [];
  for (const part of diffLines(before, after)) {
    const texts = part.value.replace(/\n$/, '').split('\n');
    const kind = part.added ? 'add' : part.removed ? 'remove' : 'same';
    if (kind === 'same' && texts.length > CONTEXT * 2 + 1) {
      lines.push(...texts.slice(0, CONTEXT).map((text) => ({ kind, text }) as Line));
      lines.push({ kind: 'skip', count: texts.length - CONTEXT * 2 });
      lines.push(...texts.slice(-CONTEXT).map((text) => ({ kind, text }) as Line));
    } else {
      lines.push(...texts.map((text) => ({ kind, text }) as Line));
    }
  }
  return lines;
}

async function load(commit: string) {
  const store = getStore();
  try {
    const detail = await store.detail(commit);
    const files = await Promise.all(
      detail.files.map(async (file) => {
        const after = file.afterSha ? await store.staged(file.afterSha) : null;
        return { path: file.path, before: file.before, after, afterSha: file.afterSha };
      })
    );
    return { detail, files };
  } catch {
    return null;
  }
}

const formatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function CommitPage({ params }: { params: Promise<{ commit: string }> }) {
  if (!(await currentUser())) redirect('/admin');
  const { commit } = await params;
  const loaded = await load(commit);
  if (!loaded) notFound();
  const { detail, files } = loaded;
  const articles = files.flatMap((file) => {
    const target = entryFromPath(file.path);
    return target ? [{ ...file, ...target }] : [];
  });
  const images = files.filter((file) => file.path.startsWith('public/images/'));

  return (
    <div className='space-y-6'>
      <Link href='/admin/history' className='text-sm text-slate-500 hover:underline'>
        ← 変更履歴
      </Link>
      <div>
        <h1 className={pageTitle}>{detail.title.replace(/^\S+ /, '')}</h1>
        <p className='mt-1 text-sm text-slate-500'>
          {formatter.format(new Date(detail.at))}・{detail.authorName}
        </p>
      </div>

      {articles.map((file) => {
        const before = file.before ? parseEntry(file.collection, file.id, file.before.toString('utf8')) : null;
        const after = file.after ? parseEntry(file.collection, file.id, file.after.toString('utf8')) : null;
        const fields = fieldLabels.filter(([key]) => !same(before?.[key], after?.[key]));
        const lines = [
          ...toLines(before?.body.trim() ?? '', after?.body.trim() ?? ''),
          ...(before?.record || after?.record ? toLines(before?.record ?? '', after?.record ?? '') : []),
        ];
        const added = lines.filter((line) => line.kind === 'add').length;
        const removed = lines.filter((line) => line.kind === 'remove').length;
        return (
          <section key={file.path} className={`${card} overflow-hidden`}>
            <div className='flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm'>
              <span className='font-mono text-xs text-slate-600'>{file.path.split('/').pop()}</span>
              <span className='text-xs text-slate-500'>本文</span>
              <span className='text-xs text-emerald-700'>+{added}行</span>
              <span className='text-xs text-red-700'>−{removed}行</span>
              {!file.before && <span className='text-xs text-slate-500'>（新しい記事）</span>}
            </div>
            {fields.length > 0 && (
              <dl className='divide-y divide-slate-100 border-b border-slate-200 text-sm'>
                {fields.map(([key, label]) => (
                  <div key={String(key)} className='grid gap-1 px-4 py-2.5 sm:grid-cols-[7rem_1fr]'>
                    <dt className='text-slate-500'>{label}</dt>
                    <dd className='min-w-0 break-all'>
                      {before && <span className='text-red-800 line-through decoration-red-300'>{show(before[key])}</span>}
                      {before && <span className='mx-2 text-slate-400'>→</span>}
                      <span className='text-emerald-800'>{show(after?.[key])}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {added + removed === 0 && <p className='px-4 py-3 text-sm text-slate-500'>本文の変更はありません。</p>}
            <div className={`overflow-x-auto text-[13px] leading-6 ${added + removed === 0 ? 'hidden' : ''}`}>
              {lines.map((line, index) =>
                line.kind === 'skip' ? (
                  <div key={index} className='bg-slate-50 px-4 py-1 text-xs text-slate-400'>
                    … 変更のない {line.count} 行 …
                  </div>
                ) : (
                  <div
                    key={index}
                    className={`flex whitespace-pre-wrap break-all px-4 ${
                      line.kind === 'add' ? 'bg-emerald-50 text-emerald-950' : line.kind === 'remove' ? 'bg-red-50 text-red-950' : 'text-slate-600'
                    }`}
                  >
                    <span className='w-5 shrink-0 select-none text-slate-400'>
                      {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ''}
                    </span>
                    <span className={line.kind === 'remove' ? 'line-through decoration-red-300' : ''}>{line.text || ' '}</span>
                  </div>
                )
              )}
            </div>
          </section>
        );
      })}

      {images.length > 0 && (
        <section className={`${card} space-y-3 p-4`}>
          <h2 className='text-sm font-bold'>追加された画像</h2>
          <ul className='flex flex-wrap gap-3'>
            {images.filter((image) => image.afterSha).map((image) => (
              <li key={image.path}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/admin/staged/${image.afterSha}`}
                  alt=''
                  className='h-24 w-36 rounded-md border border-slate-200 object-cover'
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
