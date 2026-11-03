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
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % heroImages.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className='relative h-[440px] overflow-hidden border-b-2 border-ink md:h-[400px]'>
      {heroImages.map((image, index) => (
        <div
          key={image}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image src={image} alt='' fill className='object-cover' priority={index === 0} sizes='100vw' />
        </div>
      ))}
      <div className='absolute inset-x-4 bottom-16 md:inset-x-auto md:bottom-20 md:left-[max(2rem,calc((100%-72rem)/2+2rem))]'>
        <div className='max-w-md rounded-xl border-2 border-ink bg-paper px-5 py-4 shadow-pop md:px-6 md:py-5'>
          <h1 className='text-5xl font-extrabold leading-none tracking-tight md:text-6xl'>{"Let's Fab!!"}</h1>
          <p className='mt-3 text-[15px] leading-7'>
            3Dプリンターもレーザーカッターも、使い方はここにまとめてます。わからなかったらスタッフに声かけてね。
          </p>
        </div>
      </div>
      <div className='absolute bottom-5 right-4 flex gap-1.5 md:right-8'>
        {heroImages.map((image, index) => (
          <button
            key={image}
            type='button'
            aria-label={`${index + 1}枚目の写真`}
            onClick={() => setCurrent(index)}
            className={`size-2.5 rounded-full border border-ink transition-colors ${index === current ? 'bg-primary' : 'bg-paper'}`}
          />
        ))}
      </div>
    </section>
  );
}
