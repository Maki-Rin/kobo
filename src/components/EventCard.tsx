'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Event } from '@/lib/events';

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = () => {
    setIsExpanded(true);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // モーダルの背景をクリックした場合のみ閉じる
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  };

  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      {/* Small Card */}
      <div
        className='bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer'
        onClick={handleCardClick}
      >
        <div className='aspect-[3/4] bg-gray-200 relative'>
          <Image
            src={event.image}
            alt={`Event on ${event.date}`}
            fill
            className='object-cover'
          />
        </div>
        <div className='p-4'>
          <p className='text-gray-600 text-sm text-center'>
            {formatDate(event.date)}
          </p>
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className='fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50 p-4'
          onClick={handleBackdropClick}
        >
          <div className='bg-white rounded-lg max-w-[90vw] max-h-[90vh] relative'>
            <button
              onClick={handleClose}
              className='absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 bg-white rounded-full p-1 shadow-md'
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

            {/* Full Image */}
            <div className='relative'>
              <Image
                src={event.image}
                alt={`Event on ${event.date}`}
                width={800}
                height={600}
                className='rounded-lg object-contain max-w-[90vw] max-h-[90vh]'
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EventCard;
