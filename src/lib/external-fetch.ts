import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';

// Exact hostnames only. Adding a new site is an explicit source change.
const metadataHosts = new Set([
  'github.com', 'www.github.com', 'qiita.com',
  'flashforge.jp', 'after-support.flashforge.jp',
  'www.thingiverse.com', 'www.printables.com', 'www.tinkercad.com',
  'marlinfw.org', '3dp.rocks', 'www.usuiyoshito.com',
]);
const imageHosts = new Set([
  'opengraph.githubassets.com', 'play-lh.googleusercontent.com',
]);
export type ExternalKind = 'metadata' | 'image';

export function allowedExternalUrl(raw: string, kind: ExternalKind): URL {
  if (raw.length > 2048) throw new Error('URL too long');
  const url = new URL(raw);
  const hosts = kind === 'metadata' ? metadataHosts : imageHosts;
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.has(url.hostname)) {
    throw new Error('URL not allowed');
  }
  url.hash = '';
  return url;
}

export function isPublicIPv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split('.').map(Number);
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}

async function fetchOnce(url: URL, maximum: number, signal: AbortSignal) {
  const addresses = await Promise.race([
    lookup(url.hostname, { family: 4, all: true }),
    new Promise<never>((_, reject) => {
      if (signal.aborted) reject(signal.reason);
      else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }),
  ]);
  if (!addresses.length || addresses.some(({ address }) => !isPublicIPv4(address))) {
    throw new Error('Non-public destination');
  }
  // Pin the validated address to this connection; a second DNS lookup could rebind it.
  return new Promise<{ status: number; location?: string; contentType: string; body: Buffer }>((resolve, reject) => {
    const req = request(url, {
      method: 'GET', agent: false, family: 4, signal,
      lookup: (_hostname, _options, callback) => callback(null, addresses[0].address, 4),
      headers: { Accept: 'text/html,image/*', 'Accept-Encoding': 'identity', 'User-Agent': 'KOBO-LinkPreview/1.0' },
    }, (response) => {
      const status = response.statusCode ?? 502;
      const location = response.headers.location;
      const contentType = response.headers['content-type'] ?? '';
      if (status >= 300 && status < 400) {
        response.destroy();
        resolve({ status, location, contentType, body: Buffer.alloc(0) });
        return;
      }
      if (status !== 200 || Number(response.headers['content-length']) > maximum ||
          (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
        response.destroy();
        reject(new Error('Upstream response rejected'));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maximum) response.destroy(new Error('Response too large'));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ status, contentType, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

export async function fetchExternal(raw: string, kind: ExternalKind) {
  let url = allowedExternalUrl(raw, kind);
  const signal = AbortSignal.timeout(5_000);
  for (let redirects = 0; redirects <= 2; redirects += 1) {
    const result = await fetchOnce(url, kind === 'metadata' ? 512 * 1024 : 3 * 1024 * 1024, signal);
    if (result.status === 200) {
      const expected = kind === 'metadata' ? /^(text\/html|application\/xhtml\+xml)(;|$)/i : /^image\//i;
      if (!expected.test(result.contentType)) throw new Error('Unexpected content type');
      return result;
    }
    if (!result.location) break;
    url = allowedExternalUrl(new URL(result.location, url).href, kind);
  }
  throw new Error('Too many redirects');
}
