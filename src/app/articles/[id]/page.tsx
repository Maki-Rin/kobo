import Image from 'next/image';
import { notFound } from 'next/navigation';
import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Define the Article type to match articles.json structure
interface Article {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  author: {
    name: string;
    avatar: string;
  };
  coverImage: string;
  content: string;
  sections: {
    id: string;
    title: string;
    level: number; // 2 for h2, 3 for h3, etc.
  }[];
}

// Define the ArticlesData structure
interface ArticlesData {
  articles: {
    id: string;
    title: string;
    excerpt: string;
    date: string;
    author: {
      name: string;
      avatar: string;
    };
    coverImage: string;
  }[];
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Get article data from both articles.json and markdown content
async function getArticle(id: string): Promise<Article | undefined> {
  try {
    // First, get article metadata from articles.json
    const articlesJsonPath = path.join(
      process.cwd(),
      'public/data/articles.json'
    );
    const articlesJsonData = await fs.readFile(articlesJsonPath, 'utf8');
    const articlesData: ArticlesData = JSON.parse(articlesJsonData);

    // Find the article with matching ID
    const articleMeta = articlesData.articles.find(
      (article) => article.id === id
    );
    if (!articleMeta) {
      console.error(`Article with ID ${id} not found in articles.json`);
      return undefined;
    }

    // Path to markdown files directory
    const articlesDirectory = path.join(process.cwd(), 'src/content/articles');

    // Create the directory structure if it doesn't exist
    try {
      await fs.access(articlesDirectory);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(articlesDirectory, { recursive: true });
      console.log(`Created directory: ${articlesDirectory}`);
    }

    const filePath = path.join(articlesDirectory, `${id}.md`);

    // Check if the markdown file exists
    try {
      await fs.access(filePath);
    } catch {
      console.error(`Markdown file not found: ${filePath}`);
      return undefined;
    }

    // Read markdown file
    const fileContents = await fs.readFile(filePath, 'utf8');

    // Use gray-matter to parse the article metadata and content
    const { content } = matter(fileContents);

    // Extract headings to create table of contents (h2 and h3)
    const headingRegex = /^(#{2,3}) (.*$)/gm;
    const sections: { id: string; title: string; level: number }[] = [];
    let match;
    let index = 0;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length; // ## = 2, ### = 3
      const title = match[2].trim();

      if (title) {
        // Generate ID from title
        const id =
          title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\u00A0-\uFFFF-]/g, '')
            .replace(/^-+|-+$/g, '') || `section-${index}`;
        sections.push({ id, title, level });
        index++;
      }
    }

    // Use remark to convert markdown into HTML string
    const result = await remark().use(html).process(content);

    let contentHtml = result.toString();

    // Manually add IDs to the h2 and h3 elements in the HTML
    sections.forEach((section) => {
      const headingTag = section.level === 2 ? 'h2' : 'h3';

      // Create a more flexible regex to match headings
      const headingRegex = new RegExp(
        `<${headingTag}>(.*?)<\/${headingTag}>`,
        'gi'
      );

      // Find and replace the heading with the exact title
      contentHtml = contentHtml.replace(headingRegex, (match, titleContent) => {
        // Clean up the title content for comparison
        const cleanTitle = titleContent.trim().replace(/\s+/g, ' ');
        const cleanSectionTitle = section.title.trim().replace(/\s+/g, ' ');

        if (cleanTitle === cleanSectionTitle) {
          // Add inline styles for h3 elements to ensure they're applied
          const inlineStyle =
            headingTag === 'h3'
              ? ' style="font-weight: bold !important; color: hsl(var(--primary)) !important; font-size: 1.5rem !important; margin-top: 2rem !important; margin-bottom: 1rem !important; scroll-margin-top: 6rem !important;"'
              : '';

          return `<${headingTag} id="${section.id}"${inlineStyle}>${section.title}</${headingTag}>`;
        }
        return match;
      });
    });

    // Return the article data combining JSON metadata and markdown content
    return {
      id,
      title: articleMeta.title,
      excerpt: articleMeta.excerpt,
      date: articleMeta.date,
      author: {
        name: articleMeta.author.name,
        avatar: articleMeta.author.avatar || '/placeholder.svg',
      },
      coverImage: articleMeta.coverImage || '/placeholder.svg',
      content: contentHtml,
      sections,
    };
  } catch (error) {
    console.error(`Error getting article ${id}:`, error);
    return undefined;
  }
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
[&_code]:bg-gray-100 [&_code]:p-2 [&_code]:rounded-lg [&_code]:text-base
[&_pre]:bg-gray-900 [&_pre]:text-white [&_pre]:p-5 [&_pre]:rounded-xl'
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </article>

            {/* 目次（デスクトップでは本文の右側に固定表示） */}
            <aside className='order-first md:order-last'>
              <div className='md:sticky md:top-20 space-y-4'>
                <h3 className='font-semibold mb-4'>目次</h3>
                <nav className='space-y-2'>
                  {article.sections.map((section, index) => (
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
