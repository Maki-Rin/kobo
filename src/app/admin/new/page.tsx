import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { card, pageTitle } from '../_components/ui';

const choices = [
  {
    href: '/admin/articles/new?type=guide',
    title: 'ガイド',
    lead: '機材やソフトの使い方。手順書のように順番に説明するもの。',
  },
  {
    href: '/admin/articles/new?type=tech',
    title: 'テック',
    lead: '使ってみて分かったこと。設定の検証、トラブルの対処、Tips など。',
  },
  {
    href: '/admin/works/new',
    title: '作品',
    lead: 'KOBOでつくったもの。写真を中心に、使った機材やつくり方を添えて。',
  },
  {
    href: '/admin/events/new',
    title: 'イベント',
    lead: 'KOBOが開くワークショップなど。開催前は告知、終わったら同じページに開催記録を書きます。',
  },
];

export default async function NewChooserPage() {
  if (!(await currentUser())) redirect('/admin');
  return (
    <div className='space-y-6'>
      <h1 className={pageTitle}>何を書きますか</h1>
      <ul className='grid gap-4 sm:grid-cols-2'>
        {choices.map((choice) => (
          <li key={choice.href}>
            <Link href={choice.href} className={`${card} block h-full p-5 transition-colors hover:border-slate-400`}>
              <p className='text-lg font-bold'>{choice.title}</p>
              <p className='mt-2 text-sm leading-6 text-slate-600'>{choice.lead}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
