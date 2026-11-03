import Link from 'next/link';

const items = [
  ['/printers', '稼働状況'],
  ['/articles', '記事'],
  ['/works', '作例'],
  ['/events', 'イベント'],
] as const;

export default function Header() {
  return (
    <header className='border-b border-black bg-white px-5 text-black md:px-8'>
      <div className='mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-5'>
        <p className='leading-none'>
          <Link href='/' className='flex items-baseline gap-2'>
            <span className='text-2xl font-black tracking-[-0.05em]'>KOBO</span>
            <span className='text-xs font-medium text-neutral-500'>非公式</span>
          </Link>
        </p>
        <nav aria-label='メインナビゲーション'>
          <ul className='flex items-center gap-4 text-sm font-semibold sm:gap-7'>
            {items.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className='whitespace-nowrap border-b border-transparent pb-1 hover:border-black'>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
