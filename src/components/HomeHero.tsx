'use client';

import { useEffect, useState } from 'react';
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

export default function HomeHero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % heroImages.length), 4000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className='relative h-96 overflow-hidden'>
      {heroImages.map((image, index) => (
        <div
          key={image}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image src={image} alt='' fill className='object-cover' priority={index === 0} sizes='100vw' />
        </div>
      ))}
      <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
        <h2 className='text-4xl font-bold text-white md:text-6xl'>{"Let's Fab!!"}</h2>
      </div>
      <div className='absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2'>
        {heroImages.map((image, index) => (
          <button
            key={image}
            type='button'
            aria-label={`${index + 1}枚目の写真`}
            onClick={() => setCurrent(index)}
            className={`size-3 rounded-full transition-colors ${index === current ? 'bg-white' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </section>
  );
}
