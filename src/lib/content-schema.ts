import matter from 'gray-matter';

export const collections = ['articles', 'works', 'events'] as const;
export type Collection = (typeof collections)[number];

export const collectionLabels: Record<Collection, string> = {
  articles: '記事',
  works: '作品',
  events: 'イベント',
};

export type ArticleType = 'guide' | 'tech';

export const articleTypeLabels: Record<ArticleType, string> = {
  guide: 'ガイド',
  tech: 'テック',
};

export type WorkStatus = 'done' | 'wip';

export const workStatusLabels: Record<WorkStatus, string> = {
  done: '完成',
  wip: '制作中',
};

export interface Entry {
  collection: Collection;
  id: string;
  title: string;
  date: string;
  excerpt: string;
  authors: string[];
  legacyAuthor: string;
  coverImage: string;
  body: string;
  published: boolean;
  machines: string[];
  topics: string[];
  type: ArticleType;
  status: WorkStatus;
  images: string[];
  difficulty: string;
  duration: string;
  event: string;
  startTime: string;
  endTime: string;
  place: string;
  capacity: string;
  applyUrl: string;
  participants: string;
  record: string;
}

export function isCollection(value: string): value is Collection {
  return (collections as readonly string[]).includes(value);
}

export function contentDir(collection: Collection): string {
  return `src/content/${collection}`;
}

export function entryPath(collection: Collection, id: string): string {
  return `${contentDir(collection)}/${id}.md`;
}

export function imageDir(collection: Collection, id: string): string {
  return `/images/${collection}/${id}`;
}

export function entryUrl(collection: Collection, id: string): string {
  return `/${collection}/${id}`;
}

const text = (value: unknown) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value === undefined || value === null ? '' : String(value);

const list = (value: unknown) => (Array.isArray(value) ? value.map(String).filter(Boolean) : []);

export function emptyEntry(collection: Collection, id: string): Entry {
  return {
    collection,
    id,
    title: '',
    date: '',
    excerpt: '',
    authors: [],
    legacyAuthor: '',
    coverImage: '',
    body: '',
    published: true,
    machines: [],
    topics: [],
    type: 'guide',
    status: 'done',
    images: [],
    difficulty: '',
    duration: '',
    event: '',
    startTime: '',
    endTime: '',
    place: '',
    capacity: '',
    applyUrl: '',
    participants: '',
    record: '',
  };
}

export function parseEntry(collection: Collection, id: string, source: string): Entry {
  const { data, content } = matter(source);
  return {
    ...emptyEntry(collection, id),
    title: text(data.title),
    date: text(data.date),
    excerpt: text(data.excerpt),
    authors: list(data.authors),
    legacyAuthor: text(data.author?.name).trim(),
    coverImage: text(data.coverImage),
    body: content.replace(/^\n+/, ''),
    published: data.published !== false,
    machines: list(data.machines),
    topics: list(data.topics),
    type: data.type === 'tech' ? 'tech' : 'guide',
    status: data.status === 'wip' ? 'wip' : 'done',
    images: list(data.images),
    difficulty: text(data.difficulty),
    duration: text(data.duration),
    event: text(data.event),
    startTime: text(data.startTime),
    endTime: text(data.endTime),
    place: text(data.place),
    capacity: text(data.capacity),
    applyUrl: text(data.applyUrl),
    participants: text(data.participants),
    record: text(data.record).trim(),
  };
}

export function serializeEntry(entry: Entry): string {
  const front: Record<string, unknown> = { title: entry.title, date: entry.date };
  const put = (key: string, value: string | string[]) => {
    if (Array.isArray(value) ? value.length > 0 : value.trim() !== '') front[key] = value;
  };
  if (entry.collection === 'articles') front.type = entry.type;
  if (entry.collection === 'events') {
    put('startTime', entry.startTime);
    put('endTime', entry.endTime);
    put('place', entry.place);
    put('capacity', entry.capacity);
    put('applyUrl', entry.applyUrl);
  }
  put('excerpt', entry.excerpt);
  put('authors', entry.authors);
  put('coverImage', entry.coverImage);
  if (entry.collection === 'works') {
    put('images', entry.images);
    front.status = entry.status;
    put('difficulty', entry.difficulty);
    put('duration', entry.duration);
    put('event', entry.event);
  }
  put('machines', entry.machines);
  put('topics', entry.topics);
  if (entry.collection === 'events') {
    put('participants', entry.participants);
    put('record', entry.record.trim());
  }
  if (!entry.published) front.published = false;
  return matter.stringify(`\n${entry.body.trim()}\n`, front);
}

export function todayInTokyo(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
}

export function isPastEvent(entry: Pick<Entry, 'date'>, today = todayInTokyo()): boolean {
  return entry.date !== '' && entry.date < today;
}
