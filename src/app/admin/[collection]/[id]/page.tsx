import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { listEntries, loadEntry } from '@/lib/editor/entries';
import { isCollection } from '@/lib/content-schema';
import { loadPeople } from '@/lib/editor/people';
import ArticleEditor from '../../_components/editor/ArticleEditor';

const notices: Record<string, string> = {
  published: '公開しました。1〜2分でサイトに反映されます。',
  draft: '下書きを保存しました。サイトにはまだ出ません。',
};

export default async function EditEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await currentUser())) redirect('/admin');
  const { collection, id } = await params;
  if (!isCollection(collection)) notFound();
  const entry = await loadEntry(collection, id);
  if (!entry) notFound();
  const { saved } = await searchParams;
  const [eventOptions, { people }] = await Promise.all([
    collection === 'works' ? listEntries('events') : Promise.resolve([]),
    loadPeople(),
  ]);
  return (
    <ArticleEditor
      eventOptions={eventOptions.map(({ id, title, date }) => ({ id, title, date }))}
      people={people}
      key={entry.sha}
      isNew={false}
      initial={entry.draft}
      baseSha={entry.sha}
      notice={notices[saved ?? ''] ?? ''}
    />
  );
}
