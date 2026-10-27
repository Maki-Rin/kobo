import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EventCard } from '@/components/content/Cards';
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
      <main className='container mx-auto px-6 py-12'>
        <div className='mx-auto max-w-6xl space-y-12'>
          <div>
            <h1 className='text-4xl font-bold'>イベント</h1>
            <p className='mt-3 text-lg text-gray-600'>KOBOが開くワークショップやイベント。終わった回は、当日の様子を記録として残しています。</p>
          </div>

          <section className='space-y-5'>
            <h2 className='text-2xl font-bold'>これからのイベント</h2>
            {upcoming.length === 0 ? (
              <p className='rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-gray-500'>
                いまのところ予定はありません。決まったらここに載せます。
              </p>
            ) : (
              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {upcoming.map((entry) => (
                  <EventCard key={entry.id} entry={entry} past={false} />
                ))}
              </div>
            )}
          </section>

          <section className='space-y-5'>
            <h2 className='text-2xl font-bold'>これまでのイベント</h2>
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {past.map((entry) => (
                <EventCard key={entry.id} entry={entry} past />
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
