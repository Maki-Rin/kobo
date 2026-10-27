'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PrinterApiResult, PublicPrinter, PublicPrintersResponse } from '@/lib/printer-types';
import { parsePrinterApiResult } from '@/lib/printer-types';
import { describePrinter, tonePriority, toneStyles } from '@/lib/printer-display';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '時刻不明';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function minutes(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value >= 60 ? `${Math.floor(value / 60)}時間${value % 60}分` : `${value}分`;
}

function PrinterCard({ printer, now }: { printer: PublicPrinter; now: Date }) {
  const view = describePrinter(printer, now);
  const work = printer.currentWork;
  const remaining =
    work?.estimatedTotalMinutes != null && work.elapsedMinutes != null
      ? Math.max(0, work.estimatedTotalMinutes - work.elapsedMinutes)
      : null;

  return (
    <article className={`rounded-2xl border-2 border-ink bg-paper p-5 ${view.tone === 'off' ? 'bg-off/40' : ''}`}>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-lg font-extrabold'>{printer.displayName}</h2>
          <p className='mt-0.5 text-sm text-muted'>{printer.model}</p>
        </div>
        <span className={`pop-chip shrink-0 ${toneStyles[view.tone]}`}>{view.label}</span>
      </div>

      {view.note && <p className='mt-3 rounded-lg border-[1.5px] border-ink bg-cream px-3 py-2 text-sm'>{view.note}</p>}
      {view.detail && <p className='mt-3 text-sm text-muted'>{view.detail}</p>}

      {view.progress !== null && (
        <div className='mt-5'>
          <div className='mb-2 flex justify-between text-sm'>
            <span className='text-muted'>進捗</span>
            <span className='font-bold'>{Math.round(view.progress)}%</span>
          </div>
          <div
            className='h-3 overflow-hidden rounded-full border-[1.5px] border-ink bg-paper'
            role='progressbar'
            aria-label={`${printer.displayName}の造形進捗`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(view.progress)}
          >
            <div className='h-full bg-busy transition-[width]' style={{ width: `${view.progress}%` }} />
          </div>
        </div>
      )}

      <dl className='mt-5 space-y-3 border-t-[1.5px] border-dashed border-line-soft pt-4 text-sm'>
        {printer.state === 'printing' || printer.state === 'paused' || printer.state === 'preparing' ? (
          <>
            <div className='flex items-start justify-between gap-4'>
              <dt className='shrink-0 text-muted'>造形中のファイル</dt>
              <dd className='min-w-0 break-all text-right font-medium'>{view.fileName ?? '—'}</dd>
            </div>
            <div className='flex items-start justify-between gap-4'>
              <dt className='shrink-0 text-muted'>経過・残り</dt>
              <dd className='text-right font-medium'>
                {minutes(work?.elapsedMinutes) ?? '—'}
                {remaining !== null && ` ／ あと約${minutes(remaining)}`}
              </dd>
            </div>
          </>
        ) : (
          printer.lastWork && (
            <div className='flex items-start justify-between gap-4'>
              <dt className='shrink-0 text-muted'>前回の印刷</dt>
              <dd className='min-w-0 break-all text-right font-medium'>
                {printer.lastWork.fileName ?? '—'}
                {printer.lastWork.endedAt && (
                  <span className='block text-xs font-normal text-muted'>{formatDate(printer.lastWork.endedAt)} に終了</span>
                )}
              </dd>
            </div>
          )
        )}
        <div className='flex items-start justify-between gap-4'>
          <dt className='shrink-0 text-muted'>最終確認</dt>
          <dd className='text-right font-medium'>{formatDate(printer.lastSeenAt)}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function PrinterStatus({ initialResult }: { initialResult: PrinterApiResult }) {
  const [data, setData] = useState<PublicPrintersResponse | null>(initialResult.data);
  const [error, setError] = useState<string | null>(initialResult.error);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date(initialResult.data?.generatedAt ?? 0));

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
          setNow(new Date());
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

  const views = useMemo(
    () =>
      (data?.printers ?? [])
        .map((printer) => ({ printer, view: describePrinter(printer, now) }))
        .sort((a, b) => tonePriority[a.view.tone] - tonePriority[b.view.tone]),
    [data, now]
  );

  const summary = {
    total: views.length,
    available: views.filter(({ view }) => view.available).length,
    busy: views.filter(({ view }) => view.tone === 'busy').length,
    attention: views.filter(({ view }) => view.tone === 'wait' || view.tone === 'alert').length,
  };

  return (
    <div aria-live='polite'>
      {error !== null && (
        <div className='mb-6 rounded-xl border-2 border-ink bg-cream px-4 py-3 text-sm'>
          {error} {data !== null && '最後に取得できた状態を表示しています。'}
        </div>
      )}

      <div className='mb-6 grid grid-cols-2 gap-3 md:grid-cols-4'>
        {(
          [
            ['空き', summary.available],
            ['造形中', summary.busy],
            ['一時停止・エラー', summary.attention],
            ['登録', summary.total],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className='rounded-xl border-2 border-ink bg-paper px-4 py-3'>
            <p className='text-sm font-semibold text-muted'>{label}</p>
            <p className='mt-1 text-3xl font-extrabold'>{value}</p>
          </div>
        ))}
      </div>

      {views.length === 0 ? (
        <div className='rounded-2xl border-2 border-dashed border-line-soft p-10 text-center'>
          <h2 className='text-xl font-bold'>プリンター状態を準備中です</h2>
          <p className='mt-2 text-muted'>稼働状況が登録されるまでしばらくお待ちください。</p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {views.map(({ printer }) => (
            <PrinterCard key={printer.id} printer={printer} now={now} />
          ))}
        </div>
      )}

      <p className='mt-6 text-sm text-muted'>
        {data === null ? '更新時刻不明' : `データ更新: ${formatDate(data.generatedAt)}`}
        {refreshing && ' · 更新確認中'}
      </p>

      <details className='mt-6 rounded-xl border-2 border-ink p-4 text-sm'>
        <summary className='cursor-pointer font-semibold'>表示の見方</summary>
        <ul className='mt-3 space-y-1'>
          <li>空き：使えます。「印刷完了」のときは前の人の造形物が残っていることがあるので、横に置いてから始めてください。</li>
          <li>造形中：印刷しています。残り時間は目安です。</li>
          <li>一時停止・エラー：フィラメント切れなどで止まっています。分からなければスタッフに声をかけてください。</li>
          <li>オフライン・電源オフ：状態が取れていません。最後に分かった状態を薄く出しています。開室時間外は基本的に電源を切っています。</li>
          <li>メンテナンス中：スタッフが調整中です。</li>
        </ul>
      </details>
    </div>
  );
}
