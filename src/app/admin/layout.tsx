import type { Metadata } from 'next';
import Link from 'next/link';
import { editorDbConfigured } from '@/lib/editor/db';
import { canManageMembers, currentUser, roleLabels } from '@/lib/editor/auth';
import { logoutAction } from './actions';

export const metadata: Metadata = {
  title: '投稿画面',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = editorDbConfigured() ? await currentUser() : null;
  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <header className='border-b border-slate-200 bg-white'>
        <div className='mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3'>
          <Link href='/admin' className='font-bold'>
            KOBO 投稿画面
          </Link>
          {user && (
            <nav className='flex gap-4 text-sm'>
              <Link href='/admin' className='hover:underline'>記事</Link>
              <Link href='/admin/history' className='hover:underline'>変更履歴</Link>
              {canManageMembers(user) && (
                <Link href='/admin/members' className='hover:underline'>メンバー</Link>
              )}
            </nav>
          )}
          <div className='ml-auto flex items-center gap-3 text-sm'>
            <Link href='/' className='text-slate-500 hover:underline'>サイトを見る</Link>
            {user && (
              <>
                <span>
                  {user.displayName}（{roleLabels[user.role]}）
                </span>
                <form action={logoutAction}>
                  <button className='rounded border border-slate-300 px-2 py-1 hover:bg-slate-100'>
                    ログアウト
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </header>
      <main className='mx-auto max-w-7xl px-4 py-6'>{children}</main>
    </div>
  );
}
