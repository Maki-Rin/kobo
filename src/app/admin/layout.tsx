import type { Metadata } from 'next';
import Link from 'next/link';
import { editorDbConfigured } from '@/lib/editor/db';
import { canManageMembers, currentUser, roleLabels } from '@/lib/editor/auth';
import { logoutAction } from './actions';
import { button, fontFamily } from './_components/ui';

export const metadata: Metadata = {
  title: '投稿画面',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = editorDbConfigured() ? await currentUser() : null;
  return (
    <div className='min-h-screen bg-slate-50 text-slate-900 antialiased' style={{ fontFamily }}>
      <header className='border-b border-slate-200 bg-white'>
        <div className='mx-auto flex h-14 max-w-5xl items-center gap-6 px-4'>
          <Link href='/admin' className='text-[15px] font-bold'>
            KOBO 投稿画面
          </Link>
          {user && (
            <nav className='hidden items-center gap-1 sm:flex'>
              <Link href='/admin' className={button('ghost', 'sm')}>記事</Link>
              <Link href='/admin/history' className={button('ghost', 'sm')}>変更履歴</Link>
              {canManageMembers(user) && (
                <Link href='/admin/members' className={button('ghost', 'sm')}>メンバー</Link>
              )}
            </nav>
          )}
          <div className='ml-auto flex items-center gap-2'>
            <Link href='/' className={`${button('ghost', 'sm')} text-slate-500`}>
              サイトを見る
            </Link>
            {user && (
              <>
                <span className='hidden text-sm text-slate-600 md:inline'>
                  {user.displayName}（{roleLabels[user.role]}）
                </span>
                <form action={logoutAction}>
                  <button className={button('secondary', 'sm')}>ログアウト</button>
                </form>
              </>
            )}
          </div>
        </div>
        {user && (
          <nav className='flex gap-1 border-t border-slate-100 px-2 py-1 sm:hidden'>
            <Link href='/admin' className={button('ghost', 'sm')}>記事</Link>
            <Link href='/admin/history' className={button('ghost', 'sm')}>変更履歴</Link>
            {canManageMembers(user) && (
              <Link href='/admin/members' className={button('ghost', 'sm')}>メンバー</Link>
            )}
          </nav>
        )}
      </header>
      <main className='mx-auto max-w-5xl px-4 py-8'>{children}</main>
    </div>
  );
}
