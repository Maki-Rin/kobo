'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

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

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000); // 4秒ごとに画像を切り替え

    return () => clearInterval(interval);
  }, []);

  return (
    <div className='min-h-screen bg-white'>
      {/* Header */}
      <header className='bg-black text-white py-4 px-6'>
        <div className='container mx-auto'>
          <h1 className='text-2xl font-bold'>KOBO</h1>
        </div>
      </header>

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
          <h2 className='text-3xl font-bold mb-8'>How to Fab</h2>
          <div className='max-w-4xl mx-auto'>
            <p className='text-lg text-gray-600 leading-relaxed'>
              ファブリケーションの基本から応用まで、あなたの創造力を形にするためのガイドをご紹介します。
              <br />
              最新の技術を組み合わせて、革新的なものづくりを始めましょう。
            </p>
          </div>
        </section>

        {/* Section 2: Works */}
        <section className='mb-16 text-center'>
          <h2 className='text-3xl font-bold mb-8'>Works</h2>
          <div className='max-w-2xl mx-auto'>
            <div className='bg-gray-400 h-64 flex items-center justify-center rounded-lg'></div>
          </div>
        </section>

        {/* Section 3: Topics */}
        <section className='mb-16 text-center'>
          <h2 className='text-3xl font-bold mb-8'>Topics</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto'>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className='bg-gray-400 h-48 rounded-lg flex items-center justify-center'
              >
                <span className='text-white font-medium'>Topic {item}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className='bg-black text-white py-6 px-6 mt-12'>
        <div className='container mx-auto text-center'>
          <a href='https://www.usuiyoshito.com' className='text-sm'>
            © Usui Yosito All rights reserved
          </a>
        </div>
      </footer>
    </div>
  );
}
