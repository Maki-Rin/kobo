'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicPrintersResponse } from '@/lib/printer-types';
import { orderPrintersForLayout, parsePrinterApiResult } from '@/lib/printer-types';

const labels = {
  unknown: '状態不明',
  idle: '待機中',
  preparing: '準備中',
  printing: '造形中',
  paused: '一時停止',
  completed: '造形完了',
  awaiting_collection: '回収待ち',
  error: '要確認',
};

const availabilityLabels = {
  online: null,
  stale: '更新遅延',
  offline: 'オフライン',
  disabled: '監視対象外',
  maintenance: 'メンテナンス',
  unknown: '状態不明',
};

export default function CompactPrinterStatus() {
  const [data, setData] = useState<PublicPrintersResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch('/api/printers', { cache: 'no-store' });
        const result = parsePrinterApiResult(await response.json());
        if (!active) return;
        if (result.data) setData(result.data);
        setUnavailable(result.error !== null);
      } catch {
        if (active) setUnavailable(true);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className='border-y border-neutral-200 bg-neutral-50' aria-label='3Dプリンター稼働状況'>
      <div className='mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center'>
        <div className='flex shrink-0 items-baseline gap-4 sm:w-64'>
          <h2 className='whitespace-nowrap font-bold'>プリンター稼働状況</h2>
          <Link href='/printers' className='whitespace-nowrap text-sm text-neutral-600 underline decoration-neutral-300 underline-offset-4'>
            詳細を見る
          </Link>
        </div>

        <div className='flex min-w-0 flex-1 flex-wrap gap-x-7 gap-y-3'>
          {orderPrintersForLayout(data?.printers ?? []).map((printer) => (
            <div key={printer.id} className='flex min-w-40 items-center gap-3'>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  printer.availability !== 'online'
                    ? 'bg-neutral-400'
                    : printer.state === 'printing'
                      ? 'bg-blue-600'
                      : printer.state === 'error'
                        ? 'bg-red-600'
                        : 'bg-emerald-500'
                }`}
                aria-hidden='true'
              />
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold'>{printer.displayName}</p>
                <p className='text-xs text-neutral-500'>
                  {availabilityLabels[printer.availability] ?? labels[printer.state]}
                  {printer.state === 'printing' && printer.progressPercent !== null
                    ? ` ${Math.round(printer.progressPercent)}%`
                    : ''}
                </p>
              </div>
            </div>
          ))}
          {data?.printers.length === 0 && <p className='text-sm text-neutral-500'>登録されたプリンターはありません。</p>}
          {data === null && <p className='text-sm text-neutral-500'>{unavailable ? '現在、状態を取得できません。' : '状態を確認しています。'}</p>}
        </div>
      </div>
    </section>
  );
}
