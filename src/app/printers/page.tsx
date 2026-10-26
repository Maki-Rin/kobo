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
    <div className='min-h-screen bg-slate-50 text-slate-950'>
      <Header />
      <main className='container mx-auto px-6 py-10'>
        <div className='mx-auto mb-8 max-w-6xl'>
          <p className='mb-2 text-sm font-semibold tracking-[0.2em] text-blue-700'>
            LIVE STATUS
          </p>
          <h1 className='text-3xl font-bold tracking-tight md:text-4xl'>
            3Dプリンター稼働状況
          </h1>
          <p className='mt-3 max-w-3xl text-slate-600'>
            状態閲覧専用です。この画面から印刷申請やプリンター操作はできません。
            表示が古い場合は、現地のプリンター表示を優先してください。
          </p>
        </div>
        <PrinterStatus initialResult={initialResult} />
      </main>
      <Footer />
    </div>
  );
}
