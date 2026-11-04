import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { getAdminPrinters, PrinterAdminError } from '@/lib/printer-admin';
import { comparePrinters, type AdminPrinters } from '@/lib/printer-admin-types';
import PrinterControlPanel from '../_components/PrinterControlPanel';
import { pageTitle } from '../_components/ui';

export default async function PrintersAdminPage({ searchParams }: { searchParams: Promise<{ printer?: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/admin');
  const requested = (await searchParams).printer ?? null;
  let initial: AdminPrinters | null = null;
  let error: string | null = null;
  try {
    initial = await getAdminPrinters();
  } catch (caught) {
    error = caught instanceof PrinterAdminError ? caught.message : 'プリンターの状態を取得できませんでした';
  }
  const printers = [...(initial?.printers ?? [])].sort(comparePrinters);
  const selected = printers.find((printer) => printer.id === requested)?.id ?? printers[0]?.id ?? null;

  return (
    <div className='space-y-5'>
      <div>
        <h1 className={pageTitle}>プリンター</h1>
        <p className='mt-1 text-sm text-slate-500'>
          一覧から選んだプリンターの庫内カメラを見ながら、一時停止・再開・中止とライトを操作できます。操作は数秒〜十数秒で届きます。
        </p>
      </div>
      <PrinterControlPanel initial={initial} initialError={error} initialSelected={selected} />
    </div>
  );
}
