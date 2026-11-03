import printerNotes from '@/content/printers.json';
import { openState } from './hours';
import type { PrinterState, PublicPrinter } from './printer-types';

export interface PrinterNote {
  note?: string;
  maintenance?: boolean;
}

export type Tone = 'free' | 'busy' | 'wait' | 'alert' | 'off';

export interface PrinterView {
  label: string;
  tone: Tone;
  available: boolean;
  detail: string | null;
  note: string | null;
  progress: number | null;
  fileName: string | null;
}

const notes = printerNotes as Record<string, PrinterNote>;

const connectionProblems: Partial<Record<PublicPrinter['connection'], { label: string; detail: string }>> = {
  auth_rejected: {
    label: '接続設定を確認中',
    detail: 'プリンターは動いていますが、登録している接続情報（チェックコードなど）が合わず状態を読めません。スタッフが直します。',
  },
  firmware_unverified: {
    label: '接続設定を確認中',
    detail: 'プリンターのファームウェアが更新されたため、状態の読み取りを止めています。スタッフが確認します。',
  },
  bad_response: {
    label: '状態を読めません',
    detail: 'プリンターから想定外の応答が返ってきています。',
  },
};

export const stateText: Record<PrinterState, string> = {
  unknown: '状態不明',
  idle: '空き',
  completed: '空き（印刷完了）',
  awaiting_collection: '空き（印刷完了）',
  preparing: '準備中',
  printing: '造形中',
  paused: '一時停止',
  error: 'エラー',
};

const stateTone: Record<PrinterState, Tone> = {
  unknown: 'off',
  idle: 'free',
  completed: 'free',
  awaiting_collection: 'free',
  preparing: 'busy',
  printing: 'busy',
  paused: 'wait',
  error: 'alert',
};

const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function stateWithProgress(printer: PublicPrinter): string {
  const label = stateText[printer.state];
  return printer.state === 'printing' && printer.progressPercent !== null
    ? `${label} ${Math.round(printer.progressPercent)}%`
    : label;
}

export function noteFor(printerId: string): PrinterNote {
  return notes[printerId] ?? {};
}

export function describePrinter(printer: PublicPrinter, now = new Date()): PrinterView {
  const extra = noteFor(printer.id);
  const note = extra.note?.trim() || null;
  const fileName = printer.currentWork?.fileName ?? null;
  const base = { note, fileName, progress: printer.state === 'printing' ? printer.progressPercent : null };

  if (extra.maintenance || printer.availability === 'maintenance' || printer.availability === 'disabled') {
    return { ...base, label: 'メンテナンス中', tone: 'off', available: false, detail: null, progress: null };
  }

  if (printer.availability === 'online' || printer.availability === 'stale') {
    const delayed = printer.availability === 'stale';
    return {
      ...base,
      label: stateWithProgress(printer),
      tone: stateTone[printer.state],
      available: !delayed && stateTone[printer.state] === 'free',
      detail: delayed && printer.stateObservedAt
        ? `更新が遅れています（${timeFormatter.format(new Date(printer.stateObservedAt))} 時点）`
        : null,
    };
  }

  const problem = connectionProblems[printer.connection];
  if (problem) {
    return { ...base, label: problem.label, tone: 'alert', available: false, detail: problem.detail, progress: null };
  }

  const closed = openState(now).state !== 'open';
  const last =
    printer.state !== 'unknown' && printer.stateObservedAt
      ? `最後は「${stateWithProgress(printer)}」（${timeFormatter.format(new Date(printer.stateObservedAt))}）`
      : null;
  return {
    ...base,
    label: closed ? '電源オフ' : 'オフライン',
    tone: 'off',
    available: false,
    detail: last,
    progress: null,
  };
}

export const toneStyles: Record<Tone, string> = {
  free: 'bg-free',
  busy: 'bg-busy',
  wait: 'bg-wait',
  alert: 'bg-alert',
  off: 'bg-off',
};

export const printerLayout = ['ad5mp-04', 'ad5mp-03', 'ad5mp-02', 'ad5mp-01', 'ad5mp-08', 'ad5mp-07', 'ad5mp-06', 'ad5mp-05'];

export const tonePriority: Record<Tone, number> = { free: 0, busy: 1, wait: 2, alert: 3, off: 4 };
