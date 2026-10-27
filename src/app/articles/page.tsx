import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getEntries, machines } from '@/lib/content';
import { ArticleCard } from '@/components/content/Cards';
import { FilterChips, PageHeading } from '@/components/content/Labels';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kobo-rits.vercel.app';

export const metadata: Metadata = {
  title: 'まなぶ',
  description:
    '立命館大学OIC（大阪いばらきキャンパス）KOBO【非公式】の記事一覧。3Dプリント、FlashPrint、Orca Slicer、フィラメントなどデジタルファブリケーションに関するチュートリアルと情報を掲載。',
  keywords: [
    'KOBO',
    '立命館大学',
    'OIC',
    '大阪いばらきキャンパス',
    '3Dプリント',
    'FlashPrint',
    'Orca Slicer',
    'チュートリアル',
    'デジタルファブリケーション',
  ],
  authors: [{ name: 'KOBO【非公式】' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: `${SITE_URL}/articles`,
  },
  openGraph: {
    title: 'まなぶ | KOBO【非公式】',
    description:
      '立命館大学KOBO【非公式】の記事一覧。3Dプリントやデジタルファブリケーションに関する情報を掲載。',
    url: `${SITE_URL}/articles`,
    siteName: 'KOBO【非公式】',
    type: 'website',
    locale: 'ja_JP',
    images: [
      {
        url: `${SITE_URL}/images/top1.jpg`,
        width: 1200,
        height: 630,
        alt: 'まなぶ | KOBO【非公式】',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'まなぶ | KOBO【非公式】',
    description:
      '立命館大学KOBO【非公式】の記事一覧。3Dプリントやデジタルファブリケーションに関する情報を掲載。',
    images: [`${SITE_URL}/images/top1.jpg`],
  },
};

const typeOptions = [
  { value: 'all', label: 'すべて' },
  { value: 'guide', label: 'ガイド' },
  { value: 'tech', label: 'テック' },
] as const;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; machine?: string }>;
}) {
  const { type = 'all', machine = 'all' } = await searchParams;
  const all = await getEntries('articles');
  const shown = all.filter(
    (entry) => (type === 'all' || entry.type === type) && (machine === 'all' || entry.machines.includes(machine))
  );
  const href = (next: { type?: string; machine?: string }) => {
    const params = new URLSearchParams();
    const t = next.type ?? type;
    const m = next.machine ?? machine;
    if (t !== 'all') params.set('type', t);
    if (m !== 'all') params.set('machine', m);
    return `/articles${params.size ? `?${params}` : ''}`;
  };
  const usedMachines = machines.filter((item) => all.some((entry) => entry.machines.includes(item.slug)));

  return (
    <div className='min-h-screen bg-white'>
      <Header />
      <main className='mx-auto max-w-6xl px-4 py-10 md:px-8'>
        <div className='mb-8'>
          <PageHeading title='まなぶ'>
            <p className='text-[15px] leading-7 text-muted'>
              ガイドは機材やソフトの使い方を順番に、テックは使ってみて分かったことやトラブルの直し方を書いています。
            </p>
          </PageHeading>
          <div className='mt-5 space-y-3'>
            <FilterChips
              options={typeOptions.map((option) => ({
                ...option,
                count: option.value === 'all' ? all.length : all.filter((entry) => entry.type === option.value).length,
              }))}
              current={type}
              hrefFor={(value) => href({ type: value })}
            />
            {usedMachines.length > 1 && (
              <FilterChips
                options={[{ value: 'all', label: 'すべての機材' }, ...usedMachines.map((item) => ({ value: item.slug, label: item.name }))]}
                current={machine}
                hrefFor={(value) => href({ machine: value })}
              />
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
          {shown.map((entry) => (
            <ArticleCard key={entry.id} entry={entry} />
          ))}
        </div>
        {shown.length === 0 && (
          <p className='rounded-xl border-2 border-dashed border-line-soft px-6 py-10 text-center text-muted'>
            {type === 'tech' ? 'テックの記事はまだありません。' : 'まだ記事がありません。'}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
