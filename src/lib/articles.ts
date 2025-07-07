import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

export interface Article {
  id: string;
  title: string;
  excerpt?: string;
  date: string;
  author: {
    name: string;
    avatar: string;
  };
  coverImage: string;
  content?: string;
  sections?: {
    id: string;
    title: string;
    level: number;
  }[];
}

export interface ArticleFrontMatter {
  title: string;
  date: string;
  excerpt?: string;
  author: {
    name: string;
    avatar: string;
  };
  coverImage: string;
}

const articlesDirectory = path.join(process.cwd(), 'src/content/articles');

// Get all article metadata from markdown files
export async function getArticles(): Promise<Article[]> {
  try {
    // Check if articles directory exists
    try {
      await fs.access(articlesDirectory);
    } catch {
      console.warn('Articles directory not found');
      return [];
    }

    const files = await fs.readdir(articlesDirectory);
    const markdownFiles = files.filter((file) => file.endsWith('.md'));

    const articles: Article[] = [];

    for (const file of markdownFiles) {
      const filePath = path.join(articlesDirectory, file);
      const fileContents = await fs.readFile(filePath, 'utf8');
      const { data } = matter(fileContents);

      const frontMatter = data as ArticleFrontMatter;
      const id = path.basename(file, '.md');

      // Generate excerpt if not provided
      const excerpt =
        frontMatter.excerpt || generateExcerpt(matter(fileContents).content);

      articles.push({
        id,
        title: frontMatter.title,
        excerpt,
        date: frontMatter.date,
        author: frontMatter.author,
        coverImage: frontMatter.coverImage,
      });
    }

    // Sort articles by date (newest first)
    return articles.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error('Error getting articles:', error);
    return [];
  }
}

// Get a single article with content
export async function getArticle(id: string): Promise<Article | undefined> {
  try {
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
    const { data, content } = matter(fileContents);
    const frontMatter = data as ArticleFrontMatter;

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
        const sectionId =
          title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\u00A0-\uFFFF-]/g, '')
            .replace(/^-+|-+$/g, '') || `section-${index}`;

        sections.push({ id: sectionId, title, level });
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

    // Generate excerpt if not provided
    const excerpt = frontMatter.excerpt || generateExcerpt(content);

    return {
      id,
      title: frontMatter.title,
      excerpt,
      date: frontMatter.date,
      author: frontMatter.author,
      coverImage: frontMatter.coverImage,
      content: contentHtml,
      sections,
    };
  } catch (error) {
    console.error(`Error getting article ${id}:`, error);
    return undefined;
  }
}

// Generate excerpt from content
function generateExcerpt(content: string, maxLength: number = 160): string {
  // Remove markdown syntax and get plain text
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // Remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/`([^`]+)`/g, '$1') // Remove code
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Find the last complete sentence within the limit
  const truncated = plainText.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('。');
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');

  const cutoff = Math.max(lastSentence, lastPeriod, lastSpace);

  if (cutoff > maxLength * 0.7) {
    return truncated.substring(0, cutoff + 1);
  }

  return truncated + '...';
}

// Helper function to format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
