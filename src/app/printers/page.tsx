import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import PrinterStatus from '@/components/PrinterStatus';
import OpenHours from '@/components/OpenHours';
import { PageHeading } from '@/components/content/Labels';
import { getPublicPrinters } from '@/lib/printers-server';

export const metadata: Metadata = {
  title: '3Dプリンター稼働状況 | KOBO',
  description: 'KOBOの3Dプリンターが今空いているかを確認できます。',
};

export const dynamic = 'force-dynamic';

export default async function PrintersPage() {
  const initialResult = await getPublicPrinters();

  return (
    <div className='min-h-screen bg-white text-black'>
      <Header />
      <main className='mx-auto max-w-6xl px-6 py-12 md:py-16'>
        <PageHeading title='3Dプリンター稼働状況'>
          <OpenHours />
          <p className='text-sm text-neutral-500'>30秒ごとに更新します。表示が少し遅れることがあるので、迷ったら現地のプリンターを見てください。</p>
        </PageHeading>
        <PrinterStatus initialResult={initialResult} />
      </main>
      <Footer />
    </div>
  );
}
