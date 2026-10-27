import Image from 'next/image';
import Link from 'next/link';
import type { Entry } from '@/lib/content-schema';
import { excerptOf } from '@/lib/content';
import { peopleNames } from '@/lib/people';
import { formatEventDate } from '@/lib/event-format';
import { MachineTags, StatusBadge, TypeBadge } from './Labels';

function Cover({ src, alt, ratio = 'aspect-video', position = '' }: { src: string; alt: string; ratio?: string; position?: string }) {
  return (
    <div className={`relative ${ratio} overflow-hidden bg-gray-100`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes='(min-width: 768px) 33vw, 100vw' className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] ${position}`} />
      ) : (
        <div className='flex size-full items-center justify-center text-sm text-gray-400'>画像なし</div>
      )}
    </div>
  );
}

export function ArticleCard({ entry }: { entry: Entry }) {
  return (
    <Link href={`/articles/${entry.id}`} className='group flex flex-col overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg'>
      <Cover src={entry.coverImage} alt={entry.title} />
      <div className='flex flex-1 flex-col gap-3 p-5'>
        <div className='flex items-center gap-2'>
          <TypeBadge type={entry.type} />
          <span className='text-xs text-gray-500'>{entry.date}</span>
        </div>
        <h3 className='text-lg font-bold leading-snug text-gray-900'>{entry.title}</h3>
        <p className='line-clamp-2 text-sm leading-6 text-gray-600'>{excerptOf(entry)}</p>
        <div className='mt-auto'>
          <MachineTags machines={entry.machines} />
        </div>
      </div>
    </Link>
  );
}

export function WorkCard({ entry }: { entry: Entry }) {
  return (
    <Link href={`/works/${entry.id}`} className='group block overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg'>
      <Cover src={entry.coverImage} alt={entry.title} ratio='aspect-square' />
      <div className='space-y-2 p-4'>
        <div className='flex items-center gap-2'>
          <h3 className='min-w-0 flex-1 truncate font-bold text-gray-900'>{entry.title}</h3>
          {entry.status === 'wip' && <StatusBadge status='wip' />}
        </div>
        <p className='text-xs text-gray-500'>{peopleNames(entry.authors, entry.legacyAuthor)}</p>
        <MachineTags machines={entry.machines} />
      </div>
    </Link>
  );
}

export function EventCard({ entry, past }: { entry: Entry; past: boolean }) {
  return (
    <Link href={`/events/${entry.id}`} className='group flex flex-col overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg'>
      <Cover src={entry.coverImage} alt={entry.title} ratio='aspect-[4/3]' position='object-top' />
      <div className='flex flex-1 flex-col gap-2 p-5'>
        <div className='flex flex-wrap items-center gap-2'>
          {past ? (
            entry.record ? (
              <span className='rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900'>開催記録あり</span>
            ) : (
              <span className='rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600'>開催済み</span>
            )
          ) : (
            <span className='rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900'>開催予定</span>
          )}
        </div>
        <h3 className='text-lg font-bold leading-snug text-gray-900'>{entry.title}</h3>
        <p className='text-sm text-gray-700'>{formatEventDate(entry)}</p>
        {entry.place && <p className='text-sm text-gray-500'>{entry.place}</p>}
      </div>
    </Link>
  );
}
