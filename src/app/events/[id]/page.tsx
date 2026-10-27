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
    <dl className='divide-y divide-line-soft rounded-xl border-2 border-ink text-sm'>
      {[
        ['日時', formatEventDate(entry)],
        ['場所', entry.place],
        ['定員', entry.capacity],
        ['参加人数', past ? entry.participants : ''],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className='flex gap-4 px-4 py-3'>
            <dt className='w-20 shrink-0 font-semibold text-muted'>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );

  return (
    <div className='min-h-screen bg-white'>
      <Header />
      <main className='mx-auto max-w-5xl px-4 py-8 md:px-8'>
        <div className='space-y-7'>
          <Link href='/events' className='inline-block text-sm font-semibold underline-offset-4 hover:underline'>
            ← イベント一覧
          </Link>
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className={`pop-chip ${past ? 'bg-off' : 'bg-accent'}`}>{past ? '開催済み' : '開催予定'}</span>
              <MachineTags machines={entry.machines} />
            </div>
            <h1 className='text-3xl font-extrabold leading-tight md:text-4xl'>{entry.title}</h1>
            <p className='text-lg font-semibold'>
              {formatEventDate(entry)}
              {entry.place && <span className='ml-3 font-normal text-muted'>{entry.place}</span>}
            </p>
          </div>

          {past && record && (
            <section className='space-y-4 rounded-2xl border-2 border-ink bg-cream p-5 md:p-7'>
              <div className='flex flex-wrap items-center gap-3'>
                <h2 className='text-2xl font-extrabold'>開催記録</h2>
                {entry.participants && <span className='pop-chip'>参加 {entry.participants}</span>}
              </div>
              <MarkdownContent tree={record} className='article-body' />
            </section>
          )}

          {works.length > 0 && (
            <section className='space-y-4'>
              <h2 className='text-xl font-extrabold'>このイベントでつくられた作品</h2>
              <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                {works.map((work) => (
                  <WorkCard key={work.id} entry={work} />
                ))}
              </div>
            </section>
          )}

          {past && !record && (
            <p className='rounded-xl border-2 border-dashed border-line-soft px-6 py-5 text-sm text-muted'>
              このイベントの開催記録はまだありません。
            </p>
          )}

          <details open={!past || !record} className='group overflow-hidden rounded-2xl border-2 border-ink'>
            <summary className='cursor-pointer list-none px-5 py-4 font-bold [&::-webkit-details-marker]:hidden'>
              {past ? '開催前のお知らせ' : 'お知らせ'}
              <span className='ml-2 text-sm font-normal text-muted group-open:hidden'>（開く）</span>
            </summary>
            <div className='grid gap-6 border-t-2 border-ink p-5 md:grid-cols-[2fr_3fr] md:p-6'>
              {entry.coverImage && (
                <div className='relative aspect-[1/1.414] overflow-hidden rounded-xl border-2 border-ink bg-off'>
                  <Image src={entry.coverImage} alt={`${entry.title}の告知画像`} fill sizes='(min-width: 768px) 40vw, 100vw' className='object-contain' />
                </div>
              )}
              <div className='space-y-6'>
                {info}
                {!past && entry.applyUrl && (
                  <a href={entry.applyUrl} target='_blank' rel='noreferrer' className='pop-btn'>
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
