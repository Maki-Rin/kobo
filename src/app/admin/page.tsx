import { editorDbConfigured } from '@/lib/editor/db';
import { currentUser } from '@/lib/editor/auth';
import { listArticles } from '@/lib/editor/articles';
import { latestEventByArticle } from '@/lib/editor/activity';
import ArticleTable from './_components/ArticleTable';
import LoginPanel from './_components/LoginPanel';
import { pageTitle } from './_components/ui';

async function loadRows() {
  const [articles, events] = await Promise.all([listArticles(), latestEventByArticle()]);
  const rows = articles.map((article) => {
    const event = events.get(article.id);
    return { ...article, updatedAt: event?.at ?? null, updatedBy: event?.userName ?? null };
  });
  return { rows, now: Date.now() };
}

export default async function AdminPage() {
  if (!editorDbConfigured()) {
    return <p className='text-sm text-slate-600'>投稿画面はまだ設定されていません（docs/editor-setup.md を参照）。</p>;
  }
  const user = await currentUser();
  if (!user) return <LoginPanel />;

  const { rows, now } = await loadRows();

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className={pageTitle}>記事</h1>
          <p className='mt-1 text-sm text-slate-500'>クリックすると編集できます。</p>
        </div>
      </div>
      <ArticleTable articles={rows} now={now} />
    </div>
  );
}
