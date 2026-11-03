import type { Metadata } from 'next';
import Link from 'next/link';
import { editorDbConfigured } from '@/lib/editor/db';
import { canManageMembers, currentUser, roleLabels } from '@/lib/editor/auth';
import { logoutAction } from './actions';
import AdminNav from './_components/AdminNav';
import Icon from './_components/Icon';
import { button, fontFamily } from './_components/ui';

export const metadata: Metadata = {
  title: '投稿画面',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = editorDbConfigured() ? await currentUser() : null;

  if (!user) {
    return (
      <div className='min-h-screen bg-slate-50 text-slate-900 antialiased' style={{ fontFamily }}>
        <header className='flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5'>
          <span className='text-[15px] font-bold'>KOBO 投稿画面</span>
          <Link href='/' className={`${button('ghost', 'sm')} text-slate-500`}>
            サイトを見る
          </Link>
        </header>
        <main className='px-4 py-12'>{children}</main>
      </div>
    );
  }

  const canManage = canManageMembers(user);
  return (
    <div className='min-h-screen bg-slate-50 text-slate-900 antialiased md:flex' style={{ fontFamily }}>
      <aside className='sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex'>
        <Link href='/admin' className='flex h-14 items-center px-5 text-[15px] font-bold'>
          KOBO 投稿画面
        </Link>
        <div className='px-3 pb-3'>
          <Link href='/admin/new' className={`${button('primary')} w-full`}>
            <Icon name='plus' />
            新しく書く
          </Link>
        </div>
        <div className='px-3'>
          <AdminNav canManage={canManage} />
        </div>
        <div className='mt-auto space-y-1 border-t border-slate-200 p-3'>
          <Link
            href='/'
            target='_blank'
            className='flex h-9 items-center gap-2.5 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          >
            <Icon name='external' className='text-slate-400' />
            サイトを見る
          </Link>
          <div className='flex items-center gap-2 px-3 pt-2'>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium'>{user.displayName}</p>
              <p className='text-xs text-slate-500'>{roleLabels[user.role]}</p>
            </div>
            <form action={logoutAction}>
              <button className={button('ghost', 'sm')}>ログアウト</button>
            </form>
          </div>
        </div>
      </aside>

      <div className='min-w-0 flex-1'>
        <header className='sticky top-0 z-30 border-b border-slate-200 bg-white md:hidden'>
          <div className='flex h-14 items-center gap-3 px-4'>
            <Link href='/admin' className='text-[15px] font-bold'>
              KOBO 投稿画面
            </Link>
            <Link href='/admin/new' className={`${button('primary', 'sm')} ml-auto`}>
              <Icon name='plus' />
              書く
            </Link>
          </div>
          <div className='px-2 pb-2'>
            <AdminNav canManage={canManage} compact />
          </div>
        </header>
        <main className='mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10'>{children}</main>
      </div>
    </div>
  );
}
