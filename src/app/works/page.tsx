import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { WorkCard } from '@/components/content/Cards';
import { EmptyNote, FilterChips, PageHeading } from '@/components/content/Labels';
import { getEntries, machines } from '@/lib/content';
import WorksGallery from '@/components/WorksGallery';

export const metadata: Metadata = {
  title: '作例一覧',
  description: 'KOBOの機材を使って制作された作例を、写真と使用機材から探せます。',
};

export default async function WorksPage({ searchParams }: { searchParams: Promise<{ machine?: string }> }) {
  const { machine = 'all' } = await searchParams;
  const all = await getEntries('works');
  const shown = all.filter((entry) => machine === 'all' || entry.machines.includes(machine));
  const usedMachines = machines.filter((item) => all.some((entry) => entry.machines.includes(item.slug)));

  return (
    <div className='min-h-screen bg-white text-neutral-950'>
      <Header />
      <main className='mx-auto max-w-6xl px-6 py-12 md:py-20'>
        <PageHeading title='作例' />
        {usedMachines.length > 1 && (
          <div className='mb-9'>
            <FilterChips
              label='機材で絞り込む'
              options={[
                { value: 'all', label: 'すべて' },
                ...usedMachines.map((item) => ({ value: item.slug, label: item.name })),
              ]}
              current={machine}
              hrefFor={(value) => (value === 'all' ? '/works' : `/works?machine=${value}`)}
            />
          </div>
        )}
        {shown.length > 0 ? (
          <WorksGallery key={machine}>
            {shown.map((entry) => (
              <WorkCard key={entry.id} entry={entry} />
            ))}
          </WorksGallery>
        ) : (
          <EmptyNote>該当する作例はまだありません。</EmptyNote>
        )}
      </main>
      <Footer />
    </div>
  );
}
