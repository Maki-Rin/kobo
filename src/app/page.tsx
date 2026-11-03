import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeHero from '@/components/HomeHero';
import PrinterStatusStrip from '@/components/PrinterStatusStrip';
import { ArticleCard, EventCard, WorkCard } from '@/components/content/Cards';
import { getEntries, getEvents } from '@/lib/content';
import { formatEventDate } from '@/lib/event-format';

function Section({ title, href, linkLabel, children }: { title: string; href: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <section className='mx-auto max-w-6xl px-4 md:px-8'>
      <div className='mb-5 flex items-end justify-between gap-4'>
        <h2 className='text-[28px] font-extrabold leading-tight'>
          <span className='marker'>{title}</span>
        </h2>
        <Link href={href} className='shrink-0 text-sm font-bold underline-offset-4 hover:underline'>
          {linkLabel} →
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [articles, works, events] = await Promise.all([getEntries('articles'), getEntries('works'), getEvents()]);
  const next = events.upcoming[0];
  const shownEvents = (events.upcoming.length > 0 ? events.upcoming : events.past).slice(0, 3);

  return (
    <div className='min-h-screen bg-paper'>
      <Header />
      <HomeHero />
      <PrinterStatusStrip />

      {next && (
        <div className='mx-auto mt-6 max-w-6xl px-4 md:px-8'>
          <Link href={`/events/${next.id}`} className='pop-card flex flex-wrap items-center gap-x-4 gap-y-1 bg-cream px-5 py-4'>
            <span className='pop-chip bg-primary'>次のイベント</span>
            <span className='text-lg font-bold'>{next.title}</span>
            <span className='font-semibold'>{formatEventDate(next)}</span>
            {next.place && <span className='text-sm text-muted'>{next.place}</span>}
          </Link>
        </div>
      )}

      <main className='space-y-14 py-12'>
        <Section title='まなぶ' href='/articles' linkLabel='記事をすべて見る'>
          <div className='grid gap-5 md:grid-cols-3'>
            {articles.slice(0, 3).map((entry) => (
              <ArticleCard key={entry.id} entry={entry} />
            ))}
          </div>
        </Section>

        <Section title='作品' href='/works' linkLabel='作品をすべて見る'>
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5'>
            {works.slice(0, 4).map((entry) => (
              <WorkCard key={entry.id} entry={entry} />
            ))}
          </div>
        </Section>

        <Section title='イベント' href='/events' linkLabel='イベントをすべて見る'>
          <div className='grid gap-5 md:grid-cols-3'>
            {shownEvents.map((entry) => (
              <EventCard key={entry.id} entry={entry} past={events.upcoming.length === 0} />
            ))}
          </div>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
