'use client';

import { Children, useState } from 'react';

const PAGE_SIZE = 12;

export default function WorksGallery({ children }: { children: React.ReactNode }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const items = Children.toArray(children);

  return (
    <>
      <div className='grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3'>{items.slice(0, visibleCount)}</div>
      {visibleCount < items.length && (
        <div className='mt-12 text-center'>
          <button
            type='button'
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className='rounded-md border border-neutral-300 px-6 py-3 text-sm font-semibold hover:border-neutral-600'
          >
            さらに作例を表示
          </button>
        </div>
      )}
    </>
  );
}
