import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArticle, formatDate } from '@/lib/articles';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

  return (
    <div className='min-h-screen bg-white'>
      {/* Header */}
      <Header />

      <div className='px-4 py-8'>
        <div className='max-w-6xl mx-auto'>
          {/* 記事のヘッダー */}
          <header className='grid grid-cols-1 md:grid-cols-[1fr_250px] gap-8'>
            <h1 className='text-4xl font-bold mb-4'>
              {article.title}
              <div className='flex items-center gap-4 my-4'>
                <Image
                  src={article.author.avatar || '/placeholder.svg'}
                  alt={article.author.name}
                  width={40}
                  height={40}
                  className='rounded-full'
                />
                <div>
                  <p className='text-sm font-medium'>{article.author.name}</p>
                  <p className='text-sm text-muted-foreground'>
                    {formatDate(article.date)}
                  </p>
                </div>
              </div>
              <div className='relative w-full h-[200px] md:h-[400px]'>
                <Image
                  src={article.coverImage || '/placeholder.svg'}
                  alt=''
                  fill
                  className='rounded-lg object-cover'
                />
              </div>
            </h1>
          </header>

          {/* 記事の本文 + 目次（デスクトップでは横並び） */}
          <div className='grid grid-cols-1 md:grid-cols-[1fr_250px] gap-8'>
            {/* 記事の本文 */}
            <article>
              <div
                className='prose prose-lg max-w-none dark:prose-invert
prose-h3:!font-normal prose-h3:!text-base prose-h3:!mt-0 prose-h3:!mb-0
[&_h2]:font-extrabold [&_h2]:text-primary [&_h2]:mt-10 [&_h2]:mb-6
[&_h2]:text-3xl [&_h2]:border-b-2 [&_h2]:border-muted [&_h2]:pb-3 [&_h2]:scroll-mt-24
[&_h3]:!font-bold [&_h3]:!text-primary [&_h3]:!mt-8 [&_h3]:!mb-4
[&_h3]:!text-2xl [&_h3]:!scroll-mt-24
[&_p]:text-lg [&_p]:leading-8 [&_p]:my-6
[&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800 transition-colors
[&_img]:rounded-xl [&_img]:shadow-lg [&_img]:my-10 [&_img]:max-h-[500px] [&_img]:mx-auto [&_img]:block
[&_strong]:text-primary [&_strong]:font-extrabold
[&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-3
[&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-8
[&_ul>li::marker]:text-lg [&_ol>li::marker]:text-lg
[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:bg-muted/10 [&_blockquote]:py-2
[&_code]:p-2 [&_code]:rounded-lg [&_code]:text-base
[&_pre]:bg-gray-900 [&_pre]:text-white [&_pre]:p-5 [&_pre]:rounded-xl'
                dangerouslySetInnerHTML={{ __html: article.content || '' }}
              />
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
                          : 'ml-8 text-sm text-muted-foreground font-normal'
                      }`}
                      style={
                        section.level === 3
                          ? {
                              borderLeft: '2px solid #cbd5e1',
                              paddingLeft: '1rem',
                              paddingTop: '0.25rem',
                              paddingBottom: '0.25rem',
                            }
                          : {}
                      }
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
