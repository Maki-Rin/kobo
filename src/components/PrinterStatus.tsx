'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  PrinterApiResult,
  PublicPrinter,
  PublicPrintersResponse,
} from '@/lib/printer-types';
import { parsePrinterApiResult } from '@/lib/printer-types';

export const availabilityLabels: Record<PublicPrinter['availability'], string> = {
  online: 'オンライン',
  stale: '更新遅延',
  offline: 'オフライン',
  disabled: '監視停止',
  maintenance: 'メンテナンス',
  unknown: '不明',
};

export const stateLabels: Record<PublicPrinter['state'], string> = {
  unknown: '状態不明',
  idle: '待機中',
  preparing: '準備中',
  printing: '造形中',
  paused: '一時停止',
  awaiting_collection: '回収待ち',
  error: 'エラー',
};

export const stateStyles: Record<PublicPrinter['state'], string> = {
  unknown: 'bg-slate-100 text-slate-700',
  idle: 'bg-emerald-100 text-emerald-800',
  preparing: 'bg-amber-100 text-amber-900',
  printing: 'bg-blue-100 text-blue-800',
  paused: 'bg-orange-100 text-orange-900',
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
    <article className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-xl font-bold'>{printer.displayName}</h2>
          <p className='mt-1 text-sm text-slate-500'>{printer.model}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${stateStyles[printer.state]}`}
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
            className='h-2.5 overflow-hidden rounded-full bg-slate-200'
            role='progressbar'
            aria-label={`${printer.displayName}の造形進捗`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(printer.progressPercent)}
          >
            <div
              className='h-full rounded-full bg-blue-600 transition-[width]'
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
              : '現在値なし'}
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

  const summary = useMemo(() => {
    const printers = data?.printers ?? [];
    return {
      total: printers.length,
      printing: printers.filter((printer) => printer.state === 'printing').length,
      available: printers.filter(
        (printer) =>
          printer.availability === 'online' && printer.state === 'idle'
      ).length,
      attention: printers.filter(
        (printer) =>
          printer.availability !== 'online' ||
          ['awaiting_collection', 'error'].includes(printer.state)
      ).length,
    };
  }, [data]);

  return (
    <div className='mx-auto max-w-6xl' aria-live='polite'>
      {error !== null && (
        <div className='mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950'>
          {error} {data !== null && '最後に取得できた状態を表示しています。'}
        </div>
      )}

      <div className='mb-6 grid grid-cols-2 gap-3 md:grid-cols-4'>
        {[
          ['登録', summary.total],
          ['造形中', summary.printing],
          ['待機中', summary.available],
          ['要確認', summary.attention],
        ].map(([label, value]) => (
          <div key={label} className='rounded-xl border border-slate-200 bg-white p-4'>
            <p className='text-sm text-slate-500'>{label}</p>
            <p className='mt-1 text-2xl font-bold'>{value}</p>
          </div>
        ))}
      </div>

      {data === null || data.printers.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center'>
          <h2 className='text-xl font-bold'>プリンター状態を準備中です</h2>
          <p className='mt-2 text-slate-600'>
            稼働状況が登録されるまでしばらくお待ちください。
          </p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {data.printers.map((printer) => (
            <PrinterCard key={printer.id} printer={printer} />
          ))}
        </div>
      )}

      <div className='mt-6 flex flex-col justify-between gap-3 text-sm text-slate-500 sm:flex-row'>
        <p>
          {data === null ? '更新時刻不明' : `データ更新: ${formatDate(data.generatedAt)}`}
          {refreshing && ' · 更新確認中'}
        </p>
        <Link href='/articles/printer-status' className='font-semibold text-blue-700 hover:underline'>
          状態表示の見方
        </Link>
      </div>
    </div>
  );
}
