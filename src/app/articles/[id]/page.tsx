import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getArticle, getArticles, formatDate } from '@/lib/articles';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarkdownContent from '@/components/MarkdownContent';
import { MachineTags, TypeBadge } from '@/components/content/Labels';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kobo-rits.vercel.app';

// 動的メタデータの生成
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    return {
      title: '記事が見つかりません',
    };
  }

  // 画像URLを絶対URLに変換
  const absoluteImageUrl = article.coverImage.startsWith('http')
    ? article.coverImage
    : `${SITE_URL}${article.coverImage}`;

  return {
    title: article.title,
    description:
      article.excerpt || `${article.title} - 立命館大学KOBO【非公式】`,
    keywords: [
      'KOBO',
      '立命館大学',
      'OIC',
      '大阪いばらきキャンパス',
      '3Dプリント',
      'デジタルファブリケーション',
      article.title,
    ],
    authors: [{ name: article.author.name }],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    alternates: {
      canonical: `${SITE_URL}/articles/${id}`,
    },
    openGraph: {
      title: `${article.title} | KOBO【非公式】`,
      description:
        article.excerpt || `${article.title} - 立命館大学KOBO【非公式】`,
      type: 'article',
      url: `${SITE_URL}/articles/${id}`,
      siteName: 'KOBO【非公式】',
      locale: 'ja_JP',
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      publishedTime: article.date,
      authors: [article.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.title} | KOBO【非公式】`,
      description:
        article.excerpt || `${article.title} - 立命館大学KOBO【非公式】`,
      images: [absoluteImageUrl],
    },
  };
}

// 静的パスの生成（SEO向上のため）
export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((article) => ({
    id: article.id,
  }));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    notFound();
  }

  // 画像URLを絶対URLに変換
  const absoluteImageUrl = article.coverImage.startsWith('http')
    ? article.coverImage
    : `${SITE_URL}${article.coverImage}`;

  // 構造化データ（JSON-LD）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description:
      article.excerpt || `${article.title} - 立命館大学KOBO【非公式】`,
    image: absoluteImageUrl,
    datePublished: article.date,
    dateModified: article.date,
    author: {
      '@type': 'Person',
      name: article.author.name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'KOBO【非公式】',
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${id}`,
    },
  };

  return (
    <div className='min-h-screen bg-white'>
      {/* 構造化データ */}
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <Header />

      <div className='px-4 py-8'>
        <div className='max-w-6xl mx-auto'>
          {/* 記事のヘッダー */}
          <header className='grid grid-cols-1 md:grid-cols-[1fr_250px] gap-8'>
            <div className='mb-4'>
              <div className='mb-3 flex flex-wrap items-center gap-2'>
                <TypeBadge type={article.type} />
                <MachineTags machines={article.machines} basePath='/articles' />
              </div>
              <h1 className='text-4xl font-bold'>{article.title}</h1>
              <div className='my-4 flex items-center gap-4'>
                <Image
                  src={article.author.avatar || '/placeholder.svg'}
                  alt={article.author.name}
                  width={40}
                  height={40}
                  className='rounded-full'
                />
                <div>
                  <p className='text-sm font-medium'>{article.author.name}</p>
                  <p className='text-sm text-gray-500'>{formatDate(article.date)}</p>
                </div>
              </div>
              <div className='relative h-[200px] w-full md:h-[400px]'>
                <Image src={article.coverImage || '/placeholder.svg'} alt='' fill className='rounded-lg object-cover' />
              </div>
            </div>
          </header>

          {/* 記事の本文 + 目次（デスクトップでは横並び） */}
          <div className='grid grid-cols-1 md:grid-cols-[1fr_250px] gap-8'>
            {/* 記事の本文 */}
            <article>
              {article.content && (
                <MarkdownContent tree={article.content} className='article-body' />
              )}
            </article>

            {/* 目次（デスクトップでは本文の右側に固定表示） */}
            <aside className='order-first md:order-last'>
              <div className='md:sticky md:top-20 space-y-4'>
                <h3 className='font-semibold mb-4'>目次</h3>
                <nav className='space-y-2'>
                  {article.sections?.map((section, index) => (
                    <a
                      key={section.id || `section-${index}`}
                      href={`#${section.id}`}
                      className={`block hover:text-foreground transition-colors ${
                        section.level === 2
                          ? 'font-semibold text-sm text-foreground py-2'
                          : 'ml-8 border-l-2 border-slate-300 py-1 pl-4 text-sm text-muted-foreground font-normal'
                      }`}
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
