import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarkdownContent from '@/components/MarkdownContent';
import { WorkCard } from '@/components/content/Cards';
import { MachineTags } from '@/components/content/Labels';
import { excerptOf, getEntries, getEntry } from '@/lib/content';
import { isPastEvent } from '@/lib/content-schema';
import { formatEventDate } from '@/lib/event-format';
import { renderMarkdown } from '@/lib/markdown';

export async function generateStaticParams() {
  return (await getEntries('events')).map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const entry = await getEntry('events', (await params).id);
  if (!entry) return { title: 'イベントが見つかりません' };
  return {
    title: entry.title,
    description: excerptOf(entry),
    openGraph: { title: entry.title, description: excerptOf(entry), images: entry.coverImage ? [entry.coverImage] : [] },
  };
}

async function load(id: string) {
  const entry = await getEntry('events', id);
  if (!entry) return null;
  const [announcement, record, works] = await Promise.all([
    renderMarkdown(entry.body),
    entry.record ? renderMarkdown(entry.record) : null,
    getEntries('works'),
  ]);
  return {
    entry,
    past: isPastEvent(entry),
    announcement: announcement.tree,
    record: record?.tree ?? null,
    works: works.filter((work) => work.event === entry.id),
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const loaded = await load((await params).id);
  if (!loaded) notFound();
  const { entry, past, announcement, record, works } = loaded;

  const info = (
    <dl className='divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm'>
      {[
        ['日時', formatEventDate(entry)],
        ['場所', entry.place],
        ['定員', entry.capacity],
        ['参加人数', past ? entry.participants : ''],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className='flex gap-4 px-4 py-3'>
            <dt className='w-20 shrink-0 text-gray-500'>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );

  return (
    <div className='min-h-screen bg-white'>
      <Header />
      <main className='container mx-auto px-6 py-10'>
        <div className='mx-auto max-w-5xl space-y-8'>
          <Link href='/events' className='text-sm text-gray-500 hover:underline'>
            ← イベント一覧
          </Link>
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  past ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {past ? '開催済み' : '開催予定'}
              </span>
              <MachineTags machines={entry.machines} />
            </div>
            <h1 className='text-3xl font-bold leading-tight md:text-4xl'>{entry.title}</h1>
            <p className='text-lg text-gray-700'>{formatEventDate(entry)}</p>
          </div>

          {past && record && (
            <section className='space-y-5 rounded-xl bg-gray-50 p-6 md:p-8'>
              <h2 className='text-2xl font-bold'>開催記録</h2>
              {entry.participants && <p className='text-sm text-gray-600'>参加人数: {entry.participants}</p>}
              <MarkdownContent tree={record} className='article-body' />
            </section>
          )}

          {works.length > 0 && (
            <section className='space-y-4'>
              <h2 className='text-2xl font-bold'>このイベントでつくられた作品</h2>
              <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                {works.map((work) => (
                  <WorkCard key={work.id} entry={work} />
                ))}
              </div>
            </section>
          )}

          {past && !record && (
            <p className='rounded-lg border border-dashed border-gray-300 px-6 py-5 text-sm text-gray-500'>
              このイベントの開催記録はまだありません。
            </p>
          )}

          <details open={!past || !record} className='group rounded-xl border border-gray-200'>
            <summary className='cursor-pointer list-none px-6 py-4 font-bold [&::-webkit-details-marker]:hidden'>
              {past ? '開催前のお知らせ' : 'お知らせ'}
              <span className='ml-2 text-sm font-normal text-gray-500 group-open:hidden'>（開く）</span>
            </summary>
            <div className='grid gap-8 border-t border-gray-200 p-6 md:grid-cols-[2fr_3fr]'>
              {entry.coverImage && (
                <div className='relative aspect-[1/1.414] overflow-hidden rounded-lg bg-gray-100'>
                  <Image src={entry.coverImage} alt={`${entry.title}の告知画像`} fill sizes='(min-width: 768px) 40vw, 100vw' className='object-contain' />
                </div>
              )}
              <div className='space-y-6'>
                {info}
                {!past && entry.applyUrl && (
                  <a
                    href={entry.applyUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex rounded-lg bg-gray-900 px-5 py-3 font-bold text-white hover:bg-gray-700'
                  >
                    申し込む
                  </a>
                )}
                <MarkdownContent tree={announcement} className='article-body' />
              </div>
            </div>
          </details>
        </div>
      </main>
      <Footer />
    </div>
  );
}
