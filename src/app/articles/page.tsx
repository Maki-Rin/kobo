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

const ArticleCard = ({ article }: ArticleCardProps) => {
  return (
    <Link href={`/articles/${article.id}`}>
      <div className='bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer'>
        <div className='aspect-video bg-gray-200 relative'>
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className='object-cover'
          />
        </div>
        <div className='p-6'>
          <h3 className='text-xl font-bold mb-3 text-left h-14 leading-7 overflow-hidden'>
            {article.title}
          </h3>
          <p className='text-gray-600 text-sm mb-4 text-left h-16 leading-5 overflow-hidden'>
            {article.excerpt}
          </p>
          <div className='flex items-center justify-between text-sm text-gray-500'>
            <div className='flex items-center'>
              <Image
                src={article.author.avatar}
                alt={`${article.author.name} avatar`}
                width={24}
                height={24}
                className='rounded-full mr-2'
              />
              <span>{article.author.name}</span>
            </div>
            <span>{article.date}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <div className='min-h-screen bg-white'>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className='container mx-auto px-6 py-12'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold mb-4'>Articles</h1>
          <p className='text-lg text-gray-600'>
            ファブリケーションに関する記事とチュートリアル
          </p>
        </div>

        {/* Articles Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto'>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
