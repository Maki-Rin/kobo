'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import { relativeTime } from './relativeTime';
import { badge, button, card, input, select } from './ui';

export interface ArticleRow {
  id: string;
  title: string;
  date: string;
  published: boolean;
  coverImage: string;
  authorName: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

type Filter = 'all' | 'published' | 'draft';
type Sort = 'updated' | 'date';

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'published', label: '公開中' },
  { value: 'draft', label: '下書き' },
];

function localDraftKeys(): string {
  try {
    return Object.keys(window.localStorage)
      .filter((key) => key.startsWith('kobo-editor:') && key !== 'kobo-editor:split')
      .map((key) => key.slice('kobo-editor:'.length))
      .sort()
      .join('\n');
  } catch {
    return '';
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export default function ArticleTable({ articles, now }: { articles: ArticleRow[]; now: number }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('updated');
  const [query, setQuery] = useState('');
  const draftKeys = useSyncExternalStore(subscribe, localDraftKeys, () => '');
  const localDrafts = useMemo(() => new Set(draftKeys.split('\n').filter(Boolean)), [draftKeys]);

  const counts = useMemo(
    () => ({
      all: articles.length,
      published: articles.filter((a) => a.published).length,
      draft: articles.filter((a) => !a.published).length,
    }),
    [articles]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles
      .filter((a) => filter === 'all' || (filter === 'published') === a.published)
      .filter((a) => !q || a.title.toLowerCase().includes(q) || a.id.includes(q) || a.authorName.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === 'date'
          ? b.date.localeCompare(a.date)
          : (b.updatedAt ?? b.date).localeCompare(a.updatedAt ?? a.date)
      );
  }, [articles, filter, sort, query]);

  return (
    <div className='space-y-4'>
      {localDrafts.has('new') && (
        <Link
          href='/admin/articles/new'
          className='flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 hover:bg-amber-100'
        >
          <Icon name='pencil' className='text-amber-700' />
          <span className='flex-1'>書きかけの新しい記事がこの端末に残っています</span>
          <span className='font-medium'>続きを書く →</span>
        </Link>
      )}

      <div className='flex flex-wrap items-center gap-3'>
        <div className='flex h-9 rounded-md border border-slate-300 bg-white p-0.5' role='tablist'>
          {filters.map((option) => (
            <button
              key={option.value}
              role='tab'
              aria-selected={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 text-sm ${
                filter === option.value ? 'bg-slate-900 font-medium text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {option.label}
              <span className={`text-xs tabular-nums ${filter === option.value ? 'text-slate-300' : 'text-slate-400'}`}>
                {counts[option.value]}
              </span>
            </button>
          ))}
        </div>
        <div className='relative min-w-48 flex-1'>
          <Icon name='search' className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='タイトル・書いた人で検索'
            aria-label='記事を検索'
            className={`${input} pl-9`}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label='並び順'
          className={select}
        >
          <option value='updated'>更新が新しい順</option>
          <option value='date'>記事の日付順</option>
        </select>
      </div>

      <ul className={`${card} divide-y divide-slate-100 overflow-hidden`}>
        {shown.map((article) => (
          <li key={article.id} className='group relative flex items-center gap-4 px-4 py-3 hover:bg-slate-50'>
            <div className='h-12 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100'>
              {article.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={article.coverImage} alt='' className='size-full object-cover' loading='lazy' />
              ) : (
                <div className='flex size-full items-center justify-center text-slate-300'>
                  <Icon name='image' size={20} />
                </div>
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <Link
                  href={`/admin/articles/${article.id}`}
                  className='truncate font-medium after:absolute after:inset-0 group-hover:underline'
                >
                  {article.title || '（タイトルなし）'}
                </Link>
                {!article.published && <span className={`${badge} shrink-0 bg-amber-100 text-amber-900`}>下書き</span>}
                {localDrafts.has(article.id) && (
                  <span className={`${badge} shrink-0 bg-blue-50 text-blue-800`}>書きかけあり</span>
                )}
              </div>
              <p className='mt-1 truncate text-xs text-slate-500'>
                {article.authorName || '書いた人なし'}・記事の日付 {article.date}
                {article.updatedAt && (
                  <>
                    ・{relativeTime(article.updatedAt, now)}に{article.updatedBy ?? '誰か'}が更新
                  </>
                )}
              </p>
            </div>
            {article.published && (
              <span className='relative z-10 hidden sm:block'>
                <a
                  href={`/articles/${article.id}`}
                  target='_blank'
                  rel='noreferrer'
                  className={`${button('ghost', 'sm')} text-slate-500`}
                  title='公開ページを開く'
                >
                  <Icon name='external' />
                  公開ページ
                </a>
              </span>
            )}
          </li>
        ))}
        {shown.length === 0 && (
          <li className='px-4 py-10 text-center text-sm text-slate-500'>
            {articles.length === 0 ? 'まだ記事がありません' : '見つかりませんでした'}
          </li>
        )}
      </ul>
    </div>
  );
}
