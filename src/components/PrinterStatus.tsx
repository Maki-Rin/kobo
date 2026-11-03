'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PrinterApiResult, PublicPrinter, PublicPrintersResponse } from '@/lib/printer-types';
import { parsePrinterApiResult } from '@/lib/printer-types';
import { describePrinter, printerLayout, tonePriority, toneStyles } from '@/lib/printer-display';
import { pollWhileVisible } from '@/lib/visible-polling';

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

const outcomeLabels: Record<NonNullable<PublicPrinter['lastWork']>['outcome'], string> = {
  success: '完了',
  canceled: '中止',
  failed: '失敗',
  unknown: '不明',
};

const outcomeStyles: Record<NonNullable<PublicPrinter['lastWork']>['outcome'], string> = {
  success: 'bg-emerald-100 text-emerald-800',
  canceled: 'bg-slate-100 text-slate-700',
  failed: 'bg-red-100 text-red-800',
  unknown: 'bg-slate-100 text-slate-700',
};

function lastFinished(printer: PublicPrinter): PublicPrinter['lastWork'] {
  if (printer.lastWork) return printer.lastWork;
  if (printer.state === 'completed' && printer.currentWork) {
    return {
      fileName: printer.currentWork.fileName,
      outcome: 'success',
      durationMinutes: printer.currentWork.elapsedMinutes,
      endedAt: null,
    };
  }
  return null;
}

function PrinterCard({ printer, now }: { printer: PublicPrinter; now: Date }) {
  const view = describePrinter(printer, now);
  const finished = lastFinished(printer);
  const work = printer.currentWork;
  const remaining =
    work?.estimatedTotalMinutes != null && work.elapsedMinutes != null
      ? Math.max(0, work.estimatedTotalMinutes - work.elapsedMinutes)
      : null;

  return (
    <article className={`rounded-lg border border-neutral-200 p-5 shadow-sm ${view.tone === 'off' ? 'bg-neutral-50' : 'bg-white'}`}>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-xl font-bold'>{printer.displayName}</h2>
          <p className='mt-1 text-sm text-slate-500'>{printer.model}</p>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-bold ${toneStyles[view.tone]}`}>{view.label}</span>
      </div>

      {view.note && <p className='mt-3 border border-[#f5c518] bg-[#fff9dc] px-3 py-2 text-sm'>{view.note}</p>}
      {view.detail && <p className='mt-3 text-sm text-slate-500'>{view.detail}</p>}

      {view.progress !== null && (
        <div className='mt-5'>
          <div className='mb-2 flex justify-between text-sm'>
            <span className='text-slate-600'>進捗</span>
            <span className='font-bold'>{Math.round(view.progress)}%</span>
          </div>
          <div
            className='h-2.5 overflow-hidden rounded-full bg-neutral-100'
            role='progressbar'
            aria-label={`${printer.displayName}の造形進捗`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(view.progress)}
          >
            <div className='h-full bg-[#165d8c] transition-[width]' style={{ width: `${view.progress}%` }} />
          </div>
        </div>
      )}

      <dl className='mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm'>
        {printer.state === 'printing' || printer.state === 'paused' || printer.state === 'preparing' ? (
          <>
            {view.fileName && <div className='flex items-start justify-between gap-4'>
              <dt className='shrink-0 text-slate-500'>造形中のファイル</dt>
              <dd className='min-w-0 break-all text-right font-medium'>{view.fileName ?? '—'}</dd>
            </div>}
            <div className='flex items-start justify-between gap-4'>
              <dt className='shrink-0 text-slate-500'>経過・残り</dt>
              <dd className='text-right font-medium'>
                {minutes(work?.elapsedMinutes) ?? '—'}
                {remaining !== null && ` ／ あと約${minutes(remaining)}`}
              </dd>
            </div>
          </>
        ) : (
          finished && (
            <div>
              <dt className='flex items-center justify-between gap-2 text-slate-500'>
                直近の印刷
                <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${outcomeStyles[finished.outcome]}`}>{outcomeLabels[finished.outcome]}</span>
              </dt>
              {finished.fileName && <dd className='mt-2 break-all font-medium'>{finished.fileName}</dd>}
              <dd className='mt-1 text-slate-500'>
                {[
                  finished.endedAt && `${formatDate(finished.endedAt)} に終了`,
                  minutes(finished.durationMinutes) && `${minutes(finished.durationMinutes)}かかりました`,
                ]
                  .filter(Boolean)
                  .join('・')}
              </dd>
            </div>
          )
        )}
        <div className='flex items-start justify-between gap-4'>
          <dt className='shrink-0 text-slate-500'>最終確認</dt>
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
    return pollWhileVisible(async (signal) => {
      setRefreshing(true);
      try {
        const response = await fetch('/api/printers', { cache: 'no-store', signal });
        const parsed = parsePrinterApiResult(await response.json());
        if (!signal.aborted) {
          if (parsed.data !== null) setData(parsed.data);
          setError(parsed.error);
          setNow(new Date());
        }
      } catch {
        if (!signal.aborted) setError('最新状態を取得できませんでした。');
      } finally {
        if (!signal.aborted) setRefreshing(false);
      }
    }, { immediate: false });
  }, []);

  const views = useMemo(
    () =>
      (data?.printers ?? [])
        .map((printer) => ({ printer, view: describePrinter(printer, now) }))
        .sort((a, b) => tonePriority[a.view.tone] - tonePriority[b.view.tone]),
    [data, now]
  );

  const unplaced = (data?.printers ?? []).filter((printer) => !printerLayout.includes(printer.id));

  const summary = {
    total: views.length,
    available: views.filter(({ view }) => view.available).length,
    busy: views.filter(({ view }) => view.tone === 'busy').length,
    attention: views.filter(({ view }) => view.tone === 'wait' || view.tone === 'alert').length,
  };

  return (
    <div aria-live='polite'>
      {error !== null && (
        <div className='mb-8 border border-[#f5c518] bg-[#fff9dc] px-4 py-3 text-sm text-black'>
          {error} {data !== null && '最後に取得できた状態を表示しています。'}
        </div>
      )}

      <div className='mb-6 grid grid-cols-3 gap-3 md:max-w-xl'>
        {(
          [
            ['空き', summary.available],
            ['造形中', summary.busy],
            ['一時停止・エラー', summary.attention],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className='border-l-2 border-neutral-200 pl-4'>
            <p className='text-sm text-neutral-500'>{label}</p>
            <p className='technical-type mt-1 text-3xl font-bold'>{value}</p>
          </div>
        ))}
      </div>

      {views.length === 0 ? (
        <div className='rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-10'>
          <h2 className='text-xl font-bold'>プリンター状態を準備中です</h2>
          <p className='mt-2 text-slate-600'>稼働状況が登録されるまでしばらくお待ちください。</p>
        </div>
      ) : (
        <div className='space-y-2'>
          <p className='text-xs text-neutral-500'>現地の置き場所と同じ並びです（上の段 4〜1、下の段 8〜5）。</p>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {[...printerLayout, ...unplaced.map((printer) => printer.id)].map((id) => {
              const printer = data?.printers.find((item) => item.id === id);
              return printer ? (
                <PrinterCard key={id} printer={printer} now={now} />
              ) : (
                <div
                  key={id}
                  className='flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-500'
                >
                  <span className='font-bold'>KOBO Printer {Number(id.slice(-2))}</span>
                  <span>まだ登録していません</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className='mt-6 text-sm text-slate-500'>
        {data === null ? '更新時刻不明' : `データ更新: ${formatDate(data.generatedAt)}`}
        {refreshing && ' · 更新確認中'}
      </p>

      <details className='mt-8 border-t border-neutral-200 pt-5 text-sm'>
        <summary className='cursor-pointer font-semibold'>表示の見方</summary>
        <ul className='mt-3 space-y-1 text-neutral-600'>
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
