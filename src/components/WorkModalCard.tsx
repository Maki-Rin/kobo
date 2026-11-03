'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface WorkCardData {
  id: string;
  title: string;
  coverImage: string;
  images: string[];
  authorName: string;
  authorAvatar: string;
}

function Author({ name, avatar, size }: { name: string; avatar: string; size: number }) {
  return (
    <div className='flex items-center'>
      {avatar ? (
        <Image src={avatar} alt={`${name} avatar`} width={size} height={size} className='mr-2 rounded-full' />
      ) : (
        <div className='mr-2 rounded-full bg-gray-300' style={{ width: size, height: size }} />
      )}
      <span className={size > 24 ? 'text-gray-600' : 'text-sm text-gray-600'}>{name}</span>
    </div>
  );
}

export default function WorkModalCard({
  work,
  tags,
  largeTags,
  description,
}: {
  work: WorkCardData;
  tags: React.ReactNode;
  largeTags: React.ReactNode;
  description: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = work.images.length > 0 ? work.images : work.coverImage ? [work.coverImage] : [];

  const close = () => {
    setIsExpanded(false);
    setCurrentImageIndex(0);
  };

  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
        setCurrentImageIndex(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExpanded]);

  return (
    <>
      <button
        type='button'
        className='block h-full w-full cursor-pointer overflow-hidden rounded-lg border border-neutral-200 bg-white text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5'
        onClick={() => setIsExpanded(true)}
      >
        <div className='relative aspect-video overflow-hidden bg-neutral-200'>
          {work.coverImage && (
            <Image
              src={work.coverImage}
              alt={work.title}
              fill
              sizes='(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
              className='object-cover transition-transform duration-300 hover:scale-[1.02]'
            />
          )}
        </div>
        <div className='p-5'>
          <h3 className='mb-3 text-left text-lg font-bold leading-snug'>{work.title}</h3>
          <div className='mb-3 flex flex-wrap gap-2'>{tags}</div>
          <Author name={work.authorName} avatar={work.authorAvatar} size={24} />
        </div>
      </button>

      {isExpanded && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4'
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            role='dialog'
            aria-modal='true'
            aria-label={work.title}
            className='relative h-[600px] max-h-[90vh] w-[800px] max-w-[90vw] overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-2xl'
          >
            <button
              type='button'
              onClick={close}
              aria-label='閉じる'
              className='absolute right-4 top-4 z-10 cursor-pointer overflow-hidden rounded-lg bg-white p-1 text-gray-500 shadow-md transition-shadow hover:text-gray-700 hover:shadow-lg'
            >
              <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>

            <div className='p-6'>
              {images.length > 0 && (
                <div className='relative mb-4 aspect-video overflow-hidden rounded-lg bg-gray-200'>
                  <Image
                    src={images[currentImageIndex]}
                    alt={`${work.title} - Image ${currentImageIndex + 1}`}
                    fill
                    sizes='800px'
                    className='object-cover'
                  />
                </div>
              )}

              {images.length > 1 && (
                <div className='mb-4 flex gap-2 overflow-x-auto'>
                  {images.map((image, index) => (
                    <button
                      key={image}
                      type='button'
                      onClick={() => setCurrentImageIndex(index)}
                      aria-label={`${index + 1}枚目を表示`}
                      className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 ${
                        index === currentImageIndex ? 'border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      <Image src={image} alt='' width={64} height={64} className='h-full w-full object-cover' />
                    </button>
                  ))}
                </div>
              )}

              <div className='space-y-4'>
                <h2 className='text-left text-2xl font-bold'>{work.title}</h2>
                <div className='flex flex-wrap gap-2'>{largeTags}</div>
                <Author name={work.authorName} avatar={work.authorAvatar} size={28} />
                <div className='text-left leading-relaxed text-gray-600'>{description}</div>
                <Link href={`/works/${work.id}`} className='inline-block text-sm text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:decoration-black'>
                  作例のページを開く
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
