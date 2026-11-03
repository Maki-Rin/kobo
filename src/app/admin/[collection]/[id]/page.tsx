import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { listEntries, loadEntry } from '@/lib/editor/entries';
import { isCollection } from '@/lib/content-schema';
import { loadPeople } from '@/lib/editor/people';
import ArticleEditor from '../../_components/editor/ArticleEditor';

const notices: Record<string, string> = {
  published: '公開しました。1〜2分でサイトに反映されます。',
  draft: '下書きを保存しました。サイトにはまだ出ません。',
  unchanged: '変更がないため、公開版の更新は行いませんでした。',
  unpublished: '非公開にしました。1〜2分でサイトに反映されます。',
};

export default async function EditEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/admin');
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
      initialImages={entry.images}
      canDiscardDraft={Boolean(entry.draftOwnerId && (entry.draftOwnerId === user.id || user.role !== 'editor'))}
      notice={saved === 'draft' && entry.draft.published ? '下書きを保存しました。公開中の内容はそのままです。' : notices[saved ?? ''] ?? ''}
    />
  );
}
