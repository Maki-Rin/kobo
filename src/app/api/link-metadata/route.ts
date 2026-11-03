import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { allowedExternalUrl, fetchExternal } from '@/lib/external-fetch';

const loadHtml = unstable_cache(async (url: string) => {
  const response = await fetchExternal(url, 'metadata');
  return response.body.toString('utf8');
}, ['link-metadata-v2'], { revalidate: 3600 });

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const safeUrl = allowedExternalUrl(url, 'metadata').href;
    const html = await loadHtml(safeUrl);

    // 基本的な正規表現でメタデータを抽出
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const ogTitleMatch = html.match(
      /<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i
    );
    const twitterTitleMatch = html.match(
      /<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"[^>]*>/i
    );

    const descriptionMatch = html.match(
      /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i
    );
    const ogDescriptionMatch = html.match(
      /<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i
    );
    const twitterDescriptionMatch = html.match(
      /<meta[^>]*name="twitter:description"[^>]*content="([^"]*)"[^>]*>/i
    );

    const ogImageMatch = html.match(
      /<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i
    );
    const twitterImageMatch = html.match(
      /<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"[^>]*>/i
    );

    const ogSiteNameMatch = html.match(
      /<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"[^>]*>/i
    );

    // HTMLエンティティをデコードする関数
    const decodeHtmlEntities = (text: string) => {
      const entities: { [key: string]: string } = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#x2F;': '/',
        '&#x60;': '`',
        '&#x3D;': '=',
      };
      return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
    };

    const title =
      ogTitleMatch?.[1] || twitterTitleMatch?.[1] || titleMatch?.[1] || url;

    const description =
      ogDescriptionMatch?.[1] ||
      twitterDescriptionMatch?.[1] ||
      descriptionMatch?.[1] ||
      '';

    let image = ogImageMatch?.[1] || twitterImageMatch?.[1] || '';

    // HTMLエンティティをデコード
    if (image) {
      image = decodeHtmlEntities(image);
    }

    const siteName = ogSiteNameMatch?.[1] || '';

    // 相対URLを絶対URLに変換
    if (image && !image.startsWith('http')) {
      const baseUrl = new URL(url);
      if (image.startsWith('/')) {
        image = `${baseUrl.protocol}//${baseUrl.host}${image}`;
      } else {
        image = `${baseUrl.protocol}//${baseUrl.host}/${image}`;
      }
    }

    return NextResponse.json({
      title: title?.trim() || url,
      description: description?.trim() || '',
      image: image || undefined,
      siteName: siteName?.trim() || undefined,
      url,
    });
  } catch {
    return NextResponse.json(
      {
        title: url,
        url,
        error: 'Failed to fetch metadata',
      },
      { status: 400 }
    );
  }
}
