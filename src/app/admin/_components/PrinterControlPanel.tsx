'use client';

import { useEffect, useState } from 'react';
import { describePrinter, orderForLayout, toneStyles } from '@/lib/printer-display';
import { errorCodeMeaning } from '@/lib/printer-error-codes';
import { pollWhileVisible } from '@/lib/visible-polling';
import type { AdminPrinter, AdminPrinters, CameraStatus, CommandStatus, PrinterAction, PrinterCommand } from '@/lib/printer-admin-types';
import { acknowledgePrinterErrorAction, loadPrintersAction, printerCommandAction } from '../actions';
import ErrorList from './ErrorList';
import { relativeTime } from './relativeTime';
import { badge, button, card } from './ui';

const actionLabels: Record<PrinterAction, string> = {
  pause: '一時停止',
  resume: '再開',
  cancel: '中止',
  light_on: 'ライトをつける',
  light_off: 'ライトを消す',
};

const statusLabels: Record<CommandStatus, string> = {
  pending: '送信待ち',
  sent: 'プリンターへ送信中',
  succeeded: '完了',
  failed: '失敗',
  expired: '届かず取り消し',
};

const statusStyles: Record<CommandStatus, string> = {
  pending: 'bg-blue-50 text-blue-800',
  sent: 'bg-blue-50 text-blue-800',
  succeeded: 'bg-emerald-50 text-emerald-800',
  failed: 'bg-red-50 text-red-800',
  expired: 'bg-slate-100 text-slate-700',
};

const time = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function PrinterControlPanel({ initial, initialError }: { initial: AdminPrinters | null; initialError: string | null }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState(initialError);

  const refresh = async () => {
    const result = await loadPrintersAction();
    if (result.ok) {
      setData(result.value);
      setError(null);
    } else {
      setError(result.errors[0] ?? null);
    }
  };

  useEffect(() => pollWhileVisible(refresh, { immediate: false, interval: 5_000 }), []);

  if (data === null) return <ErrorList errors={[error ?? 'プリンターの状態を取得できませんでした']} />;
  const now = new Date(data.generatedAt);

  return (
    <div className='space-y-6'>
      {error && <ErrorList errors={[`${error}（最後に取得できた状態を表示しています）`]} />}
      <div className='grid gap-4 lg:grid-cols-2'>
        {orderForLayout(data.printers).map((printer) => (
          <PrinterCard
            key={printer.id}
            printer={printer as AdminPrinter}
            latest={data.commands.find((command) => command.printerId === printer.id) ?? null}
            now={now}
            onChange={refresh}
          />
        ))}
      </div>
      <History commands={data.commands} printers={data.printers} now={now} />
    </div>
  );
}

function PrinterCard({ printer, latest, now, onChange }: { printer: AdminPrinter; latest: PrinterCommand | null; now: Date; onChange: () => Promise<void> }) {
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const view = describePrinter(printer, now);
  const online = printer.availability === 'online';
  const state = printer.state;
  const waiting = latest !== null && (latest.status === 'pending' || latest.status === 'sent');
  const disabled = !online || busy || waiting;

  const run = async (task: () => Promise<{ ok: true } | { ok: false; errors: string[] }>) => {
    setBusy(true);
    setErrors([]);
    const result = await task();
    setBusy(false);
    setConfirmCancel(false);
    if (!result.ok) setErrors(result.errors);
    await onChange();
  };
  const send = (action: PrinterAction) => run(() => printerCommandAction(printer.id, action));

  const errorCode = printer.reportedState === 'error' ? printer.reportedErrorCode : null;
  const acknowledged = errorCode !== null && printer.acknowledgedErrorCode === errorCode;
  const meaning = errorCode === null ? null : errorCodeMeaning(errorCode);

  return (
    <section className={`${card} space-y-4 p-5`}>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h2 className='font-bold'>{printer.displayName}</h2>
          <p className='mt-0.5 text-sm text-slate-500'>{printer.currentWork?.fileName ?? printer.model}</p>
        </div>
        <span className={`${badge} ${toneStyles[view.tone]}`}>{view.label}</span>
      </div>

      {online && <CameraView printer={printer} now={now} />}

      {errorCode !== null && (
        <div className={`rounded-md border px-3.5 py-3 text-sm ${acknowledged ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50'}`}>
          <p className='font-medium'>
            エラーコード {errorCode}
            {meaning && `：${meaning.text}`}
            {meaning && !meaning.official && '（公式の一覧には載っていません）'}
          </p>
          {acknowledged ? (
            <p className='mt-1 text-slate-600'>確認済みとして、公開ページでは「空き」と表示しています。別のエラーが出たら、またエラー表示に戻ります。</p>
          ) : (
            <div className='mt-2 space-y-2'>
              <p className='text-slate-700'>本体が印刷できる状態なのにコードだけ残っている場合は、確認済みにすると公開ページの表示を「空き」に戻せます。本体には何も送りません。</p>
              <button disabled={busy || !online} onClick={() => run(() => acknowledgePrinterErrorAction(printer.id, errorCode))} className={button('secondary', 'sm')}>
                確認して「空き」にする
              </button>
            </div>
          )}
        </div>
      )}

      {confirmCancel ? (
        <div className='space-y-3 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm'>
          <p className='font-medium text-red-900'>
            {printer.displayName} の造形「{printer.currentWork?.fileName ?? 'ファイル名不明'}」を中止します。中止した造形は再開できません。
          </p>
          <div className='flex gap-2'>
            <button onClick={() => setConfirmCancel(false)} className={button('secondary', 'sm')}>やめる</button>
            <button disabled={disabled} onClick={() => send('cancel')} className={button('danger', 'sm')}>中止する</button>
          </div>
        </div>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {(state === 'printing' || state === 'preparing') && (
            <button disabled={disabled} onClick={() => send('pause')} className={button('secondary', 'sm')}>{actionLabels.pause}</button>
          )}
          {state === 'paused' && (
            <button disabled={disabled} onClick={() => send('resume')} className={button('primary', 'sm')}>{actionLabels.resume}</button>
          )}
          {(state === 'printing' || state === 'preparing' || state === 'paused') && (
            <button disabled={disabled} onClick={() => setConfirmCancel(true)} className={button('dangerOutline', 'sm')}>{actionLabels.cancel}</button>
          )}
          <button disabled={disabled} onClick={() => send('light_on')} className={button('ghost', 'sm')}>{actionLabels.light_on}</button>
          <button disabled={disabled} onClick={() => send('light_off')} className={button('ghost', 'sm')}>{actionLabels.light_off}</button>
        </div>
      )}

      {!online && <p className='text-sm text-slate-500'>プリンターと通信できていないため、操作できません。</p>}
      {latest && (
        <p className='text-xs text-slate-500'>
          最後の操作：{actionLabels[latest.action]}（{latest.requestedBy}、{relativeTime(latest.requestedAt, now.getTime())}）
          <span className={`${badge} ml-1.5 ${statusStyles[latest.status]}`}>{statusLabels[latest.status]}</span>
          {latest.status === 'failed' && latest.detail && <span className='ml-1'>{latest.detail}</span>}
        </p>
      )}
      <ErrorList errors={errors} />
    </section>
  );
}

const cameraProblems: Record<Exclude<CameraStatus, 'ok'>, string> = {
  off: 'カメラの配信が止まっています。オンにする命令を送りました。1分ほどたっても映らなければ、本体の設定でカメラをオンにしてください。',
  unreachable: 'カメラに接続できません。',
  error: 'カメラの画像を読み取れませんでした。',
};

function CameraView({ printer, now }: { printer: AdminPrinter; now: Date }) {
  const camera = printer.camera;
  const capturedAt = camera?.capturedAt ?? null;
  const problem = camera !== null && camera.status !== 'ok' ? cameraProblems[camera.status] : null;
  return (
    <div className='space-y-1.5'>
      <div className='relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100'>
        {capturedAt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/admin/printers/${printer.id}/snapshot?t=${encodeURIComponent(capturedAt)}`}
            alt={`${printer.displayName}の庫内`}
            className={`h-full w-full object-cover ${problem ? 'opacity-40 grayscale' : ''}`}
          />
        ) : (
          <div className='flex h-full items-center justify-center px-6 text-center text-sm text-slate-500'>
            {problem ?? 'カメラの画像を取得しています…'}
          </div>
        )}
      </div>
      {problem && capturedAt && <p className='text-sm text-amber-800'>{problem}</p>}
      {capturedAt && (
        <p className='text-xs text-slate-500'>
          {problem ? '最後に映った画像' : '撮影'}：{relativeTime(capturedAt, now.getTime())}（{time.format(new Date(capturedAt))}）
        </p>
      )}
    </div>
  );
}

function History({ commands, printers, now }: { commands: PrinterCommand[]; printers: AdminPrinter[]; now: Date }) {
  if (commands.length === 0) return null;
  const names = new Map(printers.map((printer) => [printer.id, printer.displayName]));
  return (
    <section className={`${card} p-5`}>
      <h2 className='font-bold'>操作の履歴</h2>
      <ul className='mt-3 divide-y divide-slate-100 text-sm'>
        {commands.map((command) => (
          <li key={command.id} className='flex flex-wrap items-center justify-between gap-2 py-2'>
            <span>
              {names.get(command.printerId) ?? command.printerId}：{actionLabels[command.action]}
              <span className='ml-2 text-slate-500'>{command.requestedBy}</span>
            </span>
            <span className='flex items-center gap-2 text-slate-500'>
              <span title={time.format(new Date(command.requestedAt))}>{relativeTime(command.requestedAt, now.getTime())}</span>
              <span className={`${badge} ${statusStyles[command.status]}`}>{statusLabels[command.status]}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
