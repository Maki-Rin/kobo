'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import EventCard from '@/components/EventCard';
import { type Article } from '@/lib/articles';
import { type Work, getWorks } from '@/lib/works';
import { type Event, getEvents } from '@/lib/events';

const heroImages = [
  '/images/top1.jpg',
  '/images/top2.jpg',
  '/images/top3.jpg',
  '/images/top4.jpg',
  '/images/top5.jpg',
  '/images/top6.jpg',
  '/images/top7.jpg',
  '/images/top8.jpg',
];

interface ArticleCardProps {
  article: Article;
}

const ArticleCard = ({ article }: ArticleCardProps) => {
  return (
    <Link href={`/articles/${article.id}`}>
      <div className='bg-white dark:bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer'>
        <div className='aspect-video bg-gray-200 relative'>
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className='object-cover'
          />
        </div>
        <div className='p-6'>
          <h3 className='text-xl font-bold mb-3 text-left text-gray-900 dark:text-gray-900 h-14 leading-7 overflow-hidden'>
            {article.title}
          </h3>
          <p className='text-gray-600 dark:text-gray-600 text-sm mb-4 text-left h-16 leading-5 overflow-hidden'>
            {article.excerpt}
          </p>
          <div className='flex items-center justify-between text-sm text-gray-500 dark:text-gray-500'>
            <div className='flex items-center'>
              {article.author &&
              article.author.name &&
              article.author.avatar ? (
                <>
                  <Image
                    src={article.author.avatar}
                    alt={`${article.author.name} avatar`}
                    width={24}
                    height={24}
                    className='rounded-full mr-2'
                  />
                  <span>{article.author.name}</span>
                </>
              ) : (
                <>
                  <div className='w-6 h-6 bg-gray-300 rounded-full mr-2'></div>
                  <span>KOBO STAFF</span>
                </>
              )}
            </div>
            <span className='text-gray-500 dark:text-gray-500'>
              {article.date || 'Coming Soon'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [articles, setArticles] = useState<Article[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentWorksIndex, setCurrentWorksIndex] = useState(0);
  const [currentEventsIndex, setCurrentEventsIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const worksPerPage = 3;
  const mobileWorksPerPage = 1;
  const eventsPerPage = 3;
  const mobileEventsPerPage = 1;

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000); // 4秒ごとに画像を切り替え

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch('/api/articles');
        const data: { articles: Article[] } = await response.json();
        setArticles(data.articles);
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      }
    };

    fetchArticles();
  }, []);

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const worksData = await getWorks();
        setWorks(worksData);
      } catch (error) {
        console.error('Failed to fetch works:', error);
      }
    };

    fetchWorks();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsData = await getEvents();
        setEvents(eventsData);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
  }, []);

  // Works carousel functions
  const currentWorksPerPage = isMobile ? mobileWorksPerPage : worksPerPage;
  const totalWorksPages = Math.ceil(works.length / currentWorksPerPage);
  const currentWorks = works.slice(
    currentWorksIndex * currentWorksPerPage,
    (currentWorksIndex + 1) * currentWorksPerPage
  );

  const handleWorksNext = () => {
    setCurrentWorksIndex((prevIndex) =>
      prevIndex === totalWorksPages - 1 ? 0 : prevIndex + 1
    );
  };

  const handleWorksPrev = () => {
    setCurrentWorksIndex((prevIndex) =>
      prevIndex === 0 ? totalWorksPages - 1 : prevIndex - 1
    );
  };

  // Events carousel functions
  const currentEventsPerPage = isMobile ? mobileEventsPerPage : eventsPerPage;
  const totalEventsPages = Math.ceil(events.length / currentEventsPerPage);
  const currentEvents = events.slice(
    currentEventsIndex * currentEventsPerPage,
    (currentEventsIndex + 1) * currentEventsPerPage
  );

  const handleEventsNext = () => {
    setCurrentEventsIndex((prevIndex) =>
      prevIndex === totalEventsPages - 1 ? 0 : prevIndex + 1
    );
  };

  const handleEventsPrev = () => {
    setCurrentEventsIndex((prevIndex) =>
      prevIndex === 0 ? totalEventsPages - 1 : prevIndex - 1
    );
  };

  // Reset indexes when screen size changes
  useEffect(() => {
    setCurrentWorksIndex(0);
    setCurrentEventsIndex(0);
  }, [isMobile]);

  return (
    <div className='min-h-screen bg-white text-gray-900 dark:bg-white dark:text-gray-900'>
      {/* Header */}
      <Header />

      {/* Hero Section with Image Carousel */}
      <section className='relative h-96 overflow-hidden'>
        <div className='relative w-full h-full'>
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={image || '/placeholder.svg'}
                alt={`Hero image ${index + 1}`}
                fill
                className='object-cover'
                priority={index === 0}
              />
            </div>
          ))}
          <div className='absolute inset-0 bg-black/30 flex items-center justify-center'>
            <h2 className='text-white text-4xl md:text-6xl font-bold'>
              {"Let's Fab!!"}
            </h2>
          </div>
        </div>

        {/* Image indicators */}
        <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2'>
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentImageIndex
                  ? 'bg-white'
                  : 'bg-white bg-opacity-50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Main Content - 3段構成 */}
      <main className='container mx-auto px-6 py-12'>
        {/* Section 1: How to Fab */}
        <section className='mb-16 text-center'>
          <h2 className='text-3xl font-bold mb-8 text-gray-900 dark:text-gray-900'>
            How to Fab
          </h2>
          <div className='max-w-4xl mx-auto'>
            <p className='text-lg text-gray-600 dark:text-gray-700 leading-relaxed'>
              ファブリケーションの基本から応用まで、あなたの創造力を形にするためのガイドをご紹介します。
              <br />
              最新の技術を組み合わせて、革新的なものづくりを始めましょう。
            </p>
          </div>

          {/* Articles Grid */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12'>
            {articles.slice(0, isMobile ? 3 : 3).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}

            {/* Placeholder card for third column if needed - only show on desktop when less than 3 articles */}
            {!isMobile && articles.length < 3 && (
              <div className='bg-white dark:bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow'>
                <div className='aspect-video bg-gray-200 relative flex items-center justify-center'>
                  <span className='text-gray-500 dark:text-gray-500'>
                    Coming Soon
                  </span>
                </div>
                <div className='p-6'>
                  <h3 className='text-xl font-bold mb-3 text-left text-gray-900 dark:text-gray-900 h-14 leading-7 overflow-hidden'>
                    新しいコンテンツを準備中
                  </h3>
                  <p className='text-gray-600 dark:text-gray-600 text-sm mb-4 text-left h-16 leading-5 overflow-hidden'>
                    近日中に新しいチュートリアルやワークショップを公開予定です。
                  </p>
                  <div className='flex items-center justify-between text-sm text-gray-500 dark:text-gray-500'>
                    <div className='flex items-center'>
                      <div className='w-6 h-6 bg-gray-300 rounded-full mr-2'></div>
                      <span>KOBO STAFF</span>
                    </div>
                    <span>Coming Soon</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Read More Button - show only if there are more than 3 articles */}
          {articles.length > 3 && (
            <div className='mt-8'>
              <Link href='/articles' className='inline-block mx-auto'>
                <div className='bg-white dark:bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer px-6 py-3 sm:px-8 md:px-10 sm:py-3 md:py-4 text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-900 flex items-center justify-center min-w-[150px]'>
                  READ MORE
                  <span className='ml-2'>&gt;&gt;</span>
                </div>
              </Link>
            </div>
          )}
        </section>

        {/* Section 2: Works */}
        <section className='mb-16 text-center'>
          <h2 className='text-3xl font-bold mb-8 text-gray-900 dark:text-gray-900'>
            Works
          </h2>
          <div className='max-w-6xl mx-auto'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {currentWorks.map((work) => (
                <WorkCard key={work.id} work={work} />
              ))}
            </div>

            {/* Navigation and Pagination - show only if there are multiple pages */}
            {works.length > currentWorksPerPage && (
              <div className='flex justify-center items-center mt-6 space-x-4'>
                <button
                  onClick={handleWorksPrev}
                  className='bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow'
                >
                  <svg
                    className='w-5 h-5 text-gray-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 19l-7-7 7-7'
                    />
                  </svg>
                </button>

                <div className='flex space-x-2'>
                  {Array.from({ length: totalWorksPages }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentWorksIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentWorksIndex
                          ? 'bg-blue-500'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleWorksNext}
                  className='bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow'
                >
                  <svg
                    className='w-5 h-5 text-gray-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 5l7 7-7 7'
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>
        {/* Section 3: Events */}
        <section className='mb-16 text-center'>
          <h2 className='text-3xl font-bold mb-8 text-gray-900 dark:text-gray-900'>
            Events
          </h2>
          <div className='max-w-6xl mx-auto'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {currentEvents.map((event, index) => (
                <EventCard key={`${event.date}-${index}`} event={event} />
              ))}
            </div>

            {/* Navigation and Pagination - show only if there are multiple pages */}
            {events.length > currentEventsPerPage && (
              <div className='flex justify-center items-center mt-6 space-x-4'>
                <button
                  onClick={handleEventsPrev}
                  className='bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow'
                >
                  <svg
                    className='w-5 h-5 text-gray-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 19l-7-7 7-7'
                    />
                  </svg>
                </button>

                <div className='flex space-x-2'>
                  {Array.from({ length: totalEventsPages }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentEventsIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentEventsIndex
                          ? 'bg-blue-500'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleEventsNext}
                  className='bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow'
                >
                  <svg
                    className='w-5 h-5 text-gray-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 5l7 7-7 7'
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
