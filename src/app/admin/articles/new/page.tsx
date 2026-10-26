import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { newArticleId } from '@/lib/editor/articles';
import ArticleEditor from '../../_components/editor/ArticleEditor';

export default async function NewArticlePage() {
  const user = await currentUser();
  if (!user) redirect('/admin');
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  return (
    <ArticleEditor
      isNew
      baseSha={null}
      notice=''
      initial={{
        id: newArticleId(today),
        title: '',
        date: today,
        excerpt: '',
        authorName: user.displayName,
        authorAvatar: '',
        coverImage: '',
        body: '',
        published: false,
      }}
    />
  );
}
