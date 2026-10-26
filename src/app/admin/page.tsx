import Link from 'next/link';
import { editorDbConfigured } from '@/lib/editor/db';
import { currentUser } from '@/lib/editor/auth';
import { listArticles } from '@/lib/editor/articles';
import LoginPanel from './_components/LoginPanel';
import LinkButton from './_components/LinkButton';
import { addDeviceInviteAction } from './actions';
import { badge, button, card, pageTitle } from './_components/ui';

export default async function AdminPage() {
  if (!editorDbConfigured()) {
    return <p className='text-sm text-slate-600'>投稿画面はまだ設定されていません（docs/editor-setup.md を参照）。</p>;
  }
  const user = await currentUser();
  if (!user) return <LoginPanel />;

  const articles = await listArticles();
  const addDevice = addDeviceInviteAction.bind(null, user.id);

  return (
    <div className='space-y-8'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className={pageTitle}>記事</h1>
        <Link href='/admin/articles/new' className={button('primary')}>
          ＋ 新しい記事を書く
        </Link>
      </div>

      <ul className={`${card} divide-y divide-slate-100 overflow-hidden`}>
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={`/admin/articles/${article.id}`}
              className='flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50'
            >
              <span className='min-w-0 flex-1 truncate font-medium'>{article.title || '（タイトルなし）'}</span>
              {!article.published && <span className={`${badge} bg-amber-100 text-amber-900`}>下書き</span>}
              <span className='w-24 shrink-0 text-right text-sm tabular-nums text-slate-500'>{article.date}</span>
            </Link>
          </li>
        ))}
        {articles.length === 0 && <li className='px-4 py-3.5 text-sm text-slate-500'>まだ記事がありません</li>}
      </ul>

      <section className={`${card} space-y-3 p-5`}>
        <div>
          <h2 className='font-bold'>別の端末でもログインできるようにする</h2>
          <p className='mt-1 text-sm leading-6 text-slate-600'>
            機種変更やPCを追加したときに使います。発行したリンクを、追加したい端末で開いてください（7日間有効）。
          </p>
        </div>
        <LinkButton label='端末を追加するリンクを発行' note='追加したい端末でこのリンクを開いてください。' create={addDevice} />
      </section>
    </div>
  );
}
