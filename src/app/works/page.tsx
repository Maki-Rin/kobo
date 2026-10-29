import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import WorksGallery from '@/components/WorksGallery';

export const metadata: Metadata = {
  title: '作例一覧',
  description: 'KOBOの機材を使って制作された作例を、写真と使用機材から探せます。',
};

export default function WorksPage() {
  return (
    <div className='min-h-screen bg-white text-neutral-950'>
      <Header />
      <main className='mx-auto max-w-6xl px-6 py-12 md:py-20'>
        <div className='mb-10 border-b border-neutral-200 pb-6'>
          <h1 className='text-3xl font-bold md:text-4xl'>作例</h1>
        </div>
        <WorksGallery />
      </main>
      <Footer />
    </div>
  );
}
