import Image from 'next/image';
import Link from 'next/link';
import type { Entry } from '@/lib/content-schema';
import { excerptOf } from '@/lib/content';
import { formatEventDate } from '@/lib/event-format';
import { peopleNames } from '@/lib/people';
import { StatusBadge, TypeBadge } from './Labels';

function Cover({ src, alt, ratio = 'aspect-video', position = '' }: { src: string; alt: string; ratio?: string; position?: string }) {
  return (
    <div className={`relative ${ratio} overflow-hidden border-b-2 border-ink bg-off`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes='(min-width: 768px) 33vw, 100vw' className={`object-cover ${position}`} />
      ) : (
        <div className='flex size-full items-center justify-center text-sm text-muted'>画像なし</div>
      )}
    </div>
  );
}

export function ArticleCard({ entry }: { entry: Entry }) {
  return (
    <Link href={`/articles/${entry.id}`} className='pop-card flex flex-col'>
      <Cover src={entry.coverImage} alt={entry.title} />
      <div className='flex flex-1 flex-col gap-2 px-4 pb-4 pt-3'>
        <div className='flex items-center gap-2'>
          <TypeBadge type={entry.type} />
          <span className='text-xs font-semibold text-muted'>{entry.date}</span>
        </div>
        <h3 className='text-[17px] font-bold leading-snug'>{entry.title}</h3>
        <p className='line-clamp-2 text-sm leading-6 text-muted'>{excerptOf(entry)}</p>
      </div>
    </Link>
  );
}

export function WorkCard({ entry }: { entry: Entry }) {
  return (
    <Link href={`/works/${entry.id}`} className='pop-card'>
      <Cover src={entry.coverImage} alt={entry.title} ratio='aspect-square' />
      <div className='space-y-1 px-3 pb-3 pt-2.5'>
        <div className='flex items-center gap-2'>
          <h3 className='min-w-0 flex-1 truncate font-bold'>{entry.title}</h3>
          {entry.status === 'wip' && <StatusBadge status='wip' />}
        </div>
        <p className='truncate text-xs font-semibold text-muted'>{peopleNames(entry.authors, entry.legacyAuthor)}</p>
      </div>
    </Link>
  );
}

export function EventCard({ entry, past }: { entry: Entry; past: boolean }) {
  return (
    <Link href={`/events/${entry.id}`} className='pop-card flex flex-col'>
      <Cover src={entry.coverImage} alt={entry.title} ratio='aspect-[4/3]' position='object-top' />
      <div className='flex flex-1 flex-col gap-2 px-4 pb-4 pt-3'>
        <div>
          {past ? (
            <span className={`pop-chip ${entry.record ? 'bg-free' : 'bg-off'}`}>{entry.record ? '記録あり' : '開催済み'}</span>
          ) : (
            <span className='pop-chip bg-accent'>開催予定</span>
          )}
        </div>
        <h3 className='text-[17px] font-bold leading-snug'>{entry.title}</h3>
        <p className='text-sm font-semibold'>{formatEventDate(entry)}</p>
        {entry.place && <p className='text-sm text-muted'>{entry.place}</p>}
      </div>
    </Link>
  );
}
