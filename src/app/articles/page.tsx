import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getArticles, type Article } from '@/lib/articles';

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
        url: `${SITE_URL}/images/top1.jpg`,
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
    images: [`${SITE_URL}/images/top1.jpg`],
  },
};

interface ArticleCardProps {
  article: Article;
}

const categoryLabels: Record<Article['category'], string> = {
  tips: 'Tips',
  work: '制作記録',
  'event-report': 'イベントレポート',
  news: 'お知らせ',
};

const categoryStyles: Record<Article['category'], string> = {
  tips: 'bg-blue-50 text-blue-700',
  work: 'bg-emerald-50 text-emerald-700',
  'event-report': 'bg-amber-50 text-amber-800',
  news: 'bg-violet-50 text-violet-700',
};

const ArticleCard = ({ article }: ArticleCardProps) => {
  return (
    <Link href={`/articles/${article.id}`} className='group block border-b border-neutral-200 py-7'>
      <article className='grid gap-5 sm:grid-cols-[13rem_1fr]'>
        <div className='relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-200 sm:aspect-auto sm:min-h-40'>
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className='object-cover transition-transform duration-300 group-hover:scale-[1.02]'
          />
        </div>
        <div className='flex min-w-0 flex-col justify-between py-1'>
          <div>
          <div className='mb-2 flex gap-3 text-xs text-neutral-500'>
            <span className={`rounded-md px-2 py-1 font-semibold ${categoryStyles[article.category]}`}>{categoryLabels[article.category]}</span>
            <span>{article.date}</span>
          </div>
          <h3 className='text-xl font-bold leading-7 group-hover:underline group-hover:underline-offset-4 md:text-2xl'>
            {article.title}
          </h3>
          <p className='mt-3 max-w-2xl text-left text-sm leading-6 text-neutral-600'>
            {article.excerpt}
          </p>
          </div>
          <div className='mt-5 flex items-center text-xs text-neutral-500'>
            <div className='flex items-center'>
              <Image
                src={article.author.avatar}
                alt={`${article.author.name} avatar`}
                width={24}
                height={24}
                className='mr-2 rounded-full'
              />
              <span>{article.author.name}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
};

const PAGE_SIZE = 8;

function pageHref(page: number) {
  return page > 1 ? `/articles?page=${page}` : '/articles';
}

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const articles = await getArticles();
  const pageCount = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(params.page ?? '1', 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount);
  const visibleArticles = articles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className='min-h-screen bg-white text-black'>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className='mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20'>
        <div className='mb-12 flex items-end justify-between border-b border-neutral-200 pb-5'>
          <h1 className='text-3xl font-bold md:text-4xl'>記事</h1>
          <p className='text-xs text-neutral-500'>{articles.length}件</p>
        </div>

        <div>
          {visibleArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>

        {pageCount > 1 && (
          <nav className='mt-10 flex items-center justify-between gap-4' aria-label='記事一覧のページ送り'>
            {currentPage > 1 ? <Link href={pageHref(currentPage - 1)} className='rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold'>前のページ</Link> : <span />}
            <span className='text-sm text-neutral-500'>{currentPage} / {pageCount}</span>
            {currentPage < pageCount ? <Link href={pageHref(currentPage + 1)} className='rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold'>次のページ</Link> : <span />}
          </nav>
        )}
      </main>

      <Footer />
    </div>
  );
}
