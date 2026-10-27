import Image from 'next/image';
import Link from 'next/link';
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
    <div className='min-h-screen bg-paper'>
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />

      <main className='mx-auto max-w-6xl px-4 py-8 md:px-8'>
        <Link href='/articles' className='text-sm font-semibold underline-offset-4 hover:underline'>
          ← まなぶ
        </Link>
        <div className='mt-5 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_240px]'>
          <article className='min-w-0'>
            <header className='space-y-4'>
              <div className='flex flex-wrap items-center gap-2'>
                <TypeBadge type={article.type} />
                <MachineTags machines={article.machines} basePath='/articles' />
              </div>
              <h1 className='text-3xl font-extrabold leading-tight md:text-4xl'>{article.title}</h1>
              <div className='flex items-center gap-3'>
                {article.author.avatar && (
                  <Image src={article.author.avatar} alt='' width={36} height={36} className='rounded-full border-2 border-ink' />
                )}
                <div className='text-sm'>
                  <p className='font-semibold'>{article.author.name}</p>
                  <p className='text-muted'>{formatDate(article.date)}</p>
                </div>
              </div>
              <div className='relative aspect-[1200/630] overflow-hidden rounded-2xl border-2 border-ink bg-off'>
                <Image src={article.coverImage || '/placeholder.svg'} alt='' fill priority sizes='(min-width: 1024px) 800px, 100vw' className='object-cover' />
              </div>
            </header>
            <div className='mt-8'>
              {article.content && <MarkdownContent tree={article.content} className='article-body' />}
            </div>
          </article>

          {(article.sections?.length ?? 0) > 0 && (
            <aside className='order-first lg:order-last'>
              <nav className='rounded-xl border-2 border-ink p-4 lg:sticky lg:top-6' aria-label='目次'>
                <p className='mb-2 text-sm font-extrabold'>目次</p>
                <ul className='space-y-1 text-sm'>
                  {article.sections?.map((section, index) => (
                    <li key={section.id || `section-${index}`}>
                      <a
                        href={`#${section.id}`}
                        className={`block rounded-md px-2 py-1 hover:bg-cream ${
                          section.level === 2 ? 'font-semibold' : 'ml-3 border-l-2 border-line-soft pl-3 text-muted'
                        }`}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
