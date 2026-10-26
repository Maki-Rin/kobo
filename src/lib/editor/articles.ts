import crypto from 'crypto';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { renderMarkdown } from '../markdown';
import type { User } from './auth';
import { audit } from './auth';
import { ConflictError, getStore, type FileChange } from './store';

export const ARTICLE_DIR = 'src/content/articles';
export const IMAGE_DIR = 'public/images/articles';

export class EditorError extends Error {
  constructor(public messages: string[]) {
    super(messages.join('\n'));
  }
}

export interface ArticleDraft {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  authorName: string;
  authorAvatar: string;
  coverImage: string;
  body: string;
  published: boolean;
}

export interface ArticleSummary {
  id: string;
  title: string;
  date: string;
  published: boolean;
}

export interface StagedImage {
  name: string;
  sha: string;
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES = 30;
const NEW_ID = /^[a-z0-9][a-z0-9-]{1,59}$/;
const IMAGE_NAME = /^[a-z0-9_-]+\.(jpg|png|webp|gif)$/;

export function newArticleId(date: string): string {
  return `${date.replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex')}`;
}

const articlePath = (id: string) => `${ARTICLE_DIR}/${id}.md`;

function parseArticle(id: string, source: string): ArticleDraft {
  const { data, content } = matter(source);
  return {
    id,
    title: String(data.title ?? ''),
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? ''),
    excerpt: String(data.excerpt ?? ''),
    authorName: String(data.author?.name ?? ''),
    authorAvatar: String(data.author?.avatar ?? ''),
    coverImage: String(data.coverImage ?? ''),
    body: content.replace(/^\n+/, ''),
    published: data.published !== false,
  };
}

export function toMarkdown(draft: ArticleDraft): string {
  const front: Record<string, unknown> = {
    title: draft.title,
    date: draft.date,
  };
  if (draft.excerpt) front.excerpt = draft.excerpt;
  front.author = { name: draft.authorName, avatar: draft.authorAvatar };
  front.coverImage = draft.coverImage;
  if (!draft.published) front.published = false;
  return matter.stringify(`\n${draft.body.trim()}\n`, front);
}

export async function listArticles(): Promise<ArticleSummary[]> {
  const store = getStore();
  const files = (await store.list(ARTICLE_DIR)).filter((p) => p.endsWith('.md'));
  const articles = await Promise.all(
    files.map(async (filePath) => {
      const file = await store.read(filePath);
      const id = filePath.slice(ARTICLE_DIR.length + 1, -3);
      const draft = parseArticle(id, file?.content.toString('utf8') ?? '');
      return { id, title: draft.title, date: draft.date, published: draft.published };
    })
  );
  return articles.sort((a, b) => b.date.localeCompare(a.date));
}

export async function loadArticle(
  id: string
): Promise<{ draft: ArticleDraft; sha: string } | null> {
  const file = await getStore().read(articlePath(id));
  if (!file) return null;
  return { draft: parseArticle(id, file.content.toString('utf8')), sha: file.sha };
}

function detectImageType(data: Buffer): string | null {
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (data.subarray(0, 4).toString('latin1') === 'RIFF' && data.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (data.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
  return null;
}

function bodyImageUrls(body: string): string[] {
  const urls: string[] = [];
  visit(unified().use(remarkParse).use(remarkGfm).parse(body), 'image', (node) => {
    urls.push(node.url);
  });
  return urls;
}

export function imagePublicPath(articleId: string, name: string): string {
  return `/images/articles/${articleId}/${name}`;
}

function checkImage(data: Buffer): string | null {
  const type = detectImageType(data);
  if (!type) return '対応していない画像の形式です（JPEG・PNG・WebP・GIF）';
  if (data.length > MAX_IMAGE_BYTES) return '画像が大きすぎます（3MBまで）';
  return null;
}

export async function stageImage(data: Buffer): Promise<{ sha: string; type: string }> {
  const problem = checkImage(data);
  if (problem) throw new EditorError([problem]);
  return { sha: await getStore().stage(data), type: detectImageType(data)! };
}

async function validate(
  draft: ArticleDraft,
  isNew: boolean,
  images: StagedImage[]
): Promise<FileChange[]> {
  const store = getStore();
  const errors: string[] = [];

  if (isNew) {
    if (!NEW_ID.test(draft.id)) {
      errors.push('URLの名前は半角の英小文字・数字・ハイフンで2〜60文字にしてください');
    } else if (await store.exists(articlePath(draft.id))) {
      errors.push('同じURLの名前の記事がすでにあります');
    }
  }
  if (!draft.title.trim()) errors.push('タイトルを入れてください');
  if (draft.title.length > 120) errors.push('タイトルは120文字までです');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(Date.parse(draft.date))) {
    errors.push('日付が正しくありません');
  }
  if (draft.excerpt.length > 200) errors.push('概要は200文字までです');
  if (draft.published && !draft.authorName.trim()) errors.push('書いた人の名前を入れてください');
  if (!draft.body.trim()) errors.push('本文が空です');

  if (images.length > MAX_IMAGES) {
    errors.push(`一度に追加できる画像は${MAX_IMAGES}枚までです。何回かに分けて保存してください`);
  }
  const uploaded = new Set<string>();
  const changes: FileChange[] = [];
  for (const image of images) {
    const data = await store.staged(image.sha);
    const type = data ? detectImageType(data) : null;
    if (!data || !IMAGE_NAME.test(image.name) || !type || !image.name.endsWith(`.${type}`)) {
      errors.push(`画像 ${image.name} を読み込めませんでした。もう一度追加してください`);
      continue;
    }
    const problem = checkImage(data);
    if (problem) {
      errors.push(`画像 ${image.name}: ${problem}`);
      continue;
    }
    const publicPath = imagePublicPath(draft.id, image.name);
    if (await store.exists(`public${publicPath}`)) continue;
    uploaded.add(publicPath);
    changes.push({ path: `public${publicPath}`, blobSha: image.sha });
  }

  const missing = async (url: string) =>
    url.startsWith('/') && !uploaded.has(url) && !(await store.exists(`public${url}`));

  if (!draft.coverImage) {
    if (draft.published) errors.push('カバー画像を選んでください');
  } else if (await missing(draft.coverImage)) {
    errors.push(`カバー画像が見つかりません: ${draft.coverImage}`);
  }
  for (const url of bodyImageUrls(draft.body)) {
    if (await missing(url)) errors.push(`本文の画像が見つかりません: ${url}`);
  }
  try {
    await renderMarkdown(draft.body);
  } catch {
    errors.push('本文を変換できませんでした。書き方を確認してください');
  }

  if (errors.length > 0) throw new EditorError(errors);
  return changes;
}

function sanitizeDraft(raw: Record<string, unknown>): ArticleDraft {
  const text = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string) : '');
  return {
    id: text('id'),
    title: text('title').trim(),
    date: text('date'),
    excerpt: text('excerpt').trim(),
    authorName: text('authorName').trim(),
    authorAvatar: text('authorAvatar') || '/kobo.svg',
    coverImage: text('coverImage'),
    body: text('body'),
    published: raw.published !== false,
  };
}

export async function saveArticle(
  user: User,
  input: { draft: Record<string, unknown>; isNew: boolean; baseSha: string | null; images: StagedImage[] }
): Promise<string> {
  const draft = sanitizeDraft(input.draft);
  if (!input.isNew && (!input.baseSha || !(await getStore().exists(articlePath(draft.id))))) {
    throw new EditorError(['編集する記事が見つかりません']);
  }
  const changes = await validate(draft, input.isNew, input.images);
  const filePath = articlePath(draft.id);
  changes.push({ path: filePath, content: Buffer.from(toMarkdown(draft)) });
  const action = !draft.published ? '下書きを保存' : input.isNew ? '記事を公開' : '記事を更新';
  const id = await getStore().commit({
    changes,
    expected: { [filePath]: input.isNew ? null : input.baseSha },
    title: `📝 ${action}: ${draft.title}`,
    editor: user,
  });
  await audit(user.id, 'article.save', draft.id, id);
  return id;
}

export async function revertCommit(user: User, commitId: string): Promise<string> {
  const store = getStore();
  const detail = await store.detail(commitId);
  if (user.role === 'editor' && detail.editorId !== user.id) {
    throw new EditorError(['ほかの人の変更を戻せるのはまとめ役だけです']);
  }
  const changes: FileChange[] = [];
  const expected: Record<string, string | null> = {};
  for (const file of detail.files) {
    if (!file.path.startsWith(`${ARTICLE_DIR}/`) && !file.path.startsWith(`${IMAGE_DIR}/`)) {
      continue;
    }
    const current = await store.read(file.path);
    if ((current?.sha ?? null) !== file.afterSha) {
      throw new ConflictError(
        `この変更のあとに別の変更があるので戻せません（${file.path}）。先にあとの変更を戻してください`
      );
    }
    if (file.before) {
      changes.push({ path: file.path, content: file.before });
      expected[file.path] = file.afterSha;
    } else if (current && file.path.endsWith('.md')) {
      const id = file.path.slice(ARTICLE_DIR.length + 1, -3);
      const draft = parseArticle(id, current.content.toString('utf8'));
      changes.push({ path: file.path, content: Buffer.from(toMarkdown({ ...draft, published: false })) });
      expected[file.path] = file.afterSha;
    }
  }
  if (changes.length === 0) throw new EditorError(['戻せる記事の変更がありません']);
  const id = await store.commit({
    changes,
    expected,
    title: `↩️ 元に戻す: ${detail.title}`,
    editor: user,
  });
  await audit(user.id, 'commit.revert', commitId, id);
  return id;
}
