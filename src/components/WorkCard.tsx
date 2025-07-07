'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Work } from '@/lib/works';

interface WorkCardProps {
  work: Work;
}

const WorkCard = ({ work }: WorkCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleCardClick = () => {
    setIsExpanded(true);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
    setCurrentImageIndex(0);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // モーダルの背景をクリックした場合のみ閉じる
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
      setCurrentImageIndex(0);
    }
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case '3D Printer':
        return 'bg-blue-400';
      case 'レーザー':
        return 'bg-red-400';
      case '刺繍':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const renderDescription = (description: string) => {
    // URLを検出する正規表現
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    // 改行で分割
    const lines = description.split('\n');

    return lines.map((line, lineIndex) => {
      const parts = line.split(urlRegex);

      const renderedLine = parts.map((part, partIndex) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={partIndex}
              href={part}
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:text-blue-800 underline'
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      });

      return (
        <span key={lineIndex}>
          {renderedLine}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* Small Card */}
      <div
        className='bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer'
        onClick={handleCardClick}
      >
        <div className='aspect-video bg-gray-200 relative'>
          <Image
            src={work.coverImage}
            alt={work.title}
            fill
            className='object-cover'
          />
        </div>
        <div className='p-4'>
          <h3 className='text-lg font-bold mb-2 text-left'>{work.title}</h3>
          <div className='flex flex-wrap gap-2 mb-3'>
            {work.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2 py-1 rounded-sm text-xs text-white ${getTagColor(
                  tag
                )}`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className='flex items-center'>
            {work.author && work.author.name && work.author.avatar ? (
              <>
                <Image
                  src={work.author.avatar}
                  alt={`${work.author.name} avatar`}
                  width={24}
                  height={24}
                  className='rounded-full mr-2'
                />
                <span className='text-sm text-gray-600'>
                  {work.author.name}
                </span>
              </>
            ) : (
              <>
                <div className='w-6 h-6 bg-gray-300 rounded-full mr-2'></div>
                <span className='text-sm text-gray-600'>KOBO Team</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className='fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50 p-4'
          onClick={handleBackdropClick}
        >
          <div className='bg-white rounded-lg w-[800px] h-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto relative'>
            <button
              onClick={handleClose}
              className='bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 p-1'
            >
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>

            <div className='p-6'>
              {/* Main Image */}
              <div className='aspect-video bg-gray-200 relative mb-4 rounded-lg overflow-hidden'>
                <Image
                  src={work.images[currentImageIndex]}
                  alt={`${work.title} - Image ${currentImageIndex + 1}`}
                  fill
                  className='object-cover'
                />
              </div>

              {/* Thumbnail Gallery */}
              <div className='flex gap-2 mb-4 overflow-x-auto'>
                {work.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                      index === currentImageIndex
                        ? 'border-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${work.title} thumbnail ${index + 1}`}
                      width={64}
                      height={64}
                      className='object-cover w-full h-full'
                    />
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className='space-y-4'>
                <h2 className='text-2xl font-bold text-left'>{work.title}</h2>
                <div className='flex flex-wrap gap-2'>
                  {work.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-3 py-1 rounded-sm text-sm text-white ${getTagColor(
                        tag
                      )}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className='flex items-center'>
                  {work.author && work.author.name && work.author.avatar ? (
                    <>
                      <Image
                        src={work.author.avatar}
                        alt={`${work.author.name} avatar`}
                        width={28}
                        height={28}
                        className='rounded-full mr-2'
                      />
                      <span className='text-gray-600'>{work.author.name}</span>
                    </>
                  ) : (
                    <>
                      <div className='w-7 h-7 bg-gray-300 rounded-full mr-2'></div>
                      <span className='text-gray-600'>KOBO Team</span>
                    </>
                  )}
                </div>
                <p className='text-gray-600 text-left leading-relaxed'>
                  {renderDescription(work.description)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkCard;
