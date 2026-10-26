import Link from 'next/link';
import { editorDbConfigured } from '@/lib/editor/db';
import { currentUser } from '@/lib/editor/auth';
import { listArticles } from '@/lib/editor/articles';
import LoginPanel from './_components/LoginPanel';
import LinkButton from './_components/LinkButton';
import { addDeviceInviteAction } from './actions';

export default async function AdminPage() {
  if (!editorDbConfigured()) {
    return <p>投稿画面はまだ設定されていません（docs/editor-setup.md を参照）。</p>;
  }
  const user = await currentUser();
  if (!user) return <LoginPanel />;

  const articles = await listArticles();
  const addDevice = addDeviceInviteAction.bind(null, user.id);

  return (
    <div className='space-y-8'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-2xl font-bold'>記事</h1>
        <Link
          href='/admin/articles/new'
          className='rounded-lg bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-700'
        >
          新しい記事を書く
        </Link>
      </div>

      <ul className='divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white'>
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={`/admin/articles/${article.id}`}
              className='flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50'
            >
              <span className='font-medium'>{article.title || article.id}</span>
              {!article.published && (
                <span className='rounded-full bg-slate-200 px-2 py-0.5 text-xs'>非公開</span>
              )}
              <span className='ml-auto text-sm text-slate-500'>{article.date}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className='space-y-2 rounded-xl border border-slate-200 bg-white p-4'>
        <h2 className='font-bold'>別の端末でもログインできるようにする</h2>
        <p className='text-sm text-slate-600'>
          機種変更やPCを追加したときに使います。発行したリンクを、追加したい端末で開いてください（7日間有効）。
        </p>
        <LinkButton label='端末を追加するリンクを発行' note='追加したい端末でこのリンクを開いてください。' create={addDevice} />
      </section>
    </div>
  );
}
