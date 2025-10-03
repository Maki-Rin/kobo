'use client';

import { useState, useEffect } from 'react';
import SafeImage from './SafeImage';

interface LinkMetadata {
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

interface LinkCardProps {
  url: string;
}

export default function LinkCard({ url }: LinkCardProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (metadata) {
      console.log('LinkCard metadata loaded:', {
        url,
        hasImage: !!metadata.image,
        imageUrl: metadata.image,
        title: metadata.title,
      });
    }
  }, [metadata, url]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);

        // MetaTagsのAPIを使用してメタデータを取得
        const response = await fetch(
          `/api/link-metadata?url=${encodeURIComponent(url)}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch metadata');
        }

        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error('Error fetching link metadata:', err);
        // エラーの場合はURLのみを表示
        setMetadata({
          title: url,
          url: url,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  if (loading) {
    return (
      <div className='border border-gray-200 rounded-lg p-2 my-2 animate-pulse'>
        <div className='h-3 bg-gray-200 rounded w-3/4 mb-2'></div>
        <div className='h-2 bg-gray-200 rounded w-1/2'></div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <a
        href={url}
        target='_blank'
        rel='noopener noreferrer'
        className='text-blue-600 hover:text-blue-800 transition-colors no-underline'
      >
        {url}
      </a>
    );
  }

  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className='block border rounded-lg hover:shadow-lg hover:border-gray-500 transition-all duration-200 bg-white no-underline overflow-hidden my-4'
    >
      <div className='flex items-center'>
        <div className='flex-1 min-w-0 pl-4'>
          <p className='font-bold text-sm line-clamp-2 text-gray-900 leading-none'>
            {metadata.title}
          </p>
          {metadata.description && (
            <p className='text-gray-600 line-clamp-2 leading-none'>
              {metadata.description}
            </p>
          )}
          <div className='flex items-center gap-1.5'>
            {metadata.siteName && (
              <span className='text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded'>
                {metadata.siteName}
              </span>
            )}
            <span className='text-xs text-gray-500 truncate'>
              {new URL(url).hostname}
            </span>
          </div>
        </div>
        {metadata.image && (
          <div className='flex-shrink-0 px-2 w-1/4'>
            <SafeImage src={metadata.image} alt='' className='object-contain' />
          </div>
        )}
      </div>
    </a>
  );
}
