import Link from 'next/link';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getFeed, machines } from '@/lib/content';
import type { Entry } from '@/lib/content-schema';
import { ArticleRow } from '@/components/content/Cards';
import { EmptyNote, FilterChips, PageHeading } from '@/components/content/Labels';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kobo-rits.vercel.app';

export const metadata: Metadata = {
  title: '記事一覧',
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
    title: '記事一覧 | KOBO【非公式】',
    description:
      '立命館大学KOBO【非公式】の記事一覧。3Dプリントやデジタルファブリケーションに関する情報を掲載。',
    url: `${SITE_URL}/articles`,
    siteName: 'KOBO【非公式】',
    type: 'website',
    locale: 'ja_JP',
    images: [
      {
        url: `${SITE_URL}/images/top1.webp`,
        width: 1200,
        height: 630,
        alt: '記事一覧 | KOBO【非公式】',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '記事一覧 | KOBO【非公式】',
    description:
      '立命館大学KOBO【非公式】の記事一覧。3Dプリントやデジタルファブリケーションに関する情報を掲載。',
    images: [`${SITE_URL}/images/top1.webp`],
  },
};

const typeOptions = [
  { value: 'all', label: 'すべて' },
  { value: 'guide', label: 'ガイド' },
  { value: 'tech', label: 'テック' },
  { value: 'report', label: 'イベントレポート' },
] as const;

const matchesType = (entry: Entry, type: string) =>
  type === 'all' ||
  (type === 'report' ? entry.collection === 'events' : entry.collection === 'articles' && entry.type === type);

const PAGE_SIZE = 8;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; machine?: string; page?: string }>;
}) {
  const { type = 'all', machine = 'all', page = '1' } = await searchParams;
  const all = await getFeed();
  const shown = all.filter(
    (entry) => matchesType(entry, type) && (machine === 'all' || entry.machines.includes(machine))
  );
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const requested = Number.parseInt(page, 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), pageCount);
  const visible = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const href = (next: { type?: string; machine?: string; page?: number }) => {
    const params = new URLSearchParams();
    const t = next.type ?? type;
    const m = next.machine ?? machine;
    if (t !== 'all') params.set('type', t);
    if (m !== 'all') params.set('machine', m);
    if (next.page && next.page > 1) params.set('page', String(next.page));
    return `/articles${params.size ? `?${params}` : ''}`;
  };
  const usedMachines = machines.filter((item) => all.some((entry) => entry.machines.includes(item.slug)));

  return (
    <div className='min-h-screen bg-white text-black'>
      <Header />
      <main className='mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20'>
        <PageHeading title='記事' aside={<p className='text-xs text-neutral-500'>{shown.length}件</p>}>
          <div className='space-y-3'>
            <FilterChips
              label='種類で絞り込む'
              options={typeOptions.map((option) => ({
                ...option,
                count: all.filter((entry) => matchesType(entry, option.value)).length,
              }))}
              current={type}
              hrefFor={(value) => href({ type: value })}
            />
            {usedMachines.length > 1 && (
              <FilterChips
                label='機材で絞り込む'
                options={[{ value: 'all', label: 'すべての機材' }, ...usedMachines.map((item) => ({ value: item.slug, label: item.name }))]}
                current={machine}
                hrefFor={(value) => href({ machine: value })}
              />
            )}
          </div>
        </PageHeading>

        <div>
          {visible.map((entry) => (
            <ArticleRow key={`${entry.collection}-${entry.id}`} entry={entry} />
          ))}
        </div>
        {shown.length === 0 && <EmptyNote>{type === 'all' ? 'まだ記事がありません。' : 'この種類の記事はまだありません。'}</EmptyNote>}

        {pageCount > 1 && (
          <nav className='mt-10 flex items-center justify-between gap-4' aria-label='記事一覧のページ送り'>
            {currentPage > 1 ? (
              <Link href={href({ page: currentPage - 1 })} className='rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold'>前のページ</Link>
            ) : (
              <span />
            )}
            <span className='text-sm text-neutral-500'>{currentPage} / {pageCount}</span>
            {currentPage < pageCount ? (
              <Link href={href({ page: currentPage + 1 })} className='rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold'>次のページ</Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </main>
      <Footer />
    </div>
  );
}
