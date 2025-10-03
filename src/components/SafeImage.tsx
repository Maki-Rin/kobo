'use client';

import { useState, useEffect, useCallback } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function SafeImage({
  src,
  alt,
  width,
  height,
  className = '',
}: SafeImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // プロキシ経由でURLを変換
  const getProxiedImageUrl = useCallback((originalUrl: string) => {
    // HTMLエンティティをデコード
    const cleanUrl = originalUrl
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');

    // Qiitaの画像は直接読み込みを試行（imgixのhotlink protectionのため）
    if (cleanUrl.includes('qiita-user-contents.imgix.net')) {
      return cleanUrl; // プロキシを使わずに直接読み込み
    }

    // その他の外部ドメインの画像はプロキシ経由で取得
    if (
      cleanUrl.includes('opengraph.githubassets.com') ||
      cleanUrl.includes('play-lh.googleusercontent.com')
    ) {
      return `/api/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
    }
    return cleanUrl;
  }, []);

  useEffect(() => {
    console.log('SafeImage component mounted with src:', src);
    const proxiedUrl = getProxiedImageUrl(src);
    console.log('Proxied URL:', proxiedUrl);
    console.log('Should use proxy:', src !== proxiedUrl);
  }, [src, getProxiedImageUrl]);

  const proxiedSrc = getProxiedImageUrl(src);

  const style =
    width && height ? { width: `${width}px`, height: `${height}px` } : {};

  if (imageError) {
    // エラーの場合は画像の代わりにプレースホルダーを表示
    return (
      <div
        className={`relative ${className} bg-gray-100 flex items-center justify-center`}
        style={style}
      >
        <div className='text-gray-400 text-xs text-center p-2'>
          <div className='mb-1'>📷</div>
          <div>画像を読み込めませんでした</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={style}>
      {!imageLoaded && (
        <div
          className='absolute inset-0 bg-gray-200 animate-pulse'
          style={style}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proxiedSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200 w-full h-full`}
        onError={(e) => {
          const errorMsg = `Image failed to load: ${proxiedSrc}`;
          console.error(errorMsg, e);
          setImageError(true);
        }}
        onLoad={() => {
          console.log('Image loaded successfully:', proxiedSrc);
          setImageLoaded(true);
        }}
        loading='lazy'
      />
    </div>
  );
}
