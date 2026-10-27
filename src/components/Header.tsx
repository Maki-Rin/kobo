'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  ['/printers', '稼働状況'],
  ['/articles', 'まなぶ'],
  ['/works', '作品'],
  ['/events', 'イベント'],
] as const;

export default function Header() {
  const pathname = usePathname();
  return (
    <header className='border-b-2 border-ink bg-paper'>
      <div className='mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:px-8'>
        <Link href='/' className='mr-auto flex items-center gap-2 text-2xl font-extrabold tracking-tight'>
          KOBO
          <span className='rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-accent'>unofficial</span>
        </Link>
        <nav aria-label='メインナビゲーション' className='w-full overflow-x-auto sm:w-auto'>
          <ul className='flex gap-2 py-1 pr-1'>
            {items.map(([href, label]) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex whitespace-nowrap rounded-full border-2 border-ink px-3.5 py-1.5 text-sm font-semibold transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop ${
                      active ? 'bg-accent' : 'bg-paper'
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
