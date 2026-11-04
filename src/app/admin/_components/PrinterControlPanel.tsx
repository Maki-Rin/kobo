'use client';

import { useEffect, useRef, useState } from 'react';
import { describePrinter, toneDots, toneStyles } from '@/lib/printer-display';
import { errorCodeMeaning } from '@/lib/printer-error-codes';
import { pollWhileVisible } from '@/lib/visible-polling';
import {
  CAMERA_CONFIRMATION_MS,
  comparePrinters,
  MAX_PRINT_FILE_BYTES,
  printFileExtensions,
  type AdminPrinter,
  type AdminPrinters,
  type CameraStatus,
  type CommandStatus,
  type PrinterAction,
  type PrinterCommand,
} from '@/lib/printer-admin-types';
import {
  acknowledgePrinterErrorAction,
  createPrintUploadAction,
  loadPrintersAction,
  printerCommandAction,
  startPrintAction,
} from '../actions';
import ErrorList from './ErrorList';
import Icon, { type IconName } from './Icon';
import { relativeTime } from './relativeTime';
import { badge, button, card } from './ui';

const actionLabels: Record<PrinterAction, string> = {
  pause: '一時停止',
  resume: '再開',
  cancel: '中止',
  light_on: 'ライトをつける',
  light_off: 'ライトを消す',
  start_print: '造形を開始',
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

const clock = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dateTime = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const CAMERA_STALE_MS = 20_000;

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}時間${minutes % 60}分` : `${minutes}分`;
}

type Result = { ok: true } | { ok: false; errors: string[] };

export default function PrinterControlPanel({
  initial,
  initialError,
  initialSelected,
}: {
  initial: AdminPrinters | null;
  initialError: string | null;
  initialSelected: string | null;
}) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState(initialError);
  const printers = [...(data?.printers ?? [])].sort(comparePrinters);
  const [selected, setSelected] = useState(
    () => printers.find((printer) => printer.id === initialSelected)?.id ?? printers[0]?.id ?? null
  );
  const selectedRef = useRef(selected);

  const refresh = async () => {
    const result = await loadPrintersAction(selectedRef.current);
    if (result.ok) {
      setData(result.value);
      setError(null);
    } else {
      setError(result.errors[0] ?? null);
    }
  };

  useEffect(() => pollWhileVisible(refresh, { interval: 5_000 }), []);

  const select = (id: string) => {
    setSelected(id);
    selectedRef.current = id;
    window.history.replaceState(null, '', `?printer=${encodeURIComponent(id)}`);
    void refresh();
  };

  if (data === null) return <ErrorList errors={[error ?? 'プリンターの状態を取得できませんでした']} />;
  const now = new Date(data.generatedAt);
  const current = printers.find((printer) => printer.id === selected) ?? null;

  return (
    <div className='space-y-4'>
      {error && <ErrorList errors={[`${error}（最後に取得できた状態を表示しています）`]} />}
      <div className='grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]'>
        <PrinterList printers={printers} selected={selected} now={now} onSelect={select} />
        {current && (
          <PrinterDetail
            key={current.id}
            printer={current}
            commands={data.commands.filter((command) => command.printerId === current.id)}
            now={now}
            onChange={refresh}
          />
        )}
      </div>
    </div>
  );
}

function PrinterList({
  printers,
  selected,
  now,
  onSelect,
}: {
  printers: AdminPrinter[];
  selected: string | null;
  now: Date;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label='プリンター' className={`${card} overflow-hidden lg:sticky lg:top-4`}>
      <ul className='divide-y divide-slate-100'>
        {printers.map((printer) => {
          const view = describePrinter(printer, now);
          const active = printer.id === selected;
          const work = printer.currentWork;
          const remaining =
            work?.estimatedTotalMinutes != null && work.elapsedMinutes != null
              ? Math.max(0, work.estimatedTotalMinutes - work.elapsedMinutes)
              : null;
          return (
            <li key={printer.id}>
              <button
                onClick={() => onSelect(printer.id)}
                aria-current={active ? 'true' : undefined}
                className={`block w-full px-4 py-3 text-left transition-colors ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
              >
                <span className='flex items-center justify-between gap-2'>
                  <span className='flex min-w-0 items-center gap-2'>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${toneDots[view.tone]}`} aria-hidden='true' />
                    <span className='truncate text-sm font-medium'>{printer.displayName}</span>
                  </span>
                  <span className='shrink-0 text-xs text-slate-500'>{view.label}</span>
                </span>
                {view.progress !== null && (
                  <span className='mt-2 flex items-center gap-2 pl-4'>
                    <span className='h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200'>
                      <span className='block h-full bg-[#165d8c]' style={{ width: `${view.progress}%` }} />
                    </span>
                    <span className='shrink-0 text-xs tabular-nums text-slate-500'>
                      {remaining !== null ? `残り${duration(remaining)}` : `${Math.round(view.progress)}%`}
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PrinterDetail({
  printer,
  commands,
  now,
  onChange,
}: {
  printer: AdminPrinter;
  commands: PrinterCommand[];
  now: Date;
  onChange: () => Promise<void>;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const view = describePrinter(printer, now);
  const online = printer.availability === 'online';
  const latest = commands[0] ?? null;
  const waiting = latest !== null && (latest.status === 'pending' || latest.status === 'sent');
  const disabled = !online || busy || waiting;

  const run = async (task: () => Promise<Result>) => {
    setBusy(true);
    setErrors([]);
    const result = await task();
    setBusy(false);
    if (!result.ok) setErrors(result.errors);
    await onChange();
  };
  const send = (action: PrinterAction) => run(() => printerCommandAction(printer.id, action));

  return (
    <section className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold'>{printer.displayName}</h2>
          <p className='text-sm text-slate-500'>
            {printer.model}・最終確認 {dateTime.format(new Date(printer.lastSeenAt))}
          </p>
        </div>
        <span className={`${badge} ${toneStyles[view.tone]}`}>{view.label}</span>
      </div>

      <div className='grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]'>
        <div className='space-y-4'>
          <CameraPanel
            printer={printer}
            now={now}
            light={<LightSwitch printer={printer} latest={latest} disabled={disabled} onToggle={send} />}
          />
          <ProgressPanel printer={printer} now={now} disabled={disabled} onSend={send} />
          {online && !['printing', 'preparing', 'paused'].includes(printer.state) && (
            <StartPrintPanel printer={printer} now={now} disabled={disabled} onStarted={onChange} />
          )}
        </div>
        <div className='space-y-4'>
          <ErrorPanel printer={printer} busy={busy} onAcknowledge={(code) => run(() => acknowledgePrinterErrorAction(printer.id, code))} />
          <ErrorList errors={errors} />
          <HistoryPanel commands={commands} now={now} />
        </div>
      </div>
    </section>
  );
}

function LightSwitch({
  printer,
  latest,
  disabled,
  onToggle,
}: {
  printer: AdminPrinter;
  latest: PrinterCommand | null;
  disabled: boolean;
  onToggle: (action: PrinterAction) => void;
}) {
  const switching =
    latest !== null && (latest.status === 'pending' || latest.status === 'sent') && (latest.action === 'light_on' || latest.action === 'light_off');
  const on = switching ? latest.action === 'light_on' : printer.lightOn;
  return (
    <button
      role='switch'
      aria-checked={on === true}
      disabled={disabled}
      onClick={() => onToggle(on ? 'light_off' : 'light_on')}
      className={`inline-flex h-8 items-center gap-2 rounded-full border pl-2.5 pr-1 text-sm font-medium transition-colors disabled:opacity-60 ${
        on ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-300 bg-white text-slate-700'
      }`}
    >
      <Icon name='lamp' className={on ? 'text-amber-500' : 'text-slate-400'} />
      ライト
      <span className='text-xs font-normal text-slate-500'>
        {switching ? '切り替え中…' : on === null ? '状態不明' : on ? 'オン' : 'オフ'}
      </span>
      <span className={`relative h-6 w-10 rounded-full transition-colors ${on ? 'bg-amber-400' : 'bg-slate-300'}`} aria-hidden='true'>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

const cameraProblems: Record<Exclude<CameraStatus, 'ok'>, { icon: IconName; title: string; detail: string }> = {
  off: {
    icon: 'cameraOff',
    title: 'カメラの配信が止まっています',
    detail: 'オンにする命令を送りました。1分ほどたっても映らなければ、本体の設定でカメラをオンにしてください。',
  },
  unreachable: {
    icon: 'cameraOff',
    title: 'カメラと通信できません',
    detail: 'プリンター本体とは通信できていますが、カメラが応答しません。しばらく待っても直らなければ、本体を再起動してください。',
  },
  error: {
    icon: 'cameraOff',
    title: 'カメラの画像を読み取れませんでした',
    detail: '次の撮影で自動的にやり直します。',
  },
};

function CameraPanel({ printer, now, light }: { printer: AdminPrinter; now: Date; light: React.ReactNode }) {
  const online = printer.availability === 'online';
  const camera = printer.camera;
  const capturedAt = camera?.capturedAt ?? null;
  const age = capturedAt === null ? null : now.getTime() - new Date(capturedAt).getTime();
  const problem = !online
    ? { icon: 'cameraOff' as const, title: 'プリンターと通信できません', detail: '電源が切れているか、ネットワークから外れています。カメラも見られません。' }
    : camera !== null && camera.status !== 'ok'
      ? cameraProblems[camera.status]
      : null;
  const stale = online && problem === null && age !== null && age > CAMERA_STALE_MS;
  const live = online && problem === null && capturedAt !== null && !stale;

  return (
    <div className={`${card} overflow-hidden`}>
      <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5'>
        <h3 className='flex items-center gap-2 text-sm font-bold'>
          <Icon name='camera' className='text-slate-400' />
          カメラ
        </h3>
        {light}
      </div>
      <div className='relative aspect-[4/3] bg-slate-900'>
        {capturedAt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/admin/printers/${printer.id}/snapshot?t=${encodeURIComponent(capturedAt)}`}
            alt={`${printer.displayName}の庫内`}
            className={`absolute inset-0 h-full w-full object-cover ${problem || stale ? 'opacity-30 grayscale' : ''}`}
          />
        )}
        {live && (
          <span className='absolute left-3 top-3 inline-flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white'>
            <span className='h-1.5 w-1.5 rounded-full bg-red-500' aria-hidden='true' />
            5秒ごとに更新・{clock.format(new Date(capturedAt))}
          </span>
        )}
        {(problem || stale || capturedAt === null) && (
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center text-white'>
            {problem ? (
              <>
                <Icon name={problem.icon} size={32} className='text-white/70' />
                <p className='font-bold'>{problem.title}</p>
                <p className='max-w-sm text-sm text-white/80'>{problem.detail}</p>
              </>
            ) : stale ? (
              <>
                <Icon name='cameraOff' size={32} className='text-white/70' />
                <p className='font-bold'>カメラの更新が止まっています</p>
                <p className='max-w-sm text-sm text-white/80'>現地のサーバーから新しい画像が届いていません。</p>
              </>
            ) : (
              <>
                <span className='h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white' aria-hidden='true' />
                <p className='text-sm text-white/80'>カメラに接続しています…</p>
              </>
            )}
            {capturedAt && (problem || stale) && (
              <p className='text-xs text-white/60'>背景は最後に映った画像（{dateTime.format(new Date(capturedAt))}）</p>
            )}
            {camera && problem && online && <p className='text-xs text-white/60'>最後の確認 {clock.format(new Date(camera.checkedAt))}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressPanel({
  printer,
  now,
  disabled,
  onSend,
}: {
  printer: AdminPrinter;
  now: Date;
  disabled: boolean;
  onSend: (action: PrinterAction) => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const state = printer.state;
  const active = state === 'printing' || state === 'preparing' || state === 'paused';
  const work = printer.currentWork;
  const progress = printer.progressPercent;
  const remaining =
    work?.estimatedTotalMinutes != null && work.elapsedMinutes != null ? Math.max(0, work.estimatedTotalMinutes - work.elapsedMinutes) : null;
  const finish = remaining === null ? null : new Date(now.getTime() + remaining * 60_000);

  return (
    <div className={`${card} p-4`}>
      <h3 className='text-sm font-bold'>造形の進捗</h3>
      {active ? (
        <div className='mt-3 space-y-3'>
          <div className='flex items-center gap-4'>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium' title={work?.fileName ?? undefined}>
                {work?.fileName ?? 'ファイル名なし'}
              </p>
              <div className='mt-2 flex items-baseline gap-2'>
                <span className='text-2xl font-bold tabular-nums text-[#165d8c]'>{progress === null ? '—' : Math.round(progress)}</span>
                <span className='text-sm text-[#165d8c]'>%</span>
                {state === 'paused' && <span className={`${badge} bg-orange-100 text-orange-900`}>一時停止中</span>}
                {state === 'preparing' && <span className={`${badge} bg-blue-50 text-blue-800`}>準備中</span>}
              </div>
            </div>
            <div className='flex shrink-0 gap-2'>
              {state === 'paused' ? (
                <IconButton icon='play' label='再開' disabled={disabled} onClick={() => onSend('resume')} />
              ) : (
                <IconButton icon='pause' label='一時停止' disabled={disabled} onClick={() => onSend('pause')} />
              )}
              <IconButton icon='stop' label='中止' danger disabled={disabled} onClick={() => setConfirmCancel(true)} />
            </div>
          </div>
          <div className='h-2 overflow-hidden rounded-full bg-slate-100' role='progressbar' aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? undefined}>
            <div className='h-full bg-[#165d8c] transition-[width]' style={{ width: `${progress ?? 0}%` }} />
          </div>
          <dl className='grid grid-cols-3 gap-2 text-sm'>
            <Stat label='経過' value={work?.elapsedMinutes != null ? duration(work.elapsedMinutes) : '—'} />
            <Stat label='残り' value={remaining !== null ? duration(remaining) : '—'} />
            <Stat label='終了予定' value={finish ? dateTime.format(finish) : '—'} />
          </dl>
          {confirmCancel && (
            <div className='space-y-3 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm'>
              <p className='font-medium text-red-900'>
                {printer.displayName} の造形「{work?.fileName ?? 'ファイル名不明'}」を中止します。中止した造形は再開できません。
              </p>
              <div className='flex gap-2'>
                <button onClick={() => setConfirmCancel(false)} className={button('secondary', 'sm')}>
                  やめる
                </button>
                <button
                  disabled={disabled}
                  onClick={() => {
                    setConfirmCancel(false);
                    onSend('cancel');
                  }}
                  className={button('danger', 'sm')}
                >
                  中止する
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className='mt-2 text-sm text-slate-500'>
          <p>造形していません。</p>
          {printer.lastWork && (
            <p className='mt-1'>
              直近：{printer.lastWork.fileName ?? 'ファイル名なし'}
              {printer.lastWork.endedAt && `（${dateTime.format(new Date(printer.lastWork.endedAt))} 終了）`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function sendFile(url: string, token: string, file: File, onProgress: (ratio: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.setRequestHeader('Content-Type', 'application/octet-stream');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => (request.status === 204 ? resolve() : reject(new Error(`HTTP ${request.status}`)));
    request.onerror = () => reject(new Error('network'));
    request.send(file);
  });
}

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; file: File; ratio: number }
  | { kind: 'ready'; file: File; uploadId: string }
  | { kind: 'starting'; file: File; uploadId: string };

function StartPrintPanel({ printer, now, disabled, onStarted }: { printer: AdminPrinter; now: Date; disabled: boolean; onStarted: () => Promise<void> }) {
  const [upload, setUpload] = useState<UploadState>({ kind: 'idle' });
  const [level, setLevel] = useState(true);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const camera = printer.camera;
  const capturedAt = camera?.status === 'ok' ? camera.capturedAt : null;
  const fresh = capturedAt !== null && now.getTime() - new Date(capturedAt).getTime() <= CAMERA_CONFIRMATION_MS / 2;
  const confirmedFresh = confirmedAt !== null && now.getTime() - new Date(confirmedAt).getTime() <= CAMERA_CONFIRMATION_MS - 10_000;

  const choose = async (file: File | undefined) => {
    setErrors([]);
    setConfirmedAt(null);
    if (!file) return setUpload({ kind: 'idle' });
    const lower = file.name.toLowerCase();
    if (!printFileExtensions.some((extension) => lower.endsWith(extension))) {
      setUpload({ kind: 'idle' });
      return setErrors([`${printFileExtensions.join(' / ')} のファイルを選んでください`]);
    }
    if (file.size > MAX_PRINT_FILE_BYTES) {
      setUpload({ kind: 'idle' });
      return setErrors(['100MB までのファイルにしてください']);
    }
    setUpload({ kind: 'uploading', file, ratio: 0 });
    const ticket = await createPrintUploadAction(printer.id, file.name, file.size);
    if (!ticket.ok) {
      setUpload({ kind: 'idle' });
      return setErrors(ticket.errors);
    }
    try {
      await sendFile(ticket.value.uploadUrl, ticket.value.uploadToken, file, (ratio) => setUpload({ kind: 'uploading', file, ratio }));
      setUpload({ kind: 'ready', file, uploadId: ticket.value.id });
    } catch {
      setUpload({ kind: 'idle' });
      setErrors(['ファイルを送れませんでした。通信を確かめて、もう一度選んでください']);
    }
  };

  const start = async () => {
    if (upload.kind !== 'ready' || confirmedAt === null) return;
    setUpload({ ...upload, kind: 'starting' });
    setErrors([]);
    const result = await startPrintAction(printer.id, upload.uploadId, level, confirmedAt, true);
    if (!result.ok) {
      setErrors(result.errors);
      setConfirmedAt(null);
      setUpload({ kind: 'ready', file: upload.file, uploadId: upload.uploadId });
      return;
    }
    setUpload({ kind: 'idle' });
    setConfirmedAt(null);
    await onStarted();
  };

  const file = upload.kind === 'idle' ? null : upload.file;
  return (
    <div className={`${card} space-y-4 p-4`}>
      <h3 className='text-sm font-bold'>造形を開始</h3>
      <ol className='space-y-4 text-sm'>
        <li className='space-y-2'>
          <p className='font-medium'>1. ファイルを選ぶ</p>
          <input
            type='file'
            accept={printFileExtensions.join(',')}
            disabled={upload.kind === 'uploading' || upload.kind === 'starting'}
            onChange={(event) => void choose(event.target.files?.[0])}
            className='block w-full text-sm file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium'
          />
          {file && (
            <p className='text-slate-600'>
              {file.name}（{formatBytes(file.size)}）
              {upload.kind === 'uploading' && `・送信中 ${Math.round(upload.ratio * 100)}%`}
              {(upload.kind === 'ready' || upload.kind === 'starting') && '・送信済み'}
            </p>
          )}
          {upload.kind === 'uploading' && (
            <div className='h-1.5 overflow-hidden rounded-full bg-slate-100'>
              <div className='h-full bg-[#165d8c]' style={{ width: `${upload.ratio * 100}%` }} />
            </div>
          )}
          <label className='flex items-center gap-2 text-slate-700'>
            <input type='checkbox' checked={level} onChange={(event) => setLevel(event.target.checked)} />
            造形前に自動レベリングする
          </label>
        </li>
        <li className='space-y-2'>
          <p className='font-medium'>2. カメラで台の上を確かめる</p>
          {fresh ? (
            <label className='flex items-start gap-2'>
              <input
                type='checkbox'
                className='mt-1'
                checked={confirmedAt !== null && confirmedFresh}
                onChange={(event) => setConfirmedAt(event.target.checked ? capturedAt : null)}
              />
              <span>
                上のカメラ画像（{clock.format(new Date(capturedAt))}）で、台の上に前の造形物や工具が何もないことを確かめた
              </span>
            </label>
          ) : (
            <p className='text-amber-800'>カメラの新しい画像がないため、まだ開始できません。カメラが映るまで待ってください。</p>
          )}
          {confirmedAt !== null && !confirmedFresh && <p className='text-amber-800'>確認してから時間がたちました。最新の画像でもう一度確かめてください。</p>}
        </li>
      </ol>
      <button
        disabled={disabled || upload.kind !== 'ready' || confirmedAt === null || !confirmedFresh}
        onClick={() => void start()}
        className={button('primary')}
      >
        <Icon name='play' />
        {upload.kind === 'starting' ? '開始を送っています…' : `${printer.displayName} で造形を開始`}
      </button>
      <ErrorList errors={errors} />
    </div>
  );
}

function IconButton({
  icon,
  label,
  danger = false,
  disabled,
  onClick,
}: {
  icon: IconName;
  label: string;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex w-16 flex-col items-center gap-1 rounded-md border py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
        danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-md bg-slate-50 px-3 py-2'>
      <dt className='text-xs text-slate-500'>{label}</dt>
      <dd className='mt-0.5 font-medium tabular-nums'>{value}</dd>
    </div>
  );
}

function ErrorPanel({ printer, busy, onAcknowledge }: { printer: AdminPrinter; busy: boolean; onAcknowledge: (code: string) => void }) {
  const code = printer.reportedState === 'error' ? printer.reportedErrorCode : null;
  if (code === null) return null;
  const acknowledged = printer.acknowledgedErrorCode === code;
  const meaning = errorCodeMeaning(code);
  return (
    <div className={`${card} space-y-2 p-4 text-sm ${acknowledged ? '' : 'border-red-200 bg-red-50'}`}>
      <h3 className='font-bold'>エラーコード {code}</h3>
      {meaning && (
        <p>
          {meaning.text}
          {!meaning.official && <span className='text-slate-500'>（公式の一覧には載っていません）</span>}
        </p>
      )}
      {acknowledged ? (
        <p className='text-slate-600'>確認済みです。公開ページでは「空き」と表示しています。別のエラーが出たら、またエラー表示に戻ります。</p>
      ) : (
        <>
          <p className='text-slate-700'>本体は印刷できるのにコードだけ残っているなら、確認済みにすると公開ページの表示を「空き」に戻せます。本体には何も送りません。</p>
          <button disabled={busy || printer.availability !== 'online'} onClick={() => onAcknowledge(code)} className={button('secondary', 'sm')}>
            確認して「空き」にする
          </button>
        </>
      )}
    </div>
  );
}

function HistoryPanel({ commands, now }: { commands: PrinterCommand[]; now: Date }) {
  return (
    <div className={`${card} p-4`}>
      <h3 className='text-sm font-bold'>操作の履歴</h3>
      {commands.length === 0 ? (
        <p className='mt-2 text-sm text-slate-500'>まだ操作はありません。</p>
      ) : (
        <ul className='mt-2 divide-y divide-slate-100 text-sm'>
          {commands.slice(0, 8).map((command) => (
            <li key={command.id} className='py-2'>
              <div className='flex items-center justify-between gap-2'>
                <span className='min-w-0 truncate font-medium'>
                  {actionLabels[command.action]}
                  {command.fileName && <span className='ml-1 font-normal text-slate-500'>{command.fileName}</span>}
                </span>
                <span className={`${badge} ${statusStyles[command.status]}`}>{statusLabels[command.status]}</span>
              </div>
              <p className='mt-0.5 text-xs text-slate-500'>
                {command.requestedBy}・<span title={dateTime.format(new Date(command.requestedAt))}>{relativeTime(command.requestedAt, now.getTime())}</span>
                {command.status === 'failed' && command.detail && `・${command.detail}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
