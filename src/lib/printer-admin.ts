import 'server-only';
import { readLimitedBody } from '@/lib/http-body';
import { isRecord, parseAdminPrinters, type AdminPrinters, type PrinterAction } from '@/lib/printer-admin-types';

export { printerActions, type PrinterAction } from '@/lib/printer-admin-types';

export class PrinterAdminError extends Error {}

const MAX_RESPONSE_BYTES = 256 * 1024;

function endpoint(path: string): { url: URL; token: string } {
  const base = process.env.KOBO_PRINTER_PUBLIC_API_BASE_URL;
  const token = process.env.KOBO_PRINTER_ADMIN_API_TOKEN;
  if (!base || !token || token.length < 32) throw new PrinterAdminError('プリンター操作はまだ設定されていません');
  const url = new URL(path, base);
  const localDev = process.env.NODE_ENV !== 'production' && url.hostname === 'localhost' && url.protocol === 'http:';
  if ((url.protocol !== 'https:' && !localDev) || url.username || url.password) {
    throw new PrinterAdminError('プリンター操作の設定が不正です');
  }
  return { url, token };
}

async function call(path: string, body?: unknown): Promise<{ status: number; json: unknown }> {
  const { url, token } = endpoint(path);
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
    redirect: 'error',
  });
  const raw = new TextDecoder().decode(await readLimitedBody(response, MAX_RESPONSE_BYTES));
  let json: unknown = null;
  try {
    json = raw.length > 0 ? (JSON.parse(raw) as unknown) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json };
}

export async function getAdminPrinters(cameraPrinterId?: string): Promise<AdminPrinters> {
  const query = cameraPrinterId ? `?camera=${encodeURIComponent(cameraPrinterId)}` : '';
  const { status, json } = await call(`/api/admin/v1/printers${query}`);
  const data = status === 200 ? parseAdminPrinters(json) : null;
  if (data === null) throw new PrinterAdminError('プリンターの状態を取得できませんでした');
  return data;
}

const refusals: Record<string, string> = {
  offline: 'プリンターと通信できていないため送れません',
  not_allowed: '今の状態ではこの操作はできません。表示を更新して確認してください',
  busy: 'このプリンターには前の操作がまだ届いていません。少し待ってください',
  not_found: 'プリンターが見つかりません',
  code_changed: 'エラーコードが変わりました。表示を更新して確認してください',
  upload_missing: '送ったファイルが見つかりません。もう一度ファイルを選んでください',
  camera_unconfirmed: 'カメラの画像が古くなりました。最新の画像で台の上を確かめ直してください',
};

function refusal(status: number, json: unknown): never {
  const reason = isRecord(json) && typeof json.reason === 'string' ? json.reason : '';
  if (status === 429) throw new PrinterAdminError('操作が多すぎます。少し待ってください');
  throw new PrinterAdminError(refusals[reason] ?? 'プリンターに操作を送れませんでした');
}

export async function sendPrinterCommand(printerId: string, action: PrinterAction, requestedBy: string): Promise<void> {
  const { status, json } = await call('/api/admin/v1/commands', { printerId, action, requestedBy });
  if (status !== 202) refusal(status, json);
}

export async function acknowledgePrinterError(printerId: string, errorCode: string, requestedBy: string): Promise<void> {
  const { status, json } = await call('/api/admin/v1/error-acknowledgements', { printerId, code: errorCode, requestedBy });
  if (status !== 200) refusal(status, json);
}

export async function getPrinterSnapshot(printerId: string): Promise<ArrayBuffer | null> {
  const { url, token } = endpoint(`/api/admin/v1/snapshot?printerId=${encodeURIComponent(printerId)}`);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
    redirect: 'error',
  });
  if (response.status !== 200 || response.headers.get('content-type') !== 'image/jpeg') return null;
  const bytes = await readLimitedBody(response, 1024 * 1024);
  return bytes.slice().buffer as ArrayBuffer;
}

export interface PrintUploadTicket {
  id: string;
  uploadUrl: string;
  uploadToken: string;
}

export async function createPrintUpload(printerId: string, fileName: string, size: number, requestedBy: string): Promise<PrintUploadTicket> {
  const { status, json } = await call('/api/admin/v1/uploads', { printerId, fileName, size, requestedBy });
  if (status === 400) throw new PrinterAdminError('このファイルは送れません（.gcode / .gx / .3mf、100MBまで）');
  if (status !== 201 || !isRecord(json) || !isRecord(json.upload)) refusal(status, json);
  const { url } = endpoint('/');
  const uploadUrl = typeof json.uploadUrl === 'string' ? new URL(json.uploadUrl) : null;
  if (uploadUrl === null || uploadUrl.origin !== url.origin || typeof json.uploadToken !== 'string' || typeof json.upload.id !== 'string') {
    throw new PrinterAdminError('ファイルの送り先を確認できませんでした');
  }
  return { id: json.upload.id, uploadUrl: uploadUrl.toString(), uploadToken: json.uploadToken };
}

export async function startPrint(
  printerId: string,
  uploadId: string,
  levelBeforePrint: boolean,
  snapshotCapturedAt: string,
  requestedBy: string
): Promise<void> {
  const { status, json } = await call('/api/admin/v1/commands', {
    printerId,
    action: 'start_print',
    requestedBy,
    uploadId,
    levelBeforePrint,
    bedClearConfirmed: true,
    snapshotCapturedAt,
  });
  if (status !== 202) refusal(status, json);
}
