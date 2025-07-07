import Link from 'next/link';

export default function Header() {
  return (
    <header className='bg-black text-white py-4 px-6'>
      <div className='container mx-auto'>
        <h1 className='text-2xl font-bold'>
          <Link href='/' className='hover:text-gray-300 transition-colors'>
            KOBO <span className='text-lg'>unofficial</span>
          </Link>
        </h1>
      </div>
    </header>
  );
}
