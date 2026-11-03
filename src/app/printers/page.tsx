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
    <div className='min-h-screen bg-paper'>
      <Header />
      <main className='mx-auto max-w-6xl px-4 py-10 md:px-8'>
        <div className='mb-8'>
          <PageHeading title='3Dプリンター稼働状況'>
            <p className='text-[15px] leading-7 text-muted'>
              30秒ごとに更新します。表示が少し遅れることがあるので、迷ったら現地のプリンターを見てください。
            </p>
            <OpenHours />
          </PageHeading>
        </div>
        <PrinterStatus initialResult={initialResult} />
      </main>
      <Footer />
    </div>
  );
}
