'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CompactPrinterStatus from '@/components/CompactPrinterStatus';
import WorkCard from '@/components/WorkCard';
import EventCard from '@/components/EventCard';
import { type Article } from '@/lib/articles';
import { type Work, getWorks } from '@/lib/works';
import { type Event, getEvents } from '@/lib/events';

const categoryLabels: Record<Article['category'], string> = {
  tips: 'Tips',
  work: '制作記録',
  'event-report': 'イベントレポート',
  news: 'お知らせ',
};

const categoryStyles: Record<Article['category'], string> = {
  tips: 'bg-blue-50 text-blue-700',
  work: 'bg-emerald-50 text-emerald-700',
  'event-report': 'bg-amber-50 text-amber-800',
  news: 'bg-violet-50 text-violet-700',
};

function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <Link href={`/articles/${article.id}`} className={`group block ${featured ? 'md:grid md:grid-cols-[0.9fr_1.1fr] md:gap-8' : ''}`}>
      <div className={`relative overflow-hidden rounded-lg bg-neutral-100 ${featured ? 'aspect-[16/10]' : 'aspect-video'}`}>
        <Image src={article.coverImage} alt='' fill className='object-cover transition-transform duration-300 group-hover:scale-[1.015]' />
      </div>
      <div className={featured ? 'pt-5 md:pt-2' : 'pt-4'}>
        <div className='flex items-center gap-3 text-xs text-neutral-500'>
          <span className={`rounded-md px-2 py-1 font-semibold ${categoryStyles[article.category]}`}>{categoryLabels[article.category]}</span>
          <time>{article.date}</time>
        </div>
        <h3 className={`${featured ? 'mt-3 text-2xl lg:whitespace-nowrap' : 'mt-2 text-lg'} font-bold leading-snug`}>{article.title}</h3>
        {article.excerpt && <p className='mt-3 line-clamp-3 text-sm leading-6 text-neutral-600'>{article.excerpt}</p>}
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([fetch('/api/articles').then((response) => response.json()), getWorks(), getEvents()])
      .then(([articleData, workData, eventData]) => {
        if (!active) return;
        setArticles(articleData.articles ?? []);
        setWorks(workData);
        setEvents(eventData);
      })
      .catch((error) => console.error('Failed to load home content:', error));
    return () => { active = false; };
  }, []);

  const latestArticles = useMemo(() => articles.slice(0, 4), [articles]);
  const featuredWorks = useMemo(
    () => works.filter((work) => work.publicationStatus !== 'draft' && work.publicationStatus !== 'rejected').slice(0, 6),
    [works],
  );
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events.filter((event) => new Date(event.date) >= today).slice(0, 3);
  }, [events]);

  return (
    <div className='min-h-screen bg-white text-neutral-950'>
      <Header />
      <main>
        <section className='relative h-[22rem] overflow-hidden bg-neutral-200 md:h-[30rem]'>
          <Image src='/images/top1.jpg' alt='KOBOの工房' fill priority className='object-cover' />
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
              <div className='mb-6 flex items-end justify-between border-b border-neutral-200 pb-3'>
                <h2 className='text-2xl font-bold'>開催予定</h2>
                <Link href='#events' className='text-sm text-neutral-600 underline underline-offset-4'>一覧を見る</Link>
              </div>
              <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                {upcomingEvents.map((event, index) => <EventCard key={`${event.date}-${index}`} event={event} />)}
              </div>
            </section>
          )}

          <section>
            <div className='mb-7 flex items-end justify-between border-b border-neutral-200 pb-3'>
              <h2 className='text-2xl font-bold'>最新の記事</h2>
              <Link href='/articles' className='text-sm text-neutral-600 underline underline-offset-4'>記事一覧を見る</Link>
            </div>
            {latestArticles.length > 0 ? (
              <div className='space-y-10'>
                <ArticleCard article={latestArticles[0]} featured />
                <div className='grid gap-7 sm:grid-cols-2 lg:grid-cols-3'>
                  {latestArticles.slice(1).map((article) => <ArticleCard key={article.id} article={article} />)}
                </div>
              </div>
            ) : <p className='text-sm text-neutral-500'>記事を読み込んでいます。</p>}
          </section>

          <section id='works'>
            <div className='mb-7 flex items-end justify-between border-b border-neutral-200 pb-3'>
              <h2 className='text-2xl font-bold'>作例</h2>
              <Link href='/works' className='shrink-0 text-sm text-neutral-600 underline underline-offset-4'>作例一覧を見る</Link>
            </div>
            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {featuredWorks.map((work) => <WorkCard key={work.id} work={work} />)}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
