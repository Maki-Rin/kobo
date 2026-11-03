import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CompactPrinterStatus from '@/components/CompactPrinterStatus';
import { ArticleCard, EventCard, WorkCard } from '@/components/content/Cards';
import { SectionHeading } from '@/components/content/Labels';
import { getEntries, getEvents, getFeed } from '@/lib/content';

export default async function HomePage() {
  const [articles, works, events] = await Promise.all([getFeed(), getEntries('works'), getEvents()]);
  const latestArticles = articles.slice(0, 4);
  const upcomingEvents = events.upcoming.slice(0, 3);

  return (
    <div className='min-h-screen bg-white text-neutral-950'>
      <Header />
      <main>
        <section className='relative h-[22rem] overflow-hidden bg-neutral-200 md:h-[30rem]'>
          <Image src='/images/top1.webp' alt='KOBOの工房' fill priority sizes='100vw' className='object-cover' />
          <div className='absolute inset-x-0 bottom-0 bg-black/55 px-6 py-5 text-white md:px-10'>
            <div className='mx-auto max-w-6xl'>
              <h1 className='text-2xl font-bold md:text-3xl'>KOBO</h1>
              <p className='mt-1 text-sm text-white/85'>立命館大学OICのものづくりスペースを紹介する非公式サイトです。</p>
            </div>
          </div>
        </section>

        <CompactPrinterStatus />

        <div className='mx-auto max-w-6xl space-y-20 px-6 py-14 md:py-20'>
          {upcomingEvents.length > 0 && (
            <section>
              <SectionHeading title='開催予定' href='/events' linkLabel='一覧を見る' />
              <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                {upcomingEvents.map((entry) => (
                  <EventCard key={entry.id} entry={entry} past={false} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeading title='最新の記事' href='/articles' linkLabel='記事一覧を見る' />
            {latestArticles.length > 0 ? (
              <div className='space-y-10'>
                <ArticleCard entry={latestArticles[0]} featured />
                <div className='grid gap-7 sm:grid-cols-2 lg:grid-cols-3'>
                  {latestArticles.slice(1).map((entry) => (
                    <ArticleCard key={`${entry.collection}-${entry.id}`} entry={entry} />
                  ))}
                </div>
              </div>
            ) : (
              <p className='text-sm text-neutral-500'>まだ記事がありません。</p>
            )}
          </section>

          <section id='works'>
            <SectionHeading title='作例' href='/works' linkLabel='作例一覧を見る' />
            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {works.slice(0, 6).map((entry) => (
                <WorkCard key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
