'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icon';

const items: { href: string; label: string; icon: IconName; managerOnly?: boolean }[] = [
  { href: '/admin', label: '記事', icon: 'articles' },
  { href: '/admin/history', label: '変更履歴', icon: 'history' },
  { href: '/admin/members', label: 'メンバー', icon: 'members', managerOnly: true },
  { href: '/admin/account', label: 'アカウント', icon: 'account' },
];

export default function AdminNav({ canManage, compact = false }: { canManage: boolean; compact?: boolean }) {
  const pathname = usePathname();
  const active = (href: string) => (href === '/admin' ? pathname === '/admin' || pathname.startsWith('/admin/articles') : pathname.startsWith(href));

  return (
    <nav className={compact ? 'flex gap-1 overflow-x-auto [scrollbar-width:none]' : 'space-y-0.5'}>
      {items
        .filter((item) => canManage || !item.managerOnly)
        .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item.href) ? 'page' : undefined}
            className={`flex h-9 shrink-0 items-center gap-2.5 rounded-md px-3 text-sm transition-colors ${
              active(item.href) ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon name={item.icon} className={active(item.href) ? 'text-slate-900' : 'text-slate-400'} />
            {item.label}
          </Link>
        ))}
    </nav>
  );
}
