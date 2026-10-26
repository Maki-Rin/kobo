export type PrinterAvailability =
  | 'online'
  | 'stale'
  | 'offline'
  | 'disabled'
  | 'maintenance'
  | 'unknown';

export type PrinterState =
  | 'unknown'
  | 'idle'
  | 'preparing'
  | 'printing'
  | 'paused'
  | 'awaiting_collection'
  | 'error';

export type WorkOutcome = 'success' | 'failed' | 'canceled' | 'unknown';

export interface PublicPrinter {
  id: string;
  displayName: string;
  model: string;
  availability: PrinterAvailability;
  state: PrinterState;
  progressPercent: number | null;
  currentWork: {
    fileName: string | null;
    elapsedMinutes: number | null;
    estimatedTotalMinutes: number | null;
  } | null;
  lastWork: {
    fileName: string | null;
    outcome: WorkOutcome;
    durationMinutes: number | null;
    endedAt: string | null;
  } | null;
  lastSeenAt: string;
  stale: boolean;
}

export interface PublicPrintersResponse {
  schemaVersion: '1.0';
  generatedAt: string;
  printers: PublicPrinter[];
}

export interface PrinterApiResult {
  data: PublicPrintersResponse | null;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, maximum: number): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return Array.from(value).slice(0, maximum).join('');
}

function nullableInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

function fileName(value: unknown): string | null {
  const raw = text(value, 1024);
  if (raw === null) return null;
  const basename = raw.replaceAll('\\', '/').split('/').at(-1) ?? '';
  const safe = basename.replace(/[\u0000-\u001f\u007f-\u009f]/gu, '').trim();
  return safe.length === 0 ? null : Array.from(safe).slice(0, 255).join('');
}

const availabilityValues = new Set([
  'online',
  'stale',
  'offline',
  'disabled',
  'maintenance',
]);

const stateValues = new Set([
  'unknown',
  'idle',
  'preparing',
  'printing',
  'paused',
  'awaiting_collection',
  'error',
]);

function parsePrinter(value: unknown): PublicPrinter | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 64);
  const displayName = text(value.displayName, 80);
  const model = text(value.model, 80);
  const lastSeenAt = timestamp(value.lastSeenAt);
  if (id === null || displayName === null || model === null || lastSeenAt === null) {
    return null;
  }

  const current = isRecord(value.currentWork) ? value.currentWork : null;
  const last = isRecord(value.lastWork) ? value.lastWork : null;
  const outcomeValues = new Set<WorkOutcome>([
    'success',
    'failed',
    'canceled',
    'unknown',
  ]);
  const outcome = last?.outcome;
  const progress = value.progressPercent;

  return {
    id,
    displayName,
    model,
    availability: availabilityValues.has(value.availability as string)
      ? (value.availability as PrinterAvailability)
      : 'unknown',
    state: stateValues.has(value.state as string)
      ? (value.state as PrinterState)
      : 'unknown',
    progressPercent:
      typeof progress === 'number' && Number.isFinite(progress)
        ? Math.min(100, Math.max(0, progress))
        : null,
    currentWork:
      current === null
        ? null
        : {
            fileName: fileName(current.fileName),
            elapsedMinutes: nullableInteger(current.elapsedMinutes),
            estimatedTotalMinutes: nullableInteger(
              current.estimatedTotalMinutes
            ),
          },
    lastWork:
      last === null
        ? null
        : {
            fileName: fileName(last.fileName),
            outcome: outcomeValues.has(outcome as WorkOutcome)
              ? (outcome as WorkOutcome)
              : 'unknown',
            durationMinutes: nullableInteger(last.durationMinutes),
            endedAt: timestamp(last.endedAt),
          },
    lastSeenAt,
    stale: value.stale === true,
  };
}

export function parsePublicPrinters(value: unknown): PublicPrintersResponse | null {
  if (!isRecord(value) || value.schemaVersion !== '1.0') return null;
  const generatedAt = timestamp(value.generatedAt);
  if (generatedAt === null || !Array.isArray(value.printers)) return null;
  const printers = value.printers.map(parsePrinter);
  if (printers.some((printer) => printer === null)) return null;
  return {
    schemaVersion: '1.0',
    generatedAt,
    printers: printers as PublicPrinter[],
  };
}

export function parsePrinterApiResult(value: unknown): PrinterApiResult {
  if (!isRecord(value)) {
    return { data: null, error: '応答形式を確認できませんでした。' };
  }
  const data = value.data === null ? null : parsePublicPrinters(value.data);
  const error = typeof value.error === 'string' ? value.error : null;
  if (value.data !== null && data === null) {
    return { data: null, error: 'プリンター状態の形式を確認できませんでした。' };
  }
  return { data, error };
}
