import { redirect } from 'next/navigation';
import { canManageMembers, currentUser, listMembers } from '@/lib/editor/auth';
import { listEntries } from '@/lib/editor/entries';
import { loadPeople } from '@/lib/editor/people';
import { collections } from '@/lib/content-schema';
import PeopleManager from '../_components/PeopleManager';
import { pageTitle } from '../_components/ui';

async function load() {
  const [{ people, sha }, members, lists] = await Promise.all([
    loadPeople(),
    listMembers(),
    Promise.all(collections.map((collection) => listEntries(collection))),
  ]);
  const counts: Record<string, number> = {};
  for (const entry of lists.flat()) {
    for (const id of entry.authors) counts[id] = (counts[id] ?? 0) + 1;
  }
  return {
    people,
    sha,
    counts,
    members: members.filter((member) => !member.disabledAt).map(({ id, displayName }) => ({ id, displayName })),
  };
}

export default async function PeoplePage() {
  const user = await currentUser();
  if (!user) redirect('/admin');
  const { people, sha, counts, members } = await load();
  return (
    <div className='space-y-6'>
      <div>
        <h1 className={pageTitle}>人物</h1>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-600'>
          記事の「書いた人」や作品の「作った人」として表示される人です。投稿画面にログインしない人（卒業した先輩、作品を載せてほしい利用者など）もここに登録します。
          投稿画面のメンバーとひも付けると、その人が新しく書くときに自動で選ばれます。
        </p>
      </div>
      <PeopleManager
        initialPeople={people}
        baseSha={sha}
        counts={counts}
        members={members}
        canLinkMembers={canManageMembers(user)}
      />
    </div>
  );
}
