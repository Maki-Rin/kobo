import 'server-only';
import { readLimitedBody } from '@/lib/http-body';
import { publicPrinterData } from '@/lib/printer-privacy';
import {
  parsePublicPrinters,
  type PrinterApiResult,
} from '@/lib/printer-types';

const MAX_RESPONSE_BYTES = 256 * 1024;

export async function getPublicPrinters(): Promise<PrinterApiResult> {
  const configuredBaseUrl = process.env.KOBO_PRINTER_PUBLIC_API_BASE_URL;
  if (!configuredBaseUrl) {
    return {
      data: null,
      error: 'プリンター状態APIはまだ設定されていません。',
    };
  }

  try {
    const endpoint = new URL('/api/public/v1/printers', configuredBaseUrl);
    const localDev = process.env.NODE_ENV !== 'production' && endpoint.hostname === 'localhost' && endpoint.protocol === 'http:';
    if ((endpoint.protocol !== 'https:' && !localDev) || endpoint.username || endpoint.password) {
      return { data: null, error: 'プリンター状態APIの設定が不正です。' };
    }
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(8_000),
      redirect: 'error',
    });
    if (!response.ok) {
      return {
        data: null,
        error: 'プリンター状態を取得できませんでした。',
      };
    }
    const body = new TextDecoder().decode(await readLimitedBody(response, MAX_RESPONSE_BYTES));
    const data = parsePublicPrinters(JSON.parse(body) as unknown);
    if (data === null) {
      return {
        data: null,
        error: 'プリンター状態の形式を確認できませんでした。',
      };
    }
    return { data: publicPrinterData(data, process.env.KOBO_PRINTER_PUBLIC_FILE_NAMES === 'true'), error: null };
  } catch {
    return {
      data: null,
      error: 'プリンター状態を取得できませんでした。',
    };
  }
}
