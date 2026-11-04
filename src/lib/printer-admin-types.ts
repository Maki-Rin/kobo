import { parsePublicPrinters, type PrinterState, type PublicPrinter } from './printer-types';

export const printerActions = ['pause', 'resume', 'cancel', 'light_on', 'light_off'] as const;
export type PrinterAction = (typeof printerActions)[number];
export type CommandStatus = 'pending' | 'sent' | 'succeeded' | 'failed' | 'expired';

export type CameraStatus = 'ok' | 'off' | 'unreachable' | 'error';

export interface AdminCamera {
  status: CameraStatus;
  checkedAt: string;
  capturedAt: string | null;
}

export interface AdminPrinter extends PublicPrinter {
  reportedState: PrinterState;
  reportedErrorCode: string | null;
  acknowledgedErrorCode: string | null;
  lightOn: boolean | null;
  camera: AdminCamera | null;
}

export interface PrinterCommand {
  id: string;
  printerId: string;
  action: PrinterAction;
  requestedBy: string;
  requestedAt: string;
  status: CommandStatus;
  finishedAt: string | null;
  detail: string | null;
}

export interface AdminPrinters {
  generatedAt: string;
  printers: AdminPrinter[];
  commands: PrinterCommand[];
}

const states = new Set(['unknown', 'idle', 'preparing', 'printing', 'paused', 'completed', 'awaiting_collection', 'error']);
const statuses = new Set(['pending', 'sent', 'succeeded', 'failed', 'expired']);
const cameraStatuses = new Set(['ok', 'off', 'unreachable', 'error']);
const timestamp = (value: unknown) => (typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null);

function camera(value: unknown): AdminCamera | null {
  if (!isRecord(value) || !cameraStatuses.has(value.status as string)) return null;
  const checkedAt = timestamp(value.checkedAt);
  if (checkedAt === null) return null;
  return { status: value.status as CameraStatus, checkedAt, capturedAt: timestamp(value.capturedAt) };
}
const code = (value: unknown) => (typeof value === 'string' && /^[A-Za-z0-9_.-]{1,32}$/.test(value) ? value : null);
const text = (value: unknown, max: number) => (typeof value === 'string' ? Array.from(value).slice(0, max).join('') : null);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAdminPrinters(value: unknown): AdminPrinters | null {
  if (!isRecord(value) || !Array.isArray(value.printers) || !Array.isArray(value.commands)) return null;
  const parsed = parsePublicPrinters({ schemaVersion: '1.2', generatedAt: value.generatedAt, printers: value.printers });
  if (parsed === null) return null;
  const extras = new Map(value.printers.filter(isRecord).map((printer) => [printer.id, printer]));
  return {
    generatedAt: parsed.generatedAt,
    printers: parsed.printers.map((printer) => {
      const extra = extras.get(printer.id) ?? {};
      return {
        ...printer,
        reportedState: states.has(extra.reportedState as string) ? (extra.reportedState as PrinterState) : printer.state,
        reportedErrorCode: code(extra.reportedErrorCode),
        acknowledgedErrorCode: code(extra.acknowledgedErrorCode),
        lightOn: typeof extra.lightOn === 'boolean' ? extra.lightOn : null,
        camera: camera(extra.camera),
      };
    }),
    commands: value.commands.filter(isRecord).flatMap((command) => {
      const action = command.action as PrinterAction;
      if (typeof command.id !== 'string' || typeof command.printerId !== 'string' || !printerActions.includes(action)) return [];
      if (!statuses.has(command.status as string) || typeof command.requestedAt !== 'string') return [];
      return [{
        id: command.id,
        printerId: command.printerId,
        action,
        requestedBy: text(command.requestedBy, 80) ?? '',
        requestedAt: command.requestedAt,
        status: command.status as CommandStatus,
        finishedAt: typeof command.finishedAt === 'string' ? command.finishedAt : null,
        detail: text(command.detail, 200),
      }];
    }),
  };
}


export function comparePrinters(left: { id: string; displayName: string }, right: { id: string; displayName: string }): number {
  return left.displayName.localeCompare(right.displayName, 'ja', { numeric: true }) || left.id.localeCompare(right.id, 'en', { numeric: true });
}
