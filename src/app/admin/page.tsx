import { editorDbConfigured } from '@/lib/editor/db';
import { currentUser } from '@/lib/editor/auth';
import { listEntries } from '@/lib/editor/entries';
import { latestEventsByEntry } from '@/lib/editor/activity';
import { collections, isPastEvent, todayInTokyo, type Collection } from '@/lib/content-schema';
import { loadPeople } from '@/lib/editor/people';
import { peopleNames } from '@/lib/people';
import type { EntryRow } from './_components/EntryTable';
import ContentTabs from './_components/ContentTabs';
import LoginPanel from './_components/LoginPanel';

async function loadRows(): Promise<{ rows: Record<Collection, EntryRow[]>; now: number }> {
  const [lists, events, { people }] = await Promise.all([
    Promise.all(collections.map((collection) => listEntries(collection))),
    latestEventsByEntry(),
    loadPeople(),
  ]);
  const today = todayInTokyo();
  const rows: Record<Collection, EntryRow[]> = { articles: [], works: [], events: [] };
  for (const entries of lists) {
    for (const entry of entries) {
      const event = events.get(`${entry.collection}/${entry.id}`);
      rows[entry.collection].push({
        ...entry,
        authorName: peopleNames(entry.authors, entry.legacyAuthor, people),
        isPast: isPastEvent(entry, today),
        updatedAt: event?.at ?? null,
        updatedBy: event?.userName ?? null,
      });
    }
  }
  return { rows, now: Date.now() };
}

export default async function AdminPage() {
  if (!editorDbConfigured()) {
    return <p className='text-sm text-slate-600'>投稿画面はまだ設定されていません（docs/editor-setup.md を参照）。</p>;
  }
  const user = await currentUser();
  if (!user) return <LoginPanel />;

  const { rows, now } = await loadRows();
  return <ContentTabs rows={rows} now={now} />;
}
