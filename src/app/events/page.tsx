import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EventCard } from '@/components/content/Cards';
import { PageHeading } from '@/components/content/Labels';
import { getEvents } from '@/lib/content';

export const metadata: Metadata = {
  title: 'イベント',
  description: '立命館大学OIC KOBOが開催するワークショップやイベントの予定と、これまでの開催記録。',
};

export default async function EventsPage() {
  const { upcoming, past } = await getEvents();
  return (
    <div className='min-h-screen bg-white'>
      <Header />
      <main className='mx-auto max-w-6xl space-y-10 px-4 py-10 md:px-8'>
          <PageHeading title='イベント' />

          <section className='space-y-4'>
            <h2 className='text-xl font-extrabold'>これから</h2>
            {upcoming.length === 0 ? (
              <p className='rounded-xl border-2 border-dashed border-line-soft px-6 py-8 text-center text-muted'>
                いまのところ予定はありません。決まったらここに載せます。
              </p>
            ) : (
              <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-3'>
                {upcoming.map((entry) => (
                  <EventCard key={entry.id} entry={entry} past={false} />
                ))}
              </div>
            )}
          </section>

          <section className='space-y-4'>
            <h2 className='text-xl font-extrabold'>これまで</h2>
            <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-3'>
              {past.map((entry) => (
                <EventCard key={entry.id} entry={entry} past />
              ))}
            </div>
          </section>
      </main>
      <Footer />
    </div>
  );
}
