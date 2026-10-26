import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { loadArticle } from '@/lib/editor/articles';
import ArticleEditor from '../../_components/editor/ArticleEditor';

const notices: Record<string, string> = {
  published: '公開しました。1〜2分でサイトに反映されます。',
  draft: '下書きを保存しました。サイトにはまだ出ません。',
};

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await currentUser())) redirect('/admin');
  const { id } = await params;
  const article = await loadArticle(id);
  if (!article) notFound();
  const { saved } = await searchParams;
  return (
    <ArticleEditor
      key={article.sha}
      isNew={false}
      initial={article.draft}
      baseSha={article.sha}
      notice={notices[saved ?? ''] ?? ''}
    />
  );
}
