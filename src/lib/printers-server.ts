import 'server-only';
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
    if (endpoint.protocol !== 'https:' && endpoint.hostname !== 'localhost') {
      return { data: null, error: 'プリンター状態APIの設定が不正です。' };
    }
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return {
        data: null,
        error: 'プリンター状態を取得できませんでした。',
      };
    }
    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
      return { data: null, error: 'プリンター状態の応答が大きすぎます。' };
    }
    const data = parsePublicPrinters(JSON.parse(body) as unknown);
    if (data === null) {
      return {
        data: null,
        error: 'プリンター状態の形式を確認できませんでした。',
      };
    }
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: 'プリンター状態を取得できませんでした。',
    };
  }
}
