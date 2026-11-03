import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser, listMembers } from '@/lib/editor/auth';
import { listEntries } from '@/lib/editor/entries';
import { collectionLabels, collections, isCollection } from '@/lib/content-schema';
import { articleActionLabels, recentEvents, type ArticleEvent } from '@/lib/editor/activity';
import HistoryFilters from '../_components/HistoryFilters';
import RevertButton from '../_components/RevertButton';
import { button, card, pageTitle } from '../_components/ui';

const dayFormatter = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' });
const timeFormatter = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
const dayKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' });

const actionColors: Record<ArticleEvent['action'], string> = {
  publish: 'bg-emerald-500',
  update: 'bg-blue-500',
  draft: 'bg-amber-400',
  unpublish: 'bg-slate-400',
  revert: 'bg-red-400',
};

async function load(entry?: string, user?: string) {
  const [collection, id] = entry?.split('/') ?? [];
  const [events, lists, members] = await Promise.all([
    recentEvents({
      collection: collection && isCollection(collection) ? collection : undefined,
      articleId: id,
      userId: user,
      limit: 100,
    }),
    Promise.all(collections.map((item) => listEntries(item))),
    listMembers(),
  ]);
  const articles = lists.flat().map((item) => ({
    id: `${item.collection}/${item.id}`,
    title: `［${collectionLabels[item.collection]}］${item.title || item.id}`,
  }));
  const today = dayKey.format(new Date());
  const yesterday = dayKey.format(new Date(Date.now() - 86_400_000));
  const groups = new Map<string, ArticleEvent[]>();
  for (const event of events) {
    const key = dayKey.format(new Date(event.at));
    const label = key === today ? '今日' : key === yesterday ? '昨日' : dayFormatter.format(new Date(event.at));
    groups.set(label, [...(groups.get(label) ?? []), event]);
  }
  return { groups: [...groups], articles, members };
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string; user?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/admin');
  const filters = await searchParams;
  const { groups, articles, members } = await load(filters.entry, filters.user);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className={pageTitle}>変更履歴</h1>
        <p className='mt-1 text-sm leading-6 text-slate-500'>
          投稿画面からの変更の記録です。「戻す」と、その変更の前の状態に戻す変更が新しく記録されます。
          {user.role === 'editor' && '自分の変更だけ戻せます。'}
        </p>
      </div>
      <HistoryFilters
        articles={articles}
        members={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
      />
      {groups.length === 0 && (
        <p className={`${card} px-4 py-10 text-center text-sm text-slate-500`}>まだ記録がありません</p>
      )}
      {groups.map(([label, events]) => (
        <section key={label} className='space-y-2'>
          <h2 className='text-sm font-bold text-slate-500'>{label}</h2>
          <ul className={`${card} divide-y divide-slate-100`}>
            {events.map((event) => (
              <li key={`${event.commitId}-${event.articleId}`} className='flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3'>
                <span className='w-12 shrink-0 text-sm tabular-nums text-slate-500'>
                  {timeFormatter.format(new Date(event.at))}
                </span>
                <span className={`size-2 shrink-0 rounded-full ${actionColors[event.action]}`} aria-hidden='true' />
                <p className='min-w-0 flex-1 text-sm leading-6'>
                  <span className='font-medium'>{event.userName ?? '不明'}</span>
                  <span className='text-slate-500'> が </span>
                  <Link href={`/admin/${event.collection}/${event.articleId}`} className='font-medium hover:underline'>
                    {event.title}
                  </Link>
                  <span className='text-slate-500'> を{articleActionLabels[event.action]}</span>
                </p>
                <div className='flex items-start gap-2'>
                  <Link
                    href={`/admin/history/${event.commitId}`}
                    className={button('ghost', 'sm')}
                  >
                    変更を見る
                  </Link>
                  {(user.role !== 'editor' || event.userId === user.id) && <RevertButton commitId={event.commitId} />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
