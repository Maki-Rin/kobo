import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EventCard } from '@/components/content/Cards';
import { EmptyNote, SectionHeading } from '@/components/content/Labels';
import { getEvents } from '@/lib/content';

export const metadata: Metadata = {
  title: 'イベント',
  description: '立命館大学OIC KOBOが開催するワークショップやイベントの予定と、これまでの開催報告。',
};

export default async function EventsPage() {
  const { upcoming, past } = await getEvents();
  return (
    <div className='min-h-screen bg-white text-neutral-950'>
      <Header />
      <main className='mx-auto max-w-6xl space-y-16 px-6 py-12 md:py-20'>
        <h1 className='border-b border-neutral-200 pb-6 text-3xl font-bold md:text-4xl'>イベント</h1>

        <section>
          <SectionHeading title='開催予定' />
          {upcoming.length === 0 ? (
            <EmptyNote>いまのところ予定はありません。</EmptyNote>
          ) : (
            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {upcoming.map((entry) => (
                <EventCard key={entry.id} entry={entry} past={false} />
              ))}
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <SectionHeading title='これまでのイベント' />
            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {past.map((entry) => (
                <EventCard key={entry.id} entry={entry} past />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
