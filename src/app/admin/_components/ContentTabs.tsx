'use client';

import { useSearchParams } from 'next/navigation';
import { collectionLabels, collections, isCollection, type Collection } from '@/lib/content-schema';
import EntryTable, { type EntryRow } from './EntryTable';
import { pageTitle } from './ui';

const leads: Record<Collection, string> = {
  articles: 'ガイドとテック。クリックすると編集できます。',
  works: 'KOBOでつくられたもの。',
  events: '開催前は告知、終わったら同じページに開催報告を書きます。',
};

export default function ContentTabs({ rows, now }: { rows: Record<Collection, EntryRow[]>; now: number }) {
  const c = useSearchParams().get('c');
  const collection: Collection = c && isCollection(c) ? c : 'articles';

  return (
    <div className='space-y-6'>
      <div>
        <h1 className={pageTitle}>コンテンツ</h1>
        <p className='mt-1 text-sm text-slate-500'>{leads[collection]}</p>
      </div>
      <nav className='flex gap-1 border-b border-slate-200' aria-label='種類'>
        {collections.map((item) => {
          const href = item === 'articles' ? '/admin' : `/admin?c=${item}`;
          return (
            <a
              key={item}
              href={href}
              aria-current={item === collection ? 'page' : undefined}
              onClick={(event) => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                if (collection !== item) window.history.pushState(null, '', href);
              }}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${
                item === collection ? 'border-slate-900 font-bold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {collectionLabels[item]}
            </a>
          );
        })}
      </nav>
      <EntryTable key={collection} collection={collection} articles={rows[collection]} now={now} />
    </div>
  );
}
