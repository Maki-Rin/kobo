import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { listEntries, newEntryId } from '@/lib/editor/entries';
import { emptyEntry, isCollection, todayInTokyo } from '@/lib/content-schema';
import ArticleEditor from '../../_components/editor/ArticleEditor';

export default async function NewEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/admin');
  const { collection } = await params;
  if (!isCollection(collection)) notFound();
  const { type } = await searchParams;
  const today = todayInTokyo();
  const initial = {
    ...emptyEntry(collection, newEntryId(today)),
    date: today,
    authorName: collection === 'events' ? '' : user.displayName,
    published: false,
    type: type === 'tech' ? ('tech' as const) : ('guide' as const),
    status: 'done' as const,
  };
  const eventOptions = collection === 'works' ? await listEntries('events') : [];
  return (
    <ArticleEditor
      isNew
      baseSha={null}
      notice=''
      initial={initial}
      eventOptions={eventOptions.map(({ id, title, date }) => ({ id, title, date }))}
    />
  );
}
