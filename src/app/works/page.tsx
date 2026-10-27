import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { WorkCard } from '@/components/content/Cards';
import { FilterChips } from '@/components/content/Labels';
import { getEntries, machines } from '@/lib/content';

export const metadata: Metadata = {
  title: '作品',
  description: '立命館大学OIC KOBOでつくられた作品の紹介。3Dプリンター、レーザーカッターなどで制作したものを掲載しています。',
};

export default async function WorksPage({ searchParams }: { searchParams: Promise<{ machine?: string }> }) {
  const { machine = 'all' } = await searchParams;
  const all = await getEntries('works');
  const shown = all.filter((entry) => machine === 'all' || entry.machines.includes(machine));
  const usedMachines = machines.filter((item) => all.some((entry) => entry.machines.includes(item.slug)));

  return (
    <div className='min-h-screen bg-white'>
      <Header />
      <main className='container mx-auto px-6 py-12'>
        <div className='mx-auto mb-10 max-w-6xl'>
          <h1 className='text-4xl font-bold'>作品</h1>
          <p className='mt-3 text-lg text-gray-600'>KOBOでつくられたもの。どの機材で、どうやってつくったかも載せています。</p>
          {usedMachines.length > 1 && (
            <div className='mt-6'>
              <FilterChips
                options={[
                  { value: 'all', label: 'すべて', count: all.length },
                  ...usedMachines.map((item) => ({
                    value: item.slug,
                    label: item.name,
                    count: all.filter((entry) => entry.machines.includes(item.slug)).length,
                  })),
                ]}
                current={machine}
                hrefFor={(value) => (value === 'all' ? '/works' : `/works?machine=${value}`)}
              />
            </div>
          )}
        </div>
        <div className='mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4'>
          {shown.map((entry) => (
            <WorkCard key={entry.id} entry={entry} />
          ))}
        </div>
        {shown.length === 0 && <p className='mx-auto max-w-6xl py-10 text-center text-gray-500'>まだ作品がありません。</p>}
      </main>
      <Footer />
    </div>
  );
}
