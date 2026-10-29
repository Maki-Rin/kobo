import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import PrinterStatus from '@/components/PrinterStatus';
import { getPublicPrinters } from '@/lib/printers-server';

export const metadata: Metadata = {
  title: '3Dプリンター稼働状況 | KOBO',
  description: 'KOBOに設置された3Dプリンターの現在の稼働状況です。',
};

export const dynamic = 'force-dynamic';

export default async function PrintersPage() {
  const initialResult = await getPublicPrinters();

  return (
    <div className='min-h-screen bg-white text-black'>
      <Header />
      <main className='mx-auto max-w-6xl px-6 py-12 md:py-16'>
        <div className='mb-10 border-b border-neutral-200 pb-5'>
          <h1 className='text-3xl font-bold md:text-4xl'>
            3Dプリンター稼働状況
          </h1>
        </div>
        <PrinterStatus initialResult={initialResult} />
      </main>
      <Footer />
    </div>
  );
}
