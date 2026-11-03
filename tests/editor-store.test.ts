import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { ConflictError, ContentStoreError, GitHubStore } from '../src/lib/editor/store';

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

  const unchanged = await store.commit({
    changes: [{ path: 'src/content/articles/one.md', blobSha: 'first' }],
    expected: { 'src/content/articles/one.md': 'first' }, title: 'No changes',
    editor: { id: 'editor', displayName: '山田 太郎', role: 'editor' },
  });
  assert.equal(unchanged, 'first');

  revision = 'updated-by-another-editor';
  await assert.rejects(store.commit({
    changes: [], expected: { 'src/content/articles/one.md': 'first' },
    title: 'Save', editor: { id: 'editor', displayName: '山田 太郎', role: 'editor' },
  }), ConflictError);
});

test('save errors distinguish protected branches, permission failures and invalid data from concurrent updates', async (t) => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const cases = [
    { status: 422, message: 'Cannot update this protected ref', phase: 'ref', expected: /ブランチ保護ルール/ },
    { status: 409, message: 'Repository rule violations found for refs/heads/main', phase: 'ref', expected: /ブランチ保護ルール/ },
    { status: 403, message: 'Resource not accessible by integration', phase: 'ref', expected: /書き込み権限/ },
    { status: 422, message: 'Update is not a fast forward', phase: 'ref', expected: /ほかの保存/ },
    { status: 422, message: 'Invalid tree', phase: 'tree', expected: /HTTP 422/ },
    { status: 403, message: 'API rate limit exceeded', phase: 'ref', expected: /利用上限/ },
  ];
  for (const scenario of cases) {
    await t.test(scenario.message, async (st) => {
      const store = new GitHubStore({
        appId: '1', installationId: '2', repo: 'test/content', branch: 'main',
        privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      });
      st.mock.method(console, 'error', () => {});
      st.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if ((scenario.phase === 'ref' && init?.method === 'PATCH') ||
            (scenario.phase === 'tree' && init?.method === 'POST' && url.endsWith('/git/trees'))) {
          return Response.json({ message: scenario.message }, { status: scenario.status });
        }
        if (url.endsWith('/access_tokens')) {
          return Response.json({ token: 'test-token', expires_at: new Date(Date.now() + 3600_000).toISOString() });
        }
        if (url.includes('/git/ref/heads/')) return Response.json({ object: { sha: 'head' } });
        if (url.includes('/git/commits/')) return Response.json({ tree: { sha: 'base-tree' } });
        if (url.includes('/git/trees/')) return Response.json({ tree: [] });
        if (url.endsWith('/git/trees')) return Response.json({ sha: 'new-tree' });
        if (url.endsWith('/git/commits')) return Response.json({ sha: 'new-commit' });
        throw new Error(`Unexpected request: ${url}`);
      });
      await assert.rejects(store.commit({
        changes: [{ path: 'src/content/people.json', blobSha: 'blob-sha' }], expected: {},
        title: 'Save', editor: { id: 'editor', displayName: '山田 太郎', role: 'editor' },
      }), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, scenario.expected);
        assert.equal(error instanceof ConflictError, scenario.message === 'Update is not a fast forward');
        assert.equal(error instanceof ContentStoreError, scenario.message !== 'Update is not a fast forward');
        return true;
      });
    });
  }
});
