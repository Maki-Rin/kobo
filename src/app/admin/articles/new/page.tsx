import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import ArticleEditor from '../../_components/ArticleEditor';

export default async function NewArticlePage() {
  const user = await currentUser();
  if (!user) redirect('/admin');
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  return (
    <ArticleEditor
      isNew
      baseSha={null}
      saved={false}
      initial={{
        id: '',
        title: '',
        date: today,
        excerpt: '',
        authorName: user.displayName,
        authorAvatar: '',
        coverImage: '',
        body: '',
        published: true,
      }}
    />
  );
}
