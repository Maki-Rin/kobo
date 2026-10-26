import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { CONTENT_BRANCH } from './config';
import type { User } from './auth';

export interface StoredFile {
  path: string;
  content: Buffer;
  sha: string;
}

export type FileChange =
  | { path: string; content: Buffer }
  | { path: string; blobSha: string };

export interface CommitRecord {
  id: string;
  at: string;
  title: string;
  authorName: string;
  editorId: string | null;
}

export interface CommitDetail extends CommitRecord {
  files: { path: string; before: Buffer | null; afterSha: string | null }[];
}

export interface CommitRequest {
  changes: FileChange[];
  expected: Record<string, string | null>;
  title: string;
  editor: User;
}

export interface ContentStore {
  read(filePath: string): Promise<StoredFile | null>;
  list(dir: string): Promise<string[]>;
  exists(filePath: string): Promise<boolean>;
  commit(request: CommitRequest): Promise<string>;
  stage(content: Buffer): Promise<string>;
  staged(sha: string): Promise<Buffer | null>;
  history(limit: number): Promise<CommitRecord[]>;
  detail(id: string): Promise<CommitDetail>;
}

export class ConflictError extends Error {}

export const CONTENT_PATHS = ['src/content/articles', 'public/images/articles'];

const WRITABLE = [
  /^src\/content\/articles\/[A-Za-z0-9_-]+\.md$/,
  /^public\/images\/articles\/[A-Za-z0-9_-]+\/[a-z0-9_-]+\.(jpg|png|webp|gif)$/,
];

export function isWritable(filePath: string): boolean {
  return WRITABLE.some((pattern) => pattern.test(filePath));
}

function assertWritable(changes: FileChange[]) {
  for (const change of changes) {
    if (!isWritable(change.path)) {
      throw new Error(`書き込めない場所です: ${change.path}`);
    }
  }
}

export function gitBlobSha(content: Buffer): string {
  return crypto
    .createHash('sha1')
    .update(`blob ${content.length}\0`)
    .update(content)
    .digest('hex');
}

function commitMessage(request: CommitRequest): string {
  return `${request.title}\n\nEditor: ${request.editor.displayName}\nEditor-Id: ${request.editor.id}`;
}

function parseMessage(message: string) {
  const [title] = message.split('\n');
  return {
    title,
    editorName: message.match(/^Editor: (.+)$/m)?.[1] ?? null,
    editorId: message.match(/^Editor-Id: (.+)$/m)?.[1] ?? null,
  };
}

interface LocalEntry {
  id: string;
  at: string;
  message: string;
  files: { path: string; before: string | null; afterSha: string }[];
}

const BLOB_SHA = /^[0-9a-f]{40}$/;

class LocalStore implements ContentStore {
  private logFile: string;
  private blobDir: string;

  constructor(private root: string) {
    this.logFile = path.join(root, '.editor-local/history.json');
    this.blobDir = path.join(root, '.editor-local/blobs');
  }

  async stage(content: Buffer): Promise<string> {
    const sha = gitBlobSha(content);
    await fs.mkdir(this.blobDir, { recursive: true });
    await fs.writeFile(path.join(this.blobDir, sha), content);
    return sha;
  }

  async staged(sha: string): Promise<Buffer | null> {
    if (!BLOB_SHA.test(sha)) return null;
    try {
      return await fs.readFile(path.join(this.blobDir, sha));
    } catch {
      return null;
    }
  }

  private resolve(filePath: string) {
    return path.join(this.root, filePath);
  }

  async read(filePath: string): Promise<StoredFile | null> {
    try {
      const content = await fs.readFile(this.resolve(filePath));
      return { path: filePath, content, sha: gitBlobSha(content) };
    } catch {
      return null;
    }
  }

  async list(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.resolve(dir), { withFileTypes: true });
      return entries.filter((e) => e.isFile()).map((e) => `${dir}/${e.name}`);
    } catch {
      return [];
    }
  }

  async exists(filePath: string): Promise<boolean> {
    return (await this.read(filePath)) !== null;
  }

  private async log(): Promise<LocalEntry[]> {
    try {
      return JSON.parse(await fs.readFile(this.logFile, 'utf8'));
    } catch {
      return [];
    }
  }

  async commit(request: CommitRequest): Promise<string> {
    assertWritable(request.changes);
    for (const [filePath, sha] of Object.entries(request.expected)) {
      const current = await this.read(filePath);
      if ((current?.sha ?? null) !== sha) {
        throw new ConflictError(`ほかの人が先に変更しています: ${filePath}`);
      }
    }
    const files: LocalEntry['files'] = [];
    for (const change of request.changes) {
      const content =
        'content' in change ? change.content : await this.staged(change.blobSha);
      if (!content) throw new Error(`画像が見つかりません: ${change.path}`);
      const before = await this.read(change.path);
      await fs.mkdir(path.dirname(this.resolve(change.path)), { recursive: true });
      await fs.writeFile(this.resolve(change.path), content);
      files.push({
        path: change.path,
        before: before ? before.content.toString('base64') : null,
        afterSha: gitBlobSha(content),
      });
    }
    const log = await this.log();
    const id = crypto.randomBytes(20).toString('hex');
    log.push({ id, at: new Date().toISOString(), message: commitMessage(request), files });
    await fs.mkdir(path.dirname(this.logFile), { recursive: true });
    await fs.writeFile(this.logFile, JSON.stringify(log, null, 2));
    return id;
  }

  private record(entry: LocalEntry): CommitRecord {
    const { title, editorName, editorId } = parseMessage(entry.message);
    return { id: entry.id, at: entry.at, title, authorName: editorName ?? '', editorId };
  }

  async history(limit: number): Promise<CommitRecord[]> {
    return (await this.log()).reverse().slice(0, limit).map((e) => this.record(e));
  }

  async detail(id: string): Promise<CommitDetail> {
    const entry = (await this.log()).find((e) => e.id === id);
    if (!entry) throw new Error('変更が見つかりません');
    return {
      ...this.record(entry),
      files: entry.files.map((file) => ({
        path: file.path,
        before: file.before === null ? null : Buffer.from(file.before, 'base64'),
        afterSha: file.afterSha,
      })),
    };
  }
}

interface GitHubConfig {
  appId: string;
  installationId: string;
  privateKey: string;
  repo: string;
  branch: string;
}

interface HeadTree {
  commitSha: string;
  treeSha: string;
  entries: Map<string, string>;
}

class GitHubStore implements ContentStore {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private config: GitHubConfig) {}

  private appJwt(): string {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
      iat: now - 60,
      exp: now + 540,
      iss: this.config.appId,
    })}`;
    const signature = crypto
      .createSign('RSA-SHA256')
      .update(unsigned)
      .sign(this.config.privateKey)
      .toString('base64url');
    return `${unsigned}.${signature}`;
  }

  private async installationToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }
    const response = await fetch(
      `https://api.github.com/app/installations/${this.config.installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.appJwt()}`,
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      throw new Error(`GitHub App の認証に失敗しました (${response.status})`);
    }
    const body = (await response.json()) as { token: string; expires_at: string };
    this.token = { value: body.token, expiresAt: Date.parse(body.expires_at) };
    return body.token;
  }

  private async api<T>(
    route: string,
    init: { method?: string; body?: unknown; raw?: boolean } = {}
  ): Promise<T> {
    const response = await fetch(
      `https://api.github.com/repos/${this.config.repo}${route}`,
      {
        method: init.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${await this.installationToken()}`,
          Accept: init.raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        cache: 'no-store',
      }
    );
    if (response.status === 409 || response.status === 422) {
      throw new ConflictError('ほかの保存と重なりました。もう一度保存してください');
    }
    if (!response.ok) {
      throw new Error(`GitHub API ${route} が失敗しました (${response.status})`);
    }
    return (init.raw ? Buffer.from(await response.arrayBuffer()) : await response.json()) as T;
  }

  private async head(): Promise<HeadTree> {
    const ref = await this.api<{ object: { sha: string } }>(
      `/git/ref/heads/${this.config.branch}`
    );
    const commit = await this.api<{ tree: { sha: string } }>(
      `/git/commits/${ref.object.sha}`
    );
    const tree = await this.api<{ tree: { path: string; sha: string; type: string }[] }>(
      `/git/trees/${commit.tree.sha}?recursive=1`
    );
    return {
      commitSha: ref.object.sha,
      treeSha: commit.tree.sha,
      entries: new Map(
        tree.tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha])
      ),
    };
  }

  async stage(content: Buffer): Promise<string> {
    const blob = await this.api<{ sha: string }>('/git/blobs', {
      method: 'POST',
      body: { content: content.toString('base64'), encoding: 'base64' },
    });
    return blob.sha;
  }

  async staged(sha: string): Promise<Buffer | null> {
    if (!BLOB_SHA.test(sha)) return null;
    try {
      return await this.blob(sha);
    } catch {
      return null;
    }
  }

  private async blob(sha: string): Promise<Buffer> {
    const body = await this.api<{ content: string }>(`/git/blobs/${sha}`);
    return Buffer.from(body.content, 'base64');
  }

  async read(filePath: string): Promise<StoredFile | null> {
    const sha = (await this.head()).entries.get(filePath);
    if (!sha) return null;
    return { path: filePath, content: await this.blob(sha), sha };
  }

  async list(dir: string): Promise<string[]> {
    const prefix = `${dir}/`;
    return [...(await this.head()).entries.keys()].filter(
      (p) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/')
    );
  }

  async exists(filePath: string): Promise<boolean> {
    return (await this.head()).entries.has(filePath);
  }

  async commit(request: CommitRequest): Promise<string> {
    assertWritable(request.changes);
    const head = await this.head();
    for (const [filePath, sha] of Object.entries(request.expected)) {
      if ((head.entries.get(filePath) ?? null) !== sha) {
        throw new ConflictError(`ほかの人が先に変更しています: ${filePath}`);
      }
    }
    const tree = [];
    for (const change of request.changes) {
      const sha = 'content' in change ? await this.stage(change.content) : change.blobSha;
      tree.push({ path: change.path, mode: '100644', type: 'blob', sha });
    }
    const newTree = await this.api<{ sha: string }>('/git/trees', {
      method: 'POST',
      body: { base_tree: head.treeSha, tree },
    });
    const commit = await this.api<{ sha: string }>('/git/commits', {
      method: 'POST',
      body: {
        message: commitMessage(request),
        tree: newTree.sha,
        parents: [head.commitSha],
      },
    });
    await this.api(`/git/refs/heads/${this.config.branch}`, {
      method: 'PATCH',
      body: { sha: commit.sha, force: false },
    });
    return commit.sha;
  }

  async history(limit: number): Promise<CommitRecord[]> {
    const commits = await this.api<
      { sha: string; commit: { message: string; author: { name: string; date: string } } }[]
    >(`/commits?sha=${this.config.branch}&path=src/content/articles&per_page=${limit}`);
    return commits.map((c) => {
      const { title, editorName, editorId } = parseMessage(c.commit.message);
      return {
        id: c.sha,
        at: c.commit.author.date,
        title,
        authorName: editorName ?? c.commit.author.name,
        editorId,
      };
    });
  }

  async detail(id: string): Promise<CommitDetail> {
    const commit = await this.api<{
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
      parents: { sha: string }[];
      files: { filename: string; status: string; sha: string }[];
    }>(`/commits/${id}`);
    const { title, editorName, editorId } = parseMessage(commit.commit.message);
    const parent = commit.parents[0]?.sha;
    const files = [];
    for (const file of commit.files) {
      const before =
        file.status === 'added' || !parent
          ? null
          : await this.api<Buffer>(
              `/contents/${file.filename}?ref=${parent}`,
              { raw: true }
            );
      files.push({
        path: file.filename,
        before,
        afterSha: file.status === 'removed' ? null : file.sha,
      });
    }
    return {
      id: commit.sha,
      at: commit.commit.author.date,
      title,
      authorName: editorName ?? commit.commit.author.name,
      editorId,
      files,
    };
  }
}

let instance: ContentStore | null = null;

export function getStore(): ContentStore {
  if (instance) return instance;
  const {
    EDITOR_GITHUB_APP_ID,
    EDITOR_GITHUB_INSTALLATION_ID,
    EDITOR_GITHUB_PRIVATE_KEY,
    EDITOR_GITHUB_REPO,
  } = process.env;
  if (EDITOR_GITHUB_APP_ID) {
    if (!EDITOR_GITHUB_INSTALLATION_ID || !EDITOR_GITHUB_PRIVATE_KEY || !EDITOR_GITHUB_REPO) {
      throw new Error('GitHub App の環境変数が足りません');
    }
    instance = new GitHubStore({
      appId: EDITOR_GITHUB_APP_ID,
      installationId: EDITOR_GITHUB_INSTALLATION_ID,
      privateKey: EDITOR_GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
      repo: EDITOR_GITHUB_REPO,
      branch: CONTENT_BRANCH,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    instance = new LocalStore(process.cwd());
  } else {
    throw new Error('GitHub App が設定されていません');
  }
  return instance;
}
