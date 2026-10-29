'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  PrinterApiResult,
  PublicPrinter,
  PublicPrintersResponse,
} from '@/lib/printer-types';
import { orderPrintersForLayout, parsePrinterApiResult } from '@/lib/printer-types';

const availabilityLabels: Record<PublicPrinter['availability'], string> = {
  online: 'オンライン',
  stale: '更新遅延',
  offline: 'オフライン',
  disabled: '監視停止',
  maintenance: 'メンテナンス',
  unknown: '不明',
};

const stateLabels: Record<PublicPrinter['state'], string> = {
  unknown: '状態不明',
  idle: '待機中',
  preparing: '準備中',
  printing: '造形中',
  paused: '一時停止',
  completed: '造形完了',
  awaiting_collection: '回収待ち',
  error: 'エラー',
};

const stateStyles: Record<PublicPrinter['state'], string> = {
  unknown: 'bg-slate-100 text-slate-700',
  idle: 'bg-emerald-100 text-emerald-800',
  preparing: 'bg-amber-100 text-amber-900',
  printing: 'bg-blue-100 text-blue-800',
  paused: 'bg-orange-100 text-orange-900',
  completed: 'bg-violet-100 text-violet-900',
  awaiting_collection: 'bg-violet-100 text-violet-900',
  error: 'bg-red-100 text-red-800',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '時刻不明';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function PrinterCard({ printer }: { printer: PublicPrinter }) {
  const isCurrent = printer.availability === 'online';
  return (
    <article className='rounded-lg border border-neutral-200 bg-white p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-xl font-bold'>{printer.displayName}</h2>
          <p className='mt-1 text-sm text-slate-500'>{printer.model}</p>
        </div>
        <span
          className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-bold ${stateStyles[printer.state]}`}
        >
          {stateLabels[printer.state]}
        </span>
      </div>

      <div className='mt-5 flex items-center gap-2 text-sm'>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            printer.availability === 'online'
              ? 'bg-emerald-500'
              : printer.availability === 'stale'
                ? 'bg-amber-500'
                : 'bg-slate-400'
          }`}
          aria-hidden='true'
        />
        <span className='font-semibold'>
          {availabilityLabels[printer.availability]}
        </span>
      </div>

      {isCurrent && printer.progressPercent !== null && (
        <div className='mt-5'>
          <div className='mb-2 flex justify-between text-sm'>
            <span className='text-slate-600'>進捗</span>
            <span className='font-bold'>{Math.round(printer.progressPercent)}%</span>
          </div>
          <div
            className='h-2.5 overflow-hidden rounded-full bg-neutral-100'
            role='progressbar'
            aria-label={`${printer.displayName}の造形進捗`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(printer.progressPercent)}
          >
            <div
              className='h-full bg-[#165d8c] transition-[width]'
              style={{ width: `${printer.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <dl className='mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm'>
        <div className='flex items-start justify-between gap-4'>
          <dt className='shrink-0 text-slate-500'>現在のモデル</dt>
          <dd className='min-w-0 break-all text-right font-medium'>
            {isCurrent
              ? (printer.currentWork?.fileName ?? '表示なし')
              : '—'}
          </dd>
        </div>
        <div className='flex items-start justify-between gap-4'>
          <dt className='shrink-0 text-slate-500'>造形時間</dt>
          <dd className='text-right font-medium'>
            {isCurrent && printer.currentWork?.elapsedMinutes !== null &&
            printer.currentWork?.elapsedMinutes !== undefined
              ? `${printer.currentWork.elapsedMinutes}分`
              : '—'}
          </dd>
        </div>
        <div className='flex items-start justify-between gap-4'>
          <dt className='shrink-0 text-slate-500'>最終確認</dt>
          <dd className='text-right font-medium'>{formatDate(printer.lastSeenAt)}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function PrinterStatus({
  initialResult,
}: {
  initialResult: PrinterApiResult;
}) {
  const [data, setData] = useState<PublicPrintersResponse | null>(
    initialResult.data
  );
  const [error, setError] = useState<string | null>(initialResult.error);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      setRefreshing(true);
      try {
        const response = await fetch('/api/printers', { cache: 'no-store' });
        const parsed = parsePrinterApiResult(await response.json());
        if (!disposed) {
          if (parsed.data !== null) setData(parsed.data);
          setError(parsed.error);
        }
      } catch {
        if (!disposed) setError('最新状態を取得できませんでした。');
      } finally {
        if (!disposed) setRefreshing(false);
      }
    };
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  const orderedPrinters = useMemo(
    () => orderPrintersForLayout(data?.printers ?? []),
    [data],
  );

  return (
    <div aria-live='polite'>
      {error !== null && (
        <div className='mb-8 border border-[#f5c518] bg-[#fff9dc] px-4 py-3 text-sm text-black'>
          {error} {data !== null && '最後に取得できた状態を表示しています。'}
        </div>
      )}

      {data === null || data.printers.length === 0 ? (
        <div className='rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-10 text-left'>
          <h2 className='text-xl font-bold'>プリンター状態を準備中です</h2>
          <p className='mt-2 text-slate-600'>
            稼働状況が登録されるまでしばらくお待ちください。
          </p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {orderedPrinters.map((printer) => (
            <PrinterCard key={printer.id} printer={printer} />
          ))}
        </div>
      )}

      <div className='mt-6 flex flex-col justify-between gap-3 text-sm text-slate-500 sm:flex-row'>
        <p>
          {data === null ? '更新時刻不明' : `データ更新: ${formatDate(data.generatedAt)}`}
          {refreshing && ' · 更新確認中'}
        </p>
      </div>
    </div>
  );
}
