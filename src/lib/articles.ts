import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { Root as HastRoot } from 'hast';
import { markdownToPlainText, renderMarkdown, type Section } from './markdown';

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
  content?: HastRoot;
  sections?: Section[];
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

    const { tree, sections } = await renderMarkdown(content);

    // Generate excerpt if not provided
    const excerpt = frontMatter.excerpt || generateExcerpt(content);

    return {
      id,
      title: frontMatter.title,
      excerpt,
      date: frontMatter.date,
      author: frontMatter.author,
      coverImage: frontMatter.coverImage,
      content: tree,
      sections,
    };
  } catch (error) {
    console.error(`Error getting article ${id}:`, error);
    return undefined;
  }
}

// Generate excerpt from content
function generateExcerpt(content: string, maxLength: number = 160): string {
  const plainText = markdownToPlainText(content);

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
