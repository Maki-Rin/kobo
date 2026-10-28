// Run only against a disposable local editor DB: node --import tsx tests/security-http.mts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = process.env.SECURITY_BASE_URL ?? 'http://localhost:3111';
const url = new URL(base);
assert.equal(url.hostname, 'localhost', 'This smoke test is local-only');
const origin = process.env.SECURITY_ORIGIN ?? base;
const manifestPath = process.env.SECURITY_MANIFEST ?? '.next/dev/server/server-reference-manifest.json';
const page = await fetch(`${base}/admin`);
const html = await page.text();
assert.equal(page.status, 200);
assert.match(page.headers.get('cache-control') ?? '', /no-store/);
assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
const csp = page.headers.get('content-security-policy') ?? '';
const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
assert.ok(nonce);
assert.ok(html.includes(`nonce="${nonce}"`));
assert.match(csp, /frame-ancestors 'none'/);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  node: Record<string, { exportedName: string }>;
};

async function action(name: string, args: unknown[], actionOrigin = origin) {
  const id = Object.entries(manifest.node).find(([, value]) => value.exportedName === name)?.[0];
  assert.ok(id, `Missing server action: ${name}`);
  const response = await fetch(`${base}/admin`, {
    method: 'POST',
    headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Origin: actionOrigin, Accept: 'text/x-component' },
    body: JSON.stringify(args),
  });
  const body = await response.text();
  const match = body.split('\n').find((line) => /^[0-9a-f]+:\{"ok":/.test(line));
  const result = match ? JSON.parse(match.slice(match.indexOf(':') + 1)) as {
    ok: boolean; errors?: string[]; value?: { options: { userVerification?: string } };
  } : null;
  return { response, result, body };
}

for (const path of ['/api/image-proxy?url=http://127.0.0.1/', '/api/link-metadata?url=https://169.254.169.254/']) {
  assert.equal((await fetch(`${base}${path}`)).status, 400);
}
assert.equal((await fetch(`${base}/admin/staged/${'a'.repeat(40)}`)).status, 401);
assert.equal((await fetch(`${base}/api/printers`, { method: 'POST' })).status, 405);
assert.equal((await fetch(`${base}/admin/new`, { redirect: 'manual' })).status, 307);

const preview = await action('previewAction', ['**should require login**']);
assert.equal(preview.result?.ok, false);
assert.match(preview.result?.errors?.join('') ?? '', /ログインが必要/);
const save = await action('saveEntryAction', [{ collection: 'articles', draft: {}, images: [], isNew: true, baseSha: null }]);
assert.equal(save.result?.ok, false);
assert.match(save.result?.errors?.join('') ?? '', /ログインが必要/);
const crossOrigin = await action('loginOptionsAction', [], 'https://attacker.invalid');
assert.notEqual(crossOrigin.result?.ok, true);

let limited = false;
for (let i = 0; i < 20; i += 1) {
  const login = await action('loginOptionsAction', []);
  if (!login.result?.ok) {
    assert.match(login.result?.errors?.join('') ?? '', /しばらく待って/);
    limited = true;
    break;
  }
  assert.equal(login.result.value?.options.userVerification, 'required');
  const cookie = login.response.headers.get('set-cookie') ?? '';
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=strict/i);
  if (origin.startsWith('https:')) {
    assert.match(cookie, /__Host-kobo_editor_challenge=/);
    assert.match(cookie, /; Secure/);
  }
}
assert.equal(limited, true, 'Login rate limit should reject repeated starts');

if (process.env.SECURITY_CHECK_PRINTERS === '1') {
  const printers = await fetch(`${base}/api/printers`);
  const result = await printers.json() as { data: { printers: { currentWork?: { fileName: string | null }; lastWork?: { fileName: string | null } }[] } };
  assert.equal(printers.status, 200);
  assert.ok(result.data.printers.length > 0);
  for (const printer of result.data.printers) {
    assert.equal(printer.currentWork?.fileName ?? null, null);
    assert.equal(printer.lastWork?.fileName ?? null, null);
  }
}
console.log('HTTP security smoke passed: headers, nonce, SSRF rejection, unauthenticated access, Origin, passkey options, rate limit.');
