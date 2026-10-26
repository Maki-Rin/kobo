import { card } from './ui';

export default function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${card} mx-auto max-w-md space-y-5 p-6 sm:p-8`}>
      <h1 className='text-xl font-bold'>{title}</h1>
      {children}
    </section>
  );
}
