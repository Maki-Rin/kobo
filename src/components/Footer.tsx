export default function Footer() {
  return (
    <footer className='mt-24 border-t border-black bg-white px-5 py-8 text-black md:px-8'>
      <div className='mx-auto flex max-w-7xl flex-col justify-between gap-3 text-xs text-neutral-600 sm:flex-row'>
        <p>立命館大学OIC KOBO 非公式情報サイト</p>
        <a href='https://www.usuiyoshito.com' className='underline decoration-neutral-300 underline-offset-4 hover:decoration-black'>
          © Yoshito Usui
        </a>
      </div>
    </footer>
  );
}
