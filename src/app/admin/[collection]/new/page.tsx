import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { listEntries, newEntryId } from '@/lib/editor/entries';
import { emptyEntry, isCollection, todayInTokyo } from '@/lib/content-schema';
import { loadPeople } from '@/lib/editor/people';
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
  const [eventOptions, { people }] = await Promise.all([
    collection === 'works' ? listEntries('events') : Promise.resolve([]),
    loadPeople(),
  ]);
  const self = people.find((person) => person.memberId === user.id);
  if (!isCollection(collection)) notFound();
  const { type } = await searchParams;
  const today = todayInTokyo();
  const initial = {
    ...emptyEntry(collection, newEntryId(today)),
    date: today,
    authors: collection !== 'events' && self ? [self.id] : [],
    published: false,
    type: type === 'tech' ? ('tech' as const) : ('guide' as const),
    status: 'done' as const,
  };
  return (
    <ArticleEditor
      isNew
      baseSha={null}
      notice=''
      initial={initial}
      eventOptions={eventOptions.map(({ id, title, date }) => ({ id, title, date }))}
      people={people}
    />
  );
}
