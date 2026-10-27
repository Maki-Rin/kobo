import Link from 'next/link';
import { editorDbConfigured } from '@/lib/editor/db';
import { currentUser } from '@/lib/editor/auth';
import { listEntries } from '@/lib/editor/entries';
import { latestEventByEntry } from '@/lib/editor/activity';
import { collectionLabels, collections, isCollection, isPastEvent, todayInTokyo, type Collection } from '@/lib/content-schema';
import EntryTable from './_components/EntryTable';
import LoginPanel from './_components/LoginPanel';
import { pageTitle } from './_components/ui';

const leads: Record<Collection, string> = {
  articles: 'ガイドとテック。クリックすると編集できます。',
  works: 'KOBOでつくられたもの。',
  events: '開催前は告知、終わったら同じページに開催記録を書きます。',
};

async function loadRows(collection: Collection) {
  const [entries, events] = await Promise.all([listEntries(collection), latestEventByEntry(collection)]);
  const today = todayInTokyo();
  const rows = entries.map((entry) => {
    const event = events.get(entry.id);
    return {
      ...entry,
      isPast: isPastEvent(entry, today),
      updatedAt: event?.at ?? null,
      updatedBy: event?.userName ?? null,
    };
  });
  return { rows, now: Date.now() };
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  if (!editorDbConfigured()) {
    return <p className='text-sm text-slate-600'>投稿画面はまだ設定されていません（docs/editor-setup.md を参照）。</p>;
  }
  const user = await currentUser();
  if (!user) return <LoginPanel />;

  const { c } = await searchParams;
  const collection: Collection = c && isCollection(c) ? c : 'articles';
  const { rows, now } = await loadRows(collection);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className={pageTitle}>コンテンツ</h1>
        <p className='mt-1 text-sm text-slate-500'>{leads[collection]}</p>
      </div>
      <nav className='flex gap-1 border-b border-slate-200' aria-label='種類'>
        {collections.map((item) => (
          <Link
            key={item}
            href={item === 'articles' ? '/admin' : `/admin?c=${item}`}
            aria-current={item === collection ? 'page' : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${
              item === collection ? 'border-slate-900 font-bold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {collectionLabels[item]}
          </Link>
        ))}
      </nav>
      <EntryTable key={collection} collection={collection} articles={rows} now={now} />
    </div>
  );
}
