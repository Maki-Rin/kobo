'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicPrinter } from '@/lib/printer-types';
import { parsePrinterApiResult } from '@/lib/printer-types';
import { describePrinter, tonePriority, toneStyles } from '@/lib/printer-display';
import OpenHours from './OpenHours';

const MAX_PRINTERS = 3;

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
        // トップページでは取得失敗時に何も出さない
      }
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  if (printers === null || printers.length === 0 || now === null) return null;

  const views = printers
    .map((printer) => ({ printer, view: describePrinter(printer, now) }))
    .sort((a, b) => tonePriority[a.view.tone] - tonePriority[b.view.tone]);
  const available = views.filter(({ view }) => view.available).length;

  return (
    <section className='border-b border-gray-200 bg-gray-50'>
      <div className='container mx-auto flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between'>
        <div className='space-y-2'>
          <OpenHours compact />
          <div className='flex items-baseline gap-3'>
            <h2 className='text-sm font-bold text-gray-500'>3Dプリンター</h2>
            <p className='text-gray-900'>
              <span className='text-3xl font-bold'>{available}</span>
              <span className='ml-1 text-sm'>台 空き / {printers.length}台</span>
            </p>
          </div>
        </div>

        <ul className='flex flex-wrap gap-2'>
          {views.slice(0, MAX_PRINTERS).map(({ printer, view }) => (
            <li
              key={printer.id}
              className='flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-3 pr-1 text-sm'
            >
              <span className='font-medium text-gray-900'>{printer.displayName}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${toneStyles[view.tone]}`}>{view.label}</span>
            </li>
          ))}
        </ul>

        <Link href='/printers' className='text-sm font-bold text-gray-900 hover:underline'>
          すべて見る &gt;&gt;
        </Link>
      </div>
    </section>
  );
}
