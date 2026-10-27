import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeHero from '@/components/HomeHero';
import PrinterStatusStrip from '@/components/PrinterStatusStrip';
import { ArticleCard, EventCard, WorkCard } from '@/components/content/Cards';
import { getEntries, getEvents } from '@/lib/content';
import { formatEventDate } from '@/lib/event-format';

function SectionHeader({ title, lead, href, linkLabel }: { title: string; lead: string; href: string; linkLabel: string }) {
  return (
    <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
      <div>
        <h2 className='text-3xl font-bold text-gray-900'>{title}</h2>
        <p className='mt-2 text-gray-600'>{lead}</p>
      </div>
      <Link href={href} className='text-sm font-bold text-gray-900 hover:underline'>
        {linkLabel} &gt;&gt;
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [articles, works, events] = await Promise.all([getEntries('articles'), getEntries('works'), getEvents()]);
  const next = events.upcoming[0];

  return (
    <div className='min-h-screen bg-white text-gray-900'>
      <Header />
      <HomeHero />
      <PrinterStatusStrip />

      {next && (
        <Link href={`/events/${next.id}`} className='block border-b border-amber-200 bg-amber-50 hover:bg-amber-100'>
          <div className='container mx-auto flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-4'>
            <span className='rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-950'>次のイベント</span>
            <span className='font-bold'>{next.title}</span>
            <span className='text-sm text-gray-700'>{formatEventDate(next)}</span>
            {next.place && <span className='text-sm text-gray-500'>{next.place}</span>}
          </div>
        </Link>
      )}

      <main className='container mx-auto space-y-20 px-6 py-14'>
        <section className='mx-auto max-w-6xl'>
          <SectionHeader title='まなぶ' lead='機材の使い方と、使ってみて分かったこと。' href='/articles' linkLabel='すべての記事' />
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            {articles.slice(0, 3).map((entry) => (
              <ArticleCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>

        <section className='mx-auto max-w-6xl'>
          <SectionHeader title='作品' lead='KOBOでつくられたもの。' href='/works' linkLabel='すべての作品' />
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6'>
            {works.slice(0, 4).map((entry) => (
              <WorkCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>

        <section className='mx-auto max-w-6xl'>
          <SectionHeader
            title='イベント'
            lead={events.upcoming.length > 0 ? 'これからのイベント。' : 'これまでに開いたイベント。'}
            href='/events'
            linkLabel='すべてのイベント'
          />
          <div className='grid gap-6 md:grid-cols-3'>
            {(events.upcoming.length > 0 ? events.upcoming : events.past).slice(0, 3).map((entry) => (
              <EventCard key={entry.id} entry={entry} past={events.upcoming.length === 0} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
