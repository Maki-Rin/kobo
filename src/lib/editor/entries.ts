import crypto from 'crypto';
import { detectImageType } from '../image-type';
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
import { audit, canManageMembers } from './auth';
import { recordArticleEvent, type ArticleAction } from './activity';
import { ConflictError, ContentStoreError, getStore, gitBlobSha, isWritable, type FileChange, type ContentStore } from './store';
import { draftToken, listDrafts, readDraft, removeDraft, writeDraft } from './drafts';
import { stageUpload, stagedImage, readUpload, releasePublishedUploads } from './uploads';
import { getDb, type Db } from './db';
import { publishBlockers } from './publish-checks';

interface EditorServices { store: ContentStore; db: Db }

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
  reportOnly: boolean;
  hasDraft?: boolean;
  draftUpdatedAt?: string;
  draftUpdatedBy?: string;
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

export async function listEntries(collection: Collection, services?: EditorServices): Promise<EntrySummary[]> {
  const store = services?.store ?? getStore();
  const dir = contentDir(collection);
  const [files, drafts] = await Promise.all([store.readDirectory(dir), listDrafts(collection, services?.db)]);
  const entries: EntrySummary[] = files.map((file) => {
    const entry = parseEntry(collection, file.path.slice(dir.length + 1, -3), file.content.toString('utf8'));
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
      reportOnly: entry.reportOnly,
    };
  });
  for (const saved of drafts) {
    const existing = entries.findIndex((entry) => entry.id === saved.entry.id);
    const entry = saved.entry;
    const cover = saved.images.find((image) => entry.coverImage === `${imageDir(collection, entry.id)}/${image.name}`);
    const summary: EntrySummary = {
      collection, id: entry.id, title: entry.title, date: entry.date,
      published: existing >= 0 ? entries[existing].published : false,
      coverImage: cover ? `/admin/staged/${cover.sha}` : entry.coverImage,
      authors: entry.authors, legacyAuthor: entry.legacyAuthor,
      type: entry.type, status: entry.status, hasRecord: !!entry.record.trim(), reportOnly: entry.reportOnly, hasDraft: true,
      draftUpdatedAt: saved.updatedAt, draftUpdatedBy: saved.updatedBy,
    };
    if (existing >= 0) entries[existing] = summary;
    else entries.push(summary);
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export async function loadEntry(
  collection: Collection,
  id: string,
  services?: EditorServices
): Promise<{ draft: Entry; sha: string; images: StagedImage[]; draftOwnerId?: string; hasFile: boolean } | null> {
  const [file, saved] = await Promise.all([(services?.store ?? getStore()).read(entryPath(collection, id)), readDraft(collection, id, services?.db)]);
  if (saved) return {
    draft: { ...saved.entry, published: file ? parseEntry(collection, id, file.content.toString('utf8')).published : false },
    sha: draftToken(saved), images: saved.images, draftOwnerId: saved.updatedById, hasFile: file !== null,
  };
  if (!file) return null;
  return { draft: parseEntry(collection, id, file.content.toString('utf8')), sha: file.sha, images: [], hasFile: true };
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
  return { sha: await stageUpload(data), type: detectImageType(data)! };
}

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const validTime = (value: string) => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

async function validate(draft: Entry, isNew: boolean, images: StagedImage[], store = getStore(), readImage = stagedImage): Promise<FileChange[]> {
  const errors: string[] = [];
  const label = collectionLabels[draft.collection];
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(draft.id)) throw new EditorError(['URLの名前が正しくありません']);
  if (draft.body.length > 100_000 || draft.record.length > 100_000) errors.push('本文は10万文字までです');
  if (Buffer.byteLength(JSON.stringify(draft), 'utf8') > 1_000_000) errors.push('入力内容の合計サイズが大きすぎます');

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
  if (draft.published && draft.collection === 'articles' && !draft.body.trim()) errors.push('本文が空です');
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
    const data = await readImage(image.sha);
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
    changes.push({ path: `public${publicPath}`, content: data });
  }

  const missing = async (url: string) =>
    url.startsWith('/') && (!/^\/images\/(?!.*\.\.)[A-Za-z0-9_./-]+$/.test(url) ||
      (!uploaded.has(url) && !(await store.exists(`public${url}`))));

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
    reportOnly: collection === 'events' && raw.reportOnly === true,
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
    operation?: 'draft' | 'publish' | 'unpublish';
    previousId?: string | null;
  },
  services?: EditorServices
): Promise<{ commitId: string | null; changed: boolean }> {
  const draft = sanitizeDraft(input.collection, input.draft);
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(draft.id)) throw new EditorError(['URLの名前が正しくありません']);
  const operation = input.operation ?? (draft.published ? 'publish' : 'draft');
  const store = services?.store ?? getStore();
  const db = services?.db ?? await getDb();
  const readImage = async (sha: string) => (await readUpload(sha, db)) ?? store.staged(sha);
  const filePath = entryPath(draft.collection, draft.id);
  const sourceId = !input.isNew && input.previousId && input.previousId !== draft.id ? input.previousId : draft.id;
  const renaming = sourceId !== draft.id;
  if (renaming && !/^[A-Za-z0-9_-]{1,80}$/.test(sourceId)) throw new EditorError(['URLの名前が正しくありません']);
  const [file, saved] = await Promise.all([store.read(filePath), readDraft(draft.collection, sourceId, db)]);
  if (renaming) {
    if (operation === 'unpublish' || await store.read(entryPath(draft.collection, sourceId))) {
      throw new EditorError(['一度公開したのでURLは変えられません']);
    }
    if (!saved) throw new ConflictError('下書きが見つかりません。開き直して確認してください');
    if (file || await readDraft(draft.collection, draft.id, db)) {
      throw new EditorError([`同じURLの${collectionLabels[draft.collection]}がすでにあります`]);
    }
  }
  const previous = file ? parseEntry(draft.collection, draft.id, file.content.toString('utf8')) : null;
  const token = saved ? draftToken(saved) : file?.sha ?? null;
  if ((input.isNew && token !== null) || (!input.isNew && (token === null || token !== input.baseSha))) {
    throw new ConflictError('ほかの人が先に変更しています。書きかけを残して、最新の内容を確認してください');
  }
  const baseSha = saved ? saved.baseSha : file?.sha ?? null;
  const combinedImages = new Map([...(saved?.images ?? []), ...input.images].map((image) => [image.name, image]));
  const usedImages = [...combinedImages.values()].filter((image) => {
    const publicPath = `${imageDir(draft.collection, draft.id)}/${image.name}`;
    return [draft.body, draft.record, draft.coverImage, ...draft.images].some((value) => value.includes(publicPath));
  });
  // A previous publish may have reached GitHub before its DB cleanup failed.
  // Retrying the same snapshot must not publish twice or discard a newer draft.
  if (operation === 'publish') {
    const blockers = publishBlockers(draft);
    if (blockers.length) throw new EditorError(blockers);
  }
  if (operation === 'publish' && previous?.published &&
      serializeEntry(previous) === serializeEntry({ ...draft, published: true })) {
    const imagesMatch = await Promise.all(usedImages.map(async (image) =>
      (await store.read(`public${imageDir(draft.collection, draft.id)}/${image.name}`))?.sha === image.sha));
    if (imagesMatch.every(Boolean)) {
      if (saved) await removeDraft(draft.collection, sourceId, saved.revision, db);
      return { commitId: null, changed: false };
    }
  }
  if (operation !== 'draft' && (file?.sha ?? null) !== baseSha) {
    throw new ConflictError('下書きの保存後に公開版が変更されています。最新の公開版と内容を確認してください');
  }
  if (operation === 'draft') {
    draft.published = false;
    const imageChanges = await validate(draft, !file, usedImages, store, readImage);
    if (!saved && previous && !imageChanges.length &&
        serializeEntry(previous) === serializeEntry({ ...draft, published: previous.published })) {
      return { commitId: null, changed: false };
    }
    const result = await writeDraft({ entry: draft, images: usedImages, baseSha, expected: renaming ? null : saved, userId: user.id }, db);
    if (renaming && saved) await removeDraft(draft.collection, sourceId, saved.revision, db);
    if (result.changed) await db.run('INSERT INTO audit_log (at, actor_id, action, target, detail) VALUES (?, ?, ?, ?, ?)',
      [new Date().toISOString(), user.id, renaming ? 'entry.rename' : 'entry.draft', `${draft.collection}/${draft.id}`,
        renaming ? `${sourceId} ${result.revision}` : result.revision]);
    return { commitId: null, changed: result.changed };
  }
  if (operation === 'unpublish') {
    if (!previous?.published) return { commitId: null, changed: false };
    Object.assign(draft, previous, { published: false });
  } else {
    draft.published = true;
  }
  const changes = operation === 'unpublish' ? [] : await validate(draft, !file, usedImages, store, readImage);
  const content = Buffer.from(serializeEntry(draft));
  if (previous && serializeEntry(previous) === serializeEntry(draft) && changes.length === 0) {
    if (saved) await removeDraft(draft.collection, sourceId, saved.revision, db);
    return { commitId: null, changed: false };
  }
  changes.push({ path: filePath, content });
  const label = collectionLabels[draft.collection];
  const verb = operation === 'unpublish' ? `${label}を非公開` : previous?.published ? `${label}を更新` : `${label}を公開`;
  const commitId = await store.commit({
    changes,
    expected: { [filePath]: baseSha },
    title: `📝 ${verb}: ${draft.title}`,
    editor: user,
  });
  try {
    if (saved && operation !== 'unpublish') await removeDraft(draft.collection, sourceId, saved.revision, db);
    if (saved && operation === 'unpublish') {
      await db.run('UPDATE editor_drafts SET base_sha = ? WHERE collection = ? AND entry_id = ? AND revision = ?',
        [gitBlobSha(content), draft.collection, draft.id, saved.revision]);
    }
    const action: ArticleAction = operation === 'unpublish' ? 'unpublish' : previous?.published ? 'update' : 'publish';
    await recordArticleEvent({
      collection: draft.collection,
      articleId: draft.id,
      title: draft.title,
      action,
      userId: user.id,
      commitId,
    }, db);
    await db.run('INSERT INTO audit_log (at, actor_id, action, target, detail) VALUES (?, ?, ?, ?, ?)',
      [new Date().toISOString(), user.id, 'entry.save', `${draft.collection}/${draft.id}`, commitId]);
  } catch {
    console.error('Published content but failed to finalize editor metadata', { commitId, collection: draft.collection, id: draft.id });
    throw new ContentStoreError('GitHubへの反映は完了しましたが、下書き・履歴の整理に失敗しました。公開状態を確認し、同じ内容の再公開は控えてください');
  }
  if (operation === 'publish') {
    try { await releasePublishedUploads(usedImages.map((image) => image.sha), db); }
    catch { console.error('Published image cleanup deferred', { commitId }); }
  }
  return { commitId, changed: true };
}

export async function deleteEntry(
  user: User,
  input: { collection: Collection; id: string; baseSha: string; confirmTitle: string },
  services?: EditorServices
): Promise<string> {
  if (!canManageMembers(user)) throw new EditorError(['削除できるのは管理者だけです']);
  const { collection, id } = input;
  const store = services?.store ?? getStore();
  const db = services?.db ?? await getDb();
  const filePath = entryPath(collection, id);
  const [file, saved] = await Promise.all([store.read(filePath), readDraft(collection, id, db)]);
  if (!file) throw new EditorError(['公開したことのないものは「下書きを削除」で消してください']);
  const entry = parseEntry(collection, id, file.content.toString('utf8'));
  if (entry.published) throw new EditorError(['公開中のものは削除できません。先に「公開をやめる」をしてください']);
  const token = saved ? draftToken(saved) : file.sha;
  if (token !== input.baseSha) throw new ConflictError('ほかの人が先に変更しています。開き直して確認してください');
  if (input.confirmTitle.trim() !== entry.title.trim()) throw new EditorError(['確認のためのタイトルが一致しません']);
  const images = (await store.list(`public${imageDir(collection, id)}`)).filter(isWritable);
  const commitId = await store.commit({
    changes: [{ path: filePath, remove: true }, ...images.map((path) => ({ path, remove: true as const }))],
    expected: { [filePath]: file.sha },
    title: `🗑️ ${collectionLabels[collection]}を削除: ${entry.title}`,
    editor: user,
  });
  try {
    if (saved) await removeDraft(collection, id, saved.revision, db);
    await db.run('INSERT INTO audit_log (at, actor_id, action, target, detail) VALUES (?, ?, ?, ?, ?)',
      [new Date().toISOString(), user.id, 'entry.delete', `${collection}/${id}`, commitId]);
  } catch {
    console.error('Deleted content but failed to finalize editor metadata', { commitId, collection, id });
  }
  return commitId;
}

const editable = (filePath: string) =>
  /^src\/content\/(articles|works|events)\//.test(filePath) || /^public\/images\/(articles|works|events)\//.test(filePath);

export async function revertCommit(user: User, commitId: string): Promise<string> {
  const store = getStore();
  const detail = await store.detail(commitId);
  if (user.role === 'editor' && detail.editorId !== user.id) {
    throw new EditorError(['ほかの人の変更を戻せるのは管理者だけです']);
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
