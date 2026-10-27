'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicPrinter } from '@/lib/printer-types';
import { parsePrinterApiResult } from '@/lib/printer-types';
import { describePrinter, tonePriority, toneStyles } from '@/lib/printer-display';
import OpenHours from './OpenHours';

const timeFormatter = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' });

export default function PrinterStatusStrip() {
  const [printers, setPrinters] = useState<PublicPrinter[] | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const response = await fetch('/api/printers', { cache: 'no-store' });
        const parsed = parsePrinterApiResult(await response.json());
        if (!disposed && parsed.data !== null) {
          setPrinters(parsed.data.printers);
          setNow(new Date());
        }
      } catch {
        // 取れないときは開室時間だけ出す
      }
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  const views =
    printers && now
      ? printers
          .map((printer) => ({ printer, view: describePrinter(printer, now) }))
          .sort((a, b) => tonePriority[a.view.tone] - tonePriority[b.view.tone])
      : [];
  const available = views.filter(({ view }) => view.available).length;
  const today = now ? dayFormatter.format(now) : '';
  const finished = views
    .map(({ printer }) => printer)
    .filter((printer) => printer.lastWork?.endedAt && dayFormatter.format(new Date(printer.lastWork.endedAt)) === today)
    .slice(0, 3);

  return (
    <section className='relative z-10 mx-auto -mt-10 max-w-6xl px-4 md:px-8'>
      <div className='rounded-2xl border-2 border-ink bg-paper p-4 shadow-pop md:p-5'>
        <OpenHours compact />
        <div className='mt-3 flex flex-col gap-4 md:flex-row md:items-center'>
          <div className='shrink-0'>
            <p className='text-xs font-bold text-muted'>3Dプリンター</p>
            {printers ? (
              <p className='mt-1 whitespace-nowrap'>
                <span className='text-[44px] font-extrabold leading-none'>{available}</span>
                <span className='ml-1 text-sm font-semibold'>台 空き / {printers.length}台</span>
              </p>
            ) : (
              <p className='mt-1 text-sm text-muted'>状態を読み込み中…</p>
            )}
          </div>
          <ul className='flex flex-1 flex-wrap gap-2'>
            {views.map(({ printer, view }) => (
              <li key={printer.id} className={`pop-chip ${toneStyles[view.tone]}`}>
                <span>{printer.displayName}</span>
                <span className='font-normal'>{view.label}</span>
              </li>
            ))}
          </ul>
          <Link href='/printers' className='pop-btn self-start md:self-auto'>
            全部見る →
          </Link>
        </div>
        {finished.length > 0 && (
          <p className='mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t-[1.5px] border-dashed border-line-soft pt-3 text-sm'>
            <span className='font-bold'>今日終わった印刷</span>
            {finished.map((printer) => (
              <span key={printer.id}>
                {printer.displayName} {timeFormatter.format(new Date(printer.lastWork!.endedAt!))}に終了
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
