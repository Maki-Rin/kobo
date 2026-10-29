'use client';

import { useEffect, useMemo, useState } from 'react';
import WorkCard from '@/components/WorkCard';
import { getWorks, type Work } from '@/lib/works';

const PAGE_SIZE = 12;

export default function WorksGallery() {
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedTag, setSelectedTag] = useState('すべて');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getWorks()
      .then((data) => {
        if (active) setWorks(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const publishedWorks = useMemo(
    () => works.filter((work) => work.publicationStatus !== 'draft' && work.publicationStatus !== 'rejected'),
    [works],
  );
  const tags = useMemo(
    () => ['すべて', ...Array.from(new Set(publishedWorks.flatMap((work) => work.tags)))],
    [publishedWorks],
  );
  const filteredWorks = selectedTag === 'すべて'
    ? publishedWorks
    : publishedWorks.filter((work) => work.tags.includes(selectedTag));
  const visibleWorks = filteredWorks.slice(0, visibleCount);

  if (loading) return <p className='py-16 text-sm text-neutral-500'>作例を読み込んでいます。</p>;

  return (
    <>
      {tags.length > 2 && (
        <div className='mb-9 flex flex-wrap gap-2' aria-label='機材で絞り込む'>
          {tags.map((tag) => (
            <button
              key={tag}
              type='button'
              onClick={() => {
                setSelectedTag(tag);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                selectedTag === tag
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {visibleWorks.length > 0 ? (
        <div className='grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3'>
          {visibleWorks.map((work) => <WorkCard key={work.id} work={work} />)}
        </div>
      ) : (
        <p className='py-16 text-sm text-neutral-500'>該当する作例はまだありません。</p>
      )}

      {visibleCount < filteredWorks.length && (
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
