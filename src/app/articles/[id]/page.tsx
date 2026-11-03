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
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />

      <div className='px-4 py-8'>
        <div className='mx-auto max-w-6xl'>
          <header className='grid grid-cols-1 gap-8 md:grid-cols-[1fr_250px]'>
            <div className='mb-4'>
              <div className='mb-3 flex flex-wrap items-center gap-2'>
                <TypeBadge type={article.type} />
                <MachineTags machines={article.machines} basePath='/articles' />
              </div>
              <h1 className='text-4xl font-bold'>{article.title}</h1>
              <div className='my-4 flex items-center gap-4'>
                {article.author.avatar ? (
                  <Image src={article.author.avatar} alt='' width={40} height={40} className='rounded-full' />
                ) : (
                  <span className='size-10 rounded-full bg-neutral-300' />
                )}
                <div>
                  <p className='text-sm font-medium'>{article.author.name}</p>
                  <p className='text-sm font-bold'>{formatDate(article.date)}</p>
                </div>
              </div>
              <div className='relative h-[200px] w-full md:h-[400px]'>
                <Image
                  src={article.coverImage || '/placeholder.svg'}
                  alt=''
                  fill
                  priority
                  sizes='(min-width: 768px) 70vw, 100vw'
                  className='rounded-lg object-cover'
                />
              </div>
            </div>
          </header>

          <div className='grid grid-cols-1 gap-8 md:grid-cols-[1fr_250px]'>
            <article className='min-w-0'>
              {article.content && <MarkdownContent tree={article.content} className='article-body' />}
            </article>

            {(article.sections?.length ?? 0) > 0 && (
              <aside className='order-first md:order-last'>
                <div className='space-y-4 md:sticky md:top-20'>
                  <p className='mb-4 font-semibold'>目次</p>
                  <nav className='space-y-2' aria-label='目次'>
                    {article.sections?.map((section, index) => (
                      <a
                        key={section.id || `section-${index}`}
                        href={`#${section.id}`}
                        className={`block transition-colors hover:text-neutral-600 ${
                          section.level === 2
                            ? 'py-2 text-sm font-semibold text-neutral-900'
                            : 'ml-8 border-l-2 border-slate-300 py-1 pl-4 text-sm font-normal text-neutral-900'
                        }`}
                      >
                        {section.title}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
