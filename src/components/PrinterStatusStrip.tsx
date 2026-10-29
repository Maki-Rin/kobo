'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicPrinter } from '@/lib/printer-types';
import { parsePrinterApiResult } from '@/lib/printer-types';
import { stateLabels, stateStyles } from '@/components/PrinterStatus';

const MAX_PRINTERS = 3;

const statePriority: Record<PublicPrinter['state'], number> = {
  idle: 0,
  completed: 1,
  printing: 2,
  preparing: 3,
  paused: 4,
  awaiting_collection: 5,
  error: 6,
  unknown: 7,
};

function isAvailable(printer: PublicPrinter): boolean {
  return printer.availability === 'online' && (printer.state === 'idle' || printer.state === 'completed');
}

function displayState(printer: PublicPrinter): PublicPrinter['state'] {
  return printer.availability === 'online' ? printer.state : 'unknown';
}

export default function PrinterStatusStrip() {
  const [printers, setPrinters] = useState<PublicPrinter[] | null>(null);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const response = await fetch('/api/printers', { cache: 'no-store' });
        const parsed = parsePrinterApiResult(await response.json());
        if (!disposed && parsed.data !== null) setPrinters(parsed.data.printers);
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

  if (printers === null || printers.length === 0) return null;

  const available = printers.filter(isAvailable).length;
  const shown = [...printers]
    .sort(
      (a, b) =>
        statePriority[displayState(a)] - statePriority[displayState(b)]
    )
    .slice(0, MAX_PRINTERS);

  return (
    <section className='border-b border-gray-200 bg-gray-50'>
      <div className='container mx-auto flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between'>
        <div className='flex items-baseline gap-3'>
          <h2 className='text-sm font-bold text-gray-500'>3Dプリンター</h2>
          <p className='text-gray-900'>
            <span className='text-3xl font-bold'>{available}</span>
            <span className='ml-1 text-sm'>台 空き / {printers.length}台</span>
          </p>
        </div>

        <ul className='flex flex-wrap gap-2'>
          {shown.map((printer) => {
            const state = displayState(printer);
            return (
              <li
                key={printer.id}
                className='flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-3 pr-1 text-sm'
              >
                <span className='font-medium text-gray-900'>
                  {printer.displayName}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${stateStyles[state]}`}
                >
                  {printer.availability === 'online'
                    ? stateLabels[state]
                    : 'オフライン'}
                  {state === 'printing' && printer.progressPercent !== null
                    ? ` ${Math.round(printer.progressPercent)}%`
                    : ''}
                </span>
              </li>
            );
          })}
        </ul>

        <Link
          href='/printers'
          className='text-sm font-bold text-gray-900 hover:underline'
        >
          すべて見る &gt;&gt;
        </Link>
      </div>
    </section>
  );
}
