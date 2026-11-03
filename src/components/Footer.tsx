import Link from 'next/link';

export default function Footer() {
  return (
    <footer className='mt-16 border-t-2 border-ink bg-ink text-paper'>
      <div className='mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-sm md:px-8'>
        <span className='text-lg font-extrabold'>KOBO</span>
        <nav className='flex flex-wrap gap-x-5 gap-y-2'>
          <Link href='/printers' className='hover:underline'>稼働状況</Link>
          <Link href='/articles' className='hover:underline'>まなぶ</Link>
          <Link href='/works' className='hover:underline'>作品</Link>
          <Link href='/events' className='hover:underline'>イベント</Link>
        </nav>
        <p className='w-full text-xs text-paper/70 sm:ml-auto sm:w-auto'>
          KOBOの非公式サイトです。
          <a href='https://www.usuiyoshito.com' className='ml-2 underline'>© Yoshito Usui</a>
        </p>
      </div>
    </footer>
  );
}
