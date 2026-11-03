'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicPrinter } from '@/lib/printer-types';
import { parsePrinterApiResult } from '@/lib/printer-types';
import { describePrinter, orderForLayout, toneDots } from '@/lib/printer-display';
import { pollWhileVisible } from '@/lib/visible-polling';
import OpenHours from './OpenHours';

export default function CompactPrinterStatus() {
  const [printers, setPrinters] = useState<PublicPrinter[] | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    return pollWhileVisible(async (signal) => {
      try {
        const response = await fetch('/api/printers', { cache: 'no-store', signal });
        const parsed = parsePrinterApiResult(await response.json());
        if (signal.aborted) return;
        if (parsed.data !== null) {
          setPrinters(parsed.data.printers);
          setNow(new Date());
        }
        setUnavailable(parsed.error !== null);
      } catch {
        if (!signal.aborted) setUnavailable(true);
      }
    });
  }, []);

  return (
    <section className='border-y border-neutral-200 bg-neutral-50' aria-label='3Dプリンター稼働状況'>
      <div className='mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center'>
        <div className='flex shrink-0 flex-col gap-2 sm:w-64'>
          <div className='flex items-baseline gap-4'>
            <h2 className='whitespace-nowrap font-bold'>プリンター稼働状況</h2>
            <Link href='/printers' className='whitespace-nowrap text-sm text-neutral-600 underline decoration-neutral-300 underline-offset-4'>
              詳細を見る
            </Link>
          </div>
          <OpenHours compact />
        </div>

        <div className='flex min-w-0 flex-1 flex-wrap gap-x-7 gap-y-3'>
          {now &&
            orderForLayout(printers ?? []).map((printer) => {
              const view = describePrinter(printer, now);
              return (
                <div key={printer.id} className='flex min-w-40 items-center gap-3'>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${toneDots[view.tone]}`} aria-hidden='true' />
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold'>{printer.displayName}</p>
                    <p className='text-xs text-neutral-500'>{view.label}</p>
                  </div>
                </div>
              );
            })}
          {printers?.length === 0 && <p className='text-sm text-neutral-500'>登録されたプリンターはありません。</p>}
          {printers === null && <p className='text-sm text-neutral-500'>{unavailable ? '現在、状態を取得できません。' : '状態を確認しています。'}</p>}
        </div>
      </div>
    </section>
  );
}
