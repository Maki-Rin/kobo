import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { parseEntry } from '../src/lib/content-schema.ts';

const root = process.cwd();
const dbFile = path.join(root, '.editor-local', `draft-smoke-${randomUUID()}.db`);
mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new DatabaseSync(dbFile);
db.exec('CREATE TABLE _migrations (name TEXT PRIMARY KEY)');
for (const file of readdirSync('db/editor/migrations').sort()) {
  db.exec(readFileSync(`db/editor/migrations/${file}`, 'utf8'));
  db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
}
const now = new Date().toISOString();
const token = randomBytes(32).toString('base64url');
db.prepare('INSERT INTO users (id, display_name, role, created_at) VALUES (?, ?, ?, ?)').run('http-test', 'Local HTTP test', 'editor', now);
db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
  .run(createHash('sha256').update(token).digest('hex'), 'http-test', now, new Date(Date.now() + 3600_000).toISOString());
const source = readFileSync('src/content/articles/3DPRINT.md');
const gitSha = (buffer) => createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
const draft = { ...parseEntry('articles', '3DPRINT', source.toString()), title: 'DB-DRAFT-HTTP-ONLY', published: false };
db.prepare(`INSERT INTO editor_drafts (collection, entry_id, revision, base_sha, entry_json, images_json, updated_at, updated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('articles', '3DPRINT', randomUUID(), gitSha(source), JSON.stringify(draft), '[]', now, 'http-test');
const image = readFileSync('public/images/usui.webp');
const sha = gitSha(image);
db.prepare('INSERT INTO editor_uploads (sha, size, ready, created_at) VALUES (?, ?, 1, ?)').run(sha, image.length, now);
db.prepare('INSERT INTO editor_upload_parts (sha, part, data) VALUES (?, 0, ?)').run(sha, image.toString('base64'));
db.close();

const origin = 'http://localhost:3117';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', 'localhost', '--port', '3117'], {
  cwd: root, windowsHide: true,
  env: { ...process.env, NODE_ENV: 'development', EDITOR_D1_DATABASE_ID: '', EDITOR_D1_API_TOKEN: '',
    EDITOR_GITHUB_APP_ID: '', EDITOR_GITHUB_PRIVATE_KEY: '', EDITOR_GITHUB_REPO: '', EDITOR_GITHUB_INSTALLATION_ID: '',
    EDITOR_SQLITE_PATH: dbFile, EDITOR_ORIGIN: origin, VERCEL_ENV: '', NO_COLOR: '1',
    PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stderr.on('data', (data) => { logs += data; });
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 45_000);
    child.stdout.on('data', (data) => { logs += data; if (logs.includes('Ready in')) { clearTimeout(timeout); resolve(); } });
    child.on('exit', (code) => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)); });
  });
  const get = (url, authenticated = true) => fetch(origin + url, { headers: authenticated ? { Cookie: `kobo_editor_session=${token}` } : {}, signal: AbortSignal.timeout(45_000) });
  const editor = await get('/admin/articles/3DPRINT');
  const html = await editor.text();
  assert.equal(editor.status, 200);
  assert.ok(html.includes('DB-DRAFT-HTTP-ONLY'));
  assert.ok(html.includes('下書き保存'));
  assert.ok(html.includes('更新を確定'));
  const list = await get('/admin?c=works');
  assert.equal(list.status, 200);
  await list.text();
  const page = await get('/articles/3DPRINT', false);
  assert.equal(page.status, 200);
  assert.ok(!(await page.text()).includes('DB-DRAFT-HTTP-ONLY'));
  const privateImage = await get(`/admin/staged/${sha}`);
  assert.equal(privateImage.status, 200);
  assert.deepEqual(Buffer.from(await privateImage.arrayBuffer()), image);
  assert.equal((await get(`/admin/staged/${sha}`, false)).status, 401);
  console.log('HTTP smoke passed: draft overlay, save/publish controls, collection list, public-version isolation and authenticated image access');
} catch (error) {
  console.error(logs.slice(-1800));
  throw error;
} finally {
  if (child.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill();
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const file of [dbFile, dbFile + '-wal', dbFile + '-shm']) {
    try { await unlink(file); } catch (error) { if (error.code !== 'ENOENT') console.error('Temporary DB cleanup:', error.code); }
  }
}
