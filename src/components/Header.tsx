import Link from 'next/link';

export default function Header() {
  return (
    <header className='bg-black text-white py-4 px-6'>
      <div className='container mx-auto flex items-center justify-between gap-6'>
        <h1 className='text-2xl font-bold'>
          <Link href='/' className='hover:text-gray-300 transition-colors'>
            KOBO <span className='text-lg'>unofficial</span>
          </Link>
        </h1>
        <nav aria-label='メインナビゲーション'>
          <ul className='flex items-center gap-4 text-sm font-semibold sm:gap-6'>
            <li>
              <Link href='/printers' className='hover:text-blue-300 transition-colors'>
                稼働状況
              </Link>
            </li>
            <li>
              <Link href='/articles' className='hover:text-blue-300 transition-colors'>
                使い方
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
