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
  free: 'bg-emerald-100 text-emerald-900',
  busy: 'bg-blue-100 text-blue-900',
  wait: 'bg-amber-100 text-amber-900',
  alert: 'bg-red-100 text-red-800',
  off: 'bg-slate-100 text-slate-600',
};

export const tonePriority: Record<Tone, number> = { free: 0, busy: 1, wait: 2, alert: 3, off: 4 };
