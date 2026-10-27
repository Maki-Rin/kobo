import crypto from 'crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { renderMarkdown } from '../markdown';
import {
  collectionLabels,
  contentDir,
  emptyEntry,
  entryPath,
  imageDir,
  isCollection,
  parseEntry,
  serializeEntry,
  type Collection,
  type Entry,
} from '../content-schema';
import type { User } from './auth';
import { audit } from './auth';
import { recordArticleEvent, type ArticleAction } from './activity';
import { ConflictError, getStore, type FileChange } from './store';

export class EditorError extends Error {
  constructor(public messages: string[]) {
    super(messages.join('\n'));
  }
}

export interface EntrySummary {
  collection: Collection;
  id: string;
  title: string;
  date: string;
  published: boolean;
  coverImage: string;
  authors: string[];
  legacyAuthor: string;
  type: Entry['type'];
  status: Entry['status'];
  hasRecord: boolean;
}

export interface StagedImage {
  name: string;
  sha: string;
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES = 30;
const NEW_ID = /^[a-z0-9][a-z0-9-]{1,59}$/;
const IMAGE_NAME = /^[a-z0-9_-]+\.(jpg|png|webp|gif)$/;

export function newEntryId(date: string): string {
  return `${date.replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex')}`;
}

export function entryFromPath(filePath: string): { collection: Collection; id: string } | null {
  const match = filePath.match(/^src\/content\/([a-z]+)\/([A-Za-z0-9_-]+)\.md$/);
  if (!match || !isCollection(match[1])) return null;
  return { collection: match[1], id: match[2] };
}

export async function listEntries(collection: Collection): Promise<EntrySummary[]> {
  const store = getStore();
  const dir = contentDir(collection);
  const files = (await store.list(dir)).filter((p) => p.endsWith('.md'));
  const entries = await Promise.all(
    files.map(async (filePath) => {
      const file = await store.read(filePath);
      const entry = parseEntry(collection, filePath.slice(dir.length + 1, -3), file?.content.toString('utf8') ?? '');
      return {
        collection,
        id: entry.id,
        title: entry.title,
        date: entry.date,
        published: entry.published,
        coverImage: entry.coverImage,
        authors: entry.authors,
        legacyAuthor: entry.legacyAuthor,
        type: entry.type,
        status: entry.status,
        hasRecord: entry.record.trim() !== '',
      };
    })
  );
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export async function loadEntry(
  collection: Collection,
  id: string
): Promise<{ draft: Entry; sha: string } | null> {
  const file = await getStore().read(entryPath(collection, id));
  if (!file) return null;
  return { draft: parseEntry(collection, id, file.content.toString('utf8')), sha: file.sha };
}

function detectImageType(data: Buffer): string | null {
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (data.subarray(0, 4).toString('latin1') === 'RIFF' && data.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (data.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
  return null;
}

function markdownImageUrls(markdown: string): string[] {
  const urls: string[] = [];
  visit(unified().use(remarkParse).use(remarkGfm).parse(markdown), 'image', (node) => {
    urls.push(node.url);
  });
  return urls;
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

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const validTime = (value: string) => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

async function validate(draft: Entry, isNew: boolean, images: StagedImage[]): Promise<FileChange[]> {
  const store = getStore();
  const errors: string[] = [];
  const label = collectionLabels[draft.collection];

  if (isNew) {
    if (!NEW_ID.test(draft.id)) {
      errors.push('URLの名前は半角の英小文字・数字・ハイフンで2〜60文字にしてください');
    } else if (await store.exists(entryPath(draft.collection, draft.id))) {
      errors.push(`同じURLの名前の${label}がすでにあります`);
    }
  }
  if (!draft.title.trim()) errors.push('タイトルを入れてください');
  if (draft.title.length > 120) errors.push('タイトルは120文字までです');
  if (!validDate(draft.date)) errors.push(draft.collection === 'events' ? '開催日が正しくありません' : '日付が正しくありません');
  if (draft.excerpt.length > 200) errors.push('概要は200文字までです');
  if (draft.collection !== 'events' && draft.published && draft.authors.length === 0) {
    errors.push(draft.collection === 'works' ? '作った人の名前を入れてください' : '書いた人の名前を入れてください');
  }
  if (draft.collection === 'articles' && !draft.body.trim()) errors.push('本文が空です');
  if (draft.collection === 'events') {
    if (!validTime(draft.startTime) || !validTime(draft.endTime)) errors.push('時刻は 12:40 のように入れてください');
    if (draft.applyUrl && !/^https:\/\//.test(draft.applyUrl)) errors.push('申し込みリンクは https:// で始まるURLにしてください');
  }

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
    const publicPath = `${imageDir(draft.collection, draft.id)}/${image.name}`;
    if (await store.exists(`public${publicPath}`)) continue;
    uploaded.add(publicPath);
    changes.push({ path: `public${publicPath}`, blobSha: image.sha });
  }

  const missing = async (url: string) =>
    url.startsWith('/') && !uploaded.has(url) && !(await store.exists(`public${url}`));

  if (!draft.coverImage) {
    if (draft.published && draft.collection !== 'events') errors.push('カバー画像を選んでください');
  } else if (await missing(draft.coverImage)) {
    errors.push(`カバー画像が見つかりません: ${draft.coverImage}`);
  }
  for (const url of [...draft.images, ...markdownImageUrls(draft.body), ...markdownImageUrls(draft.record)]) {
    if (await missing(url)) errors.push(`画像が見つかりません: ${url}`);
  }
  for (const markdown of [draft.body, draft.record]) {
    try {
      await renderMarkdown(markdown);
    } catch {
      errors.push('本文を変換できませんでした。書き方を確認してください');
    }
  }

  if (errors.length > 0) throw new EditorError([...new Set(errors)]);
  return changes;
}

function sanitizeDraft(collection: Collection, raw: Record<string, unknown>): Entry {
  const text = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string) : '');
  const list = (key: string) =>
    Array.isArray(raw[key]) ? (raw[key] as unknown[]).map(String).map((v) => v.trim()).filter(Boolean) : [];
  const base = emptyEntry(collection, text('id'));
  return {
    ...base,
    title: text('title').trim(),
    date: text('date'),
    excerpt: text('excerpt').trim(),
    authors: list('authors'),
    coverImage: text('coverImage'),
    body: text('body'),
    published: raw.published !== false,
    machines: list('machines'),
    topics: list('topics'),
    type: raw.type === 'tech' ? 'tech' : 'guide',
    status: raw.status === 'wip' ? 'wip' : 'done',
    images: list('images'),
    difficulty: text('difficulty').trim(),
    duration: text('duration').trim(),
    event: text('event').trim(),
    startTime: text('startTime').trim(),
    endTime: text('endTime').trim(),
    place: text('place').trim(),
    capacity: text('capacity').trim(),
    applyUrl: text('applyUrl').trim(),
    participants: text('participants').trim(),
    record: text('record'),
  };
}

export async function saveEntry(
  user: User,
  input: {
    collection: Collection;
    draft: Record<string, unknown>;
    isNew: boolean;
    baseSha: string | null;
    images: StagedImage[];
  }
): Promise<string> {
  const draft = sanitizeDraft(input.collection, input.draft);
  const previous = input.isNew ? null : await loadEntry(input.collection, draft.id);
  if (!input.isNew && (!input.baseSha || !previous)) {
    throw new EditorError([`編集する${collectionLabels[input.collection]}が見つかりません`]);
  }
  const changes = await validate(draft, input.isNew, input.images);
  const filePath = entryPath(draft.collection, draft.id);
  changes.push({ path: filePath, content: Buffer.from(serializeEntry(draft)) });
  const label = collectionLabels[draft.collection];
  const verb = !draft.published ? '下書きを保存' : previous?.draft.published ? `${label}を更新` : `${label}を公開`;
  const commitId = await getStore().commit({
    changes,
    expected: { [filePath]: input.isNew ? null : input.baseSha },
    title: `📝 ${verb}: ${draft.title}`,
    editor: user,
  });
  const action: ArticleAction = !draft.published
    ? previous?.draft.published
      ? 'unpublish'
      : 'draft'
    : previous?.draft.published
      ? 'update'
      : 'publish';
  await recordArticleEvent({
    collection: draft.collection,
    articleId: draft.id,
    title: draft.title,
    action,
    userId: user.id,
    commitId,
  });
  await audit(user.id, 'entry.save', `${draft.collection}/${draft.id}`, commitId);
  return commitId;
}

const editable = (filePath: string) =>
  /^src\/content\/(articles|works|events)\//.test(filePath) || /^public\/images\/(articles|works|events)\//.test(filePath);

export async function revertCommit(user: User, commitId: string): Promise<string> {
  const store = getStore();
  const detail = await store.detail(commitId);
  if (user.role === 'editor' && detail.editorId !== user.id) {
    throw new EditorError(['ほかの人の変更を戻せるのはまとめ役だけです']);
  }
  const changes: FileChange[] = [];
  const expected: Record<string, string | null> = {};
  for (const file of detail.files) {
    if (!editable(file.path)) continue;
    const current = await store.read(file.path);
    if ((current?.sha ?? null) !== file.afterSha) {
      throw new ConflictError(
        `この変更のあとに別の変更があるので戻せません（${file.path}）。先にあとの変更を戻してください`
      );
    }
    const target = entryFromPath(file.path);
    if (file.before) {
      changes.push({ path: file.path, content: file.before });
      expected[file.path] = file.afterSha;
    } else if (current && target) {
      const entry = parseEntry(target.collection, target.id, current.content.toString('utf8'));
      changes.push({ path: file.path, content: Buffer.from(serializeEntry({ ...entry, published: false })) });
      expected[file.path] = file.afterSha;
    }
  }
  if (changes.length === 0) throw new EditorError(['戻せる変更がありません']);
  const id = await store.commit({ changes, expected, title: `↩️ 元に戻す: ${detail.title}`, editor: user });
  for (const change of changes) {
    const target = entryFromPath(change.path);
    if (!target) continue;
    const restored = 'content' in change ? parseEntry(target.collection, target.id, change.content.toString('utf8')) : null;
    await recordArticleEvent({
      collection: target.collection,
      articleId: target.id,
      title: restored?.title ?? target.id,
      action: 'revert',
      userId: user.id,
      commitId: id,
    });
  }
  await audit(user.id, 'commit.revert', commitId, id);
  return id;
}
