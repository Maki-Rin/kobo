import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { getAdminPrinters, PrinterAdminError } from '@/lib/printer-admin';
import type { AdminPrinters } from '@/lib/printer-admin-types';
import PrinterControlPanel from '../_components/PrinterControlPanel';
import { pageTitle } from '../_components/ui';

export default async function PrintersAdminPage() {
  const user = await currentUser();
  if (!user) redirect('/admin');
  let initial: AdminPrinters | null = null;
  let error: string | null = null;
  try {
    initial = await getAdminPrinters();
  } catch (caught) {
    error = caught instanceof PrinterAdminError ? caught.message : 'プリンターの状態を取得できませんでした';
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className={pageTitle}>プリンター</h1>
        <p className='mt-1 text-sm text-slate-500'>
          一時停止・再開・中止とライトの操作ができます。操作は数秒〜十数秒でプリンターに届きます。
        </p>
      </div>
      <PrinterControlPanel initial={initial} initialError={error} />
    </div>
  );
}
