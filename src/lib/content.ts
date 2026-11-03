import fs from 'fs/promises';
import path from 'path';
import machinesData from '@/content/machines.json';
import { markdownToPlainText } from './markdown';
import {
  isPastEvent,
  parseEntry,
  todayInTokyo,
  type Collection,
  type Entry,
} from './content-schema';

export interface Machine {
  slug: string;
  name: string;
  models: string[];
}

export const machines = machinesData as Machine[];

export function machineName(slug: string): string {
  return machines.find((machine) => machine.slug === slug)?.name ?? slug;
}

export function excerptOf(entry: Entry, maxLength = 120): string {
  if (entry.excerpt) return entry.excerpt;
  const text = markdownToPlainText(entry.body);
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function contentPath(collection: Collection, file = ''): string {
  switch (collection) {
    case 'articles':
      return path.join(process.cwd(), 'src/content/articles', file);
    case 'works':
      return path.join(process.cwd(), 'src/content/works', file);
    case 'events':
      return path.join(process.cwd(), 'src/content/events', file);
  }
}

async function readEntry(collection: Collection, file: string): Promise<Entry> {
  const source = await fs.readFile(contentPath(collection, file), 'utf8');
  return parseEntry(collection, path.basename(file, '.md'), source);
}

export async function getEntries(collection: Collection): Promise<Entry[]> {
  let files: string[];
  try {
    files = (await fs.readdir(contentPath(collection))).filter((file) => file.endsWith('.md'));
  } catch {
    return [];
  }
  const entries = await Promise.all(files.map((file) => readEntry(collection, file)));
  return entries.filter((entry) => entry.published).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getEntry(collection: Collection, id: string): Promise<Entry | null> {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
  try {
    const entry = await readEntry(collection, `${id}.md`);
    return entry.published ? entry : null;
  } catch {
    return null;
  }
}

export async function getEvents() {
  const events = await getEntries('events');
  const today = todayInTokyo();
  return {
    upcoming: events.filter((event) => !isPastEvent(event, today)).sort((a, b) => a.date.localeCompare(b.date)),
    past: events.filter((event) => isPastEvent(event, today)),
  };
}
