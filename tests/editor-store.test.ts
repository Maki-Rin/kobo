import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { ConflictError, GitHubStore } from '../src/lib/editor/store';

test('directory reads share one head and concurrent authentication; saves check the latest head', async (t) => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const store = new GitHubStore({
    appId: '1', installationId: '2', repo: 'test/content', branch: 'main',
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  });
  const calls: string[] = [];
  let revision = 'first';
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    let body: unknown;
    if (url.endsWith('/access_tokens')) {
      // Yield so parallel operations reach authentication before it completes.
      await new Promise((resolve) => setTimeout(resolve, 5));
      body = { token: 'test-token', expires_at: new Date(Date.now() + 3600_000).toISOString() };
    } else if (url.includes('/git/ref/heads/')) {
      body = { object: { sha: revision } };
    } else if (url.includes('/git/commits/')) {
      body = { tree: { sha: revision } };
    } else if (url.includes('/git/trees/')) {
      body = { tree: [
        { path: 'src/content/articles/one.md', sha: revision, type: 'blob' },
        { path: 'src/content/articles/two.md', sha: 'second', type: 'blob' },
        { path: 'src/content/articles/image.png', sha: 'image', type: 'blob' },
        { path: 'src/content/articles/nested/three.md', sha: 'nested', type: 'blob' },
      ] };
    } else if (url.includes('/git/blobs/')) {
      body = { content: Buffer.from(url.split('/').at(-1)!).toString('base64') };
    } else {
      throw new Error(`Unexpected request: ${url}`);
    }
    return Response.json(body);
  });

  const [files] = await Promise.all([
    store.readDirectory('src/content/articles'),
    store.exists('src/content/articles/one.md'),
  ]);
  assert.equal(calls.filter((url) => url.endsWith('/access_tokens')).length, 1);
  assert.equal(files.length, 2);
  assert.equal(files[0].content.toString(), 'first');
  // One directory read and one independent exists call, never one head per file.
  assert.equal(calls.filter((url) => url.includes('/git/ref/heads/')).length, 2);
  assert.equal(calls.filter((url) => url.includes('/git/blobs/')).length, 2);

  revision = 'updated-by-another-editor';
  await assert.rejects(store.commit({
    changes: [], expected: { 'src/content/articles/one.md': 'first' },
    title: 'Save', editor: { id: 'editor', displayName: '山田 太郎', role: 'editor' },
  }), ConflictError);
});
