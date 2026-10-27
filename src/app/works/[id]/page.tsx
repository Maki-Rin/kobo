import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarkdownContent from '@/components/MarkdownContent';
import { MachineTags, StatusBadge } from '@/components/content/Labels';
import { excerptOf, getEntries, getEntry } from '@/lib/content';
import { renderMarkdown } from '@/lib/markdown';
import { resolvePeople } from '@/lib/people';

export async function generateStaticParams() {
  return (await getEntries('works')).map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const entry = await getEntry('works', (await params).id);
  if (!entry) return { title: '作品が見つかりません' };
  return {
    title: entry.title,
    description: excerptOf(entry),
    openGraph: { title: entry.title, description: excerptOf(entry), images: entry.coverImage ? [entry.coverImage] : [] },
  };
}

export default async function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const entry = await getEntry('works', (await params).id);
  if (!entry) notFound();
  const { tree } = await renderMarkdown(entry.body);
  const images = entry.images.length > 0 ? entry.images : entry.coverImage ? [entry.coverImage] : [];
  const event = entry.event ? await getEntry('events', entry.event) : null;
  const authors = resolvePeople(entry.authors);
  const facts = [
    ['状態', <StatusBadge key='status' status={entry.status} />],
    ['使った機材', <MachineTags key='machines' machines={entry.machines} basePath='/works' />],
    ['難易度', entry.difficulty],
    ['かかった時間', entry.duration],
    ['関連イベント', event ? <Link key='event' href={`/events/${event.id}`} className='underline'>{event.title}</Link> : null],
  ].filter(([, value]) => value);

  return (
    <div className='min-h-screen bg-white'>
      <Header />
      <main className='container mx-auto px-6 py-10'>
        <div className='mx-auto max-w-5xl'>
          <Link href='/works' className='text-sm text-gray-500 hover:underline'>
            ← 作品一覧
          </Link>
          <div className='mt-4 grid gap-8 md:grid-cols-[3fr_2fr]'>
            <div className='space-y-3'>
              {images.map((src, index) => (
                <div key={src} className='relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100'>
                  <Image src={src} alt={`${entry.title} ${index + 1}`} fill sizes='(min-width: 768px) 60vw, 100vw' className='object-contain' priority={index === 0} />
                </div>
              ))}
            </div>
            <div className='space-y-6'>
              <div>
                <h1 className='text-3xl font-bold leading-tight'>{entry.title}</h1>
                {authors.length > 0 && (
                  <ul className='mt-4 flex flex-wrap gap-4'>
                    {authors.map((person) => (
                      <li key={person.id} className='flex items-center gap-2'>
                        {person.avatar && <Image src={person.avatar} alt='' width={32} height={32} className='rounded-full' />}
                        <span className='text-sm font-medium'>{person.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <dl className='divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm'>
                {facts.map(([label, value]) => (
                  <div key={label as string} className='flex items-start gap-4 px-4 py-3'>
                    <dt className='w-24 shrink-0 text-gray-500'>{label}</dt>
                    <dd className='min-w-0 flex-1'>{value}</dd>
                  </div>
                ))}
              </dl>
              <MarkdownContent tree={tree} className='article-body' />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
