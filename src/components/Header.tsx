import Link from 'next/link';

export default function Header() {
  return (
    <header className='border-b border-black bg-white px-5 text-black md:px-8'>
      <div className='mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-5'>
        <h1 className='leading-none'>
          <Link href='/' className='flex items-baseline gap-2'>
            <span className='text-2xl font-black tracking-[-0.05em]'>KOBO</span>
            <span className='text-xs font-medium text-neutral-500'>非公式</span>
          </Link>
        </h1>
        <nav aria-label='メインナビゲーション'>
          <ul className='flex items-center gap-4 text-sm font-semibold sm:gap-7'>
            <li>
              <Link href='/printers' className='border-b border-transparent pb-1 hover:border-black'>
                稼働状況
              </Link>
            </li>
            <li>
              <Link href='/articles' className='border-b border-transparent pb-1 hover:border-black'>
                記事
              </Link>
            </li>
            <li>
              <Link href='/works' className='border-b border-transparent pb-1 hover:border-black'>
                作例
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
