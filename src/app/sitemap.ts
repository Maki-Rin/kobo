import type { MetadataRoute } from 'next';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kobo-rits.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // 記事のスラッグリスト
  const articles = [
    '3DPRINT',
    '3dmodel',
    'filament',
    'flashprint',
    'gcode',
    'orca-flashforge',
    'slicer',
  ];

  // 記事ページのサイトマップエントリ
  const articleEntries: MetadataRoute.Sitemap = articles.map((slug) => ({
    url: `${SITE_URL}/articles/${slug}`,
    lastModified: now,
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
  ];
}
