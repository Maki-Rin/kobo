import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarkdownContent from '@/components/MarkdownContent';
import { WorkCard } from '@/components/content/Cards';
import { MachineTags, SectionHeading, Tag } from '@/components/content/Labels';
import { excerptOf, getEntries, getEntry } from '@/lib/content';
import { hasAnnouncement, isPastEvent } from '@/lib/content-schema';
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
    announced: hasAnnouncement(entry),
    announcement: announcement.tree,
    record: record?.tree ?? null,
    works: works.filter((work) => work.event === entry.id),
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const loaded = await load((await params).id);
  if (!loaded) notFound();
  const { entry, past, announced, announcement, record, works } = loaded;

  const info = (
    <dl className='space-y-3 border-y border-neutral-200 py-4 text-sm'>
      {[
        ['日時', formatEventDate(entry)],
        ['場所', entry.place],
        ['定員', entry.capacity],
        ['参加人数', past ? entry.participants : ''],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className='flex gap-4'>
            <dt className='w-20 shrink-0 text-neutral-500'>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );

  const poster = entry.coverImage && (
    <div className={`relative overflow-hidden rounded-lg bg-neutral-100 ${announced ? 'aspect-[1/1.414]' : 'aspect-video'}`}>
      <Image
        src={entry.coverImage}
        alt={announced ? `${entry.title}の告知画像` : entry.title}
        fill
        sizes='(min-width: 768px) 40vw, 100vw'
        className={announced ? 'object-contain' : 'object-cover'}
      />
    </div>
  );

  const announcementBody = (
    <div className={`grid gap-8 ${entry.coverImage ? 'md:grid-cols-[2fr_3fr]' : ''}`}>
      {poster}
      <div className='space-y-6'>
        {info}
        {!past && entry.applyUrl && (
          <a
            href={entry.applyUrl}
            target='_blank'
            rel='noreferrer'
            className='inline-block rounded-md bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700'
          >
            申し込む
          </a>
        )}
        <MarkdownContent tree={announcement} className='article-body' />
      </div>
    </div>
  );

  return (
    <div className='min-h-screen bg-white text-neutral-950'>
      <Header />
      <main className='mx-auto max-w-5xl px-6 py-10 md:py-14'>
        <div className='space-y-10'>
          <Link href='/events' className='inline-block text-sm text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:decoration-black'>
            イベント一覧に戻る
          </Link>
          <div className='space-y-3 border-b border-neutral-200 pb-6'>
            <div className='flex flex-wrap items-center gap-2'>
              <Tag className={past ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'}>{past ? (record ? '開催報告' : '開催済み') : '開催予定'}</Tag>
              <MachineTags machines={entry.machines} />
            </div>
            <h1 className='text-3xl font-bold leading-tight md:text-4xl'>{entry.title}</h1>
            <p className='technical-type text-neutral-600'>
              {formatEventDate(entry)}
              {entry.place && <span className='ml-3'>{entry.place}</span>}
            </p>
          </div>

          {!announced && (
            <div className='space-y-6'>
              {poster}
              {entry.participants && <p className='text-sm text-neutral-600'>参加人数: {entry.participants}</p>}
            </div>
          )}

          {past && record && (
            <section>
              {announced && <SectionHeading title='開催報告' />}
              <MarkdownContent tree={record} className='article-body' />
              {announced && entry.participants && <p className='mt-6 text-sm text-neutral-600'>参加人数: {entry.participants}</p>}
            </section>
          )}

          {works.length > 0 && (
            <section>
              <SectionHeading title='このイベントでつくられた作例' />
              <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                {works.map((work) => (
                  <WorkCard key={work.id} entry={work} />
                ))}
              </div>
            </section>
          )}

          {past && !record && <p className='text-sm text-neutral-500'>このイベントの開催報告はまだありません。</p>}

          {announced &&
            (past ? (
              <details className='group border-t border-neutral-200 pt-6'>
                <summary className='cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden'>
                  開催前のお知らせ
                  <span className='ml-2 text-sm font-normal text-neutral-500 group-open:hidden'>（開く）</span>
                </summary>
                <div className='mt-6'>{announcementBody}</div>
              </details>
            ) : (
              announcementBody
            ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
