import type { MetadataRoute } from 'next';
import { getArticles } from '@/lib/articles';
import { getEntries } from '@/lib/content';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kobo-rits.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [articles, works, events] = await Promise.all([getArticles(), getEntries('works'), getEntries('events')]);

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.id}`,
    lastModified: new Date(article.date),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...articleEntries,
    ...(['works', 'events', 'printers'] as const).map((section) => ({
      url: `${SITE_URL}/${section}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...[
      ...works.map((entry) => ({ section: 'works', entry })),
      ...events.map((entry) => ({ section: 'events', entry })),
    ].map(({ section, entry }) => ({
      url: `${SITE_URL}/${section}/${entry.id}`,
      lastModified: entry.date ? new Date(entry.date) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
