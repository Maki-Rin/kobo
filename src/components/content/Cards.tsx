import Image from 'next/image';
import Link from 'next/link';
import type { Entry } from '@/lib/content-schema';
import { excerptOf } from '@/lib/content';
import { formatEventDate } from '@/lib/event-format';
import { peopleNames, resolvePeople } from '@/lib/people';
import { MachineTags, StatusBadge, Tag, TypeBadge } from './Labels';

function Cover({ src, alt, className, sizes, position = '' }: { src: string; alt: string; className: string; sizes: string; position?: string }) {
  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className={`object-cover transition-transform duration-300 group-hover:scale-[1.015] ${position}`} />
      ) : (
        <div className='flex size-full items-center justify-center text-sm text-neutral-400'>画像なし</div>
      )}
    </div>
  );
}

export function ArticleCard({ entry, featured = false }: { entry: Entry; featured?: boolean }) {
  return (
    <Link href={`/articles/${entry.id}`} className={`group block ${featured ? 'md:grid md:grid-cols-[0.9fr_1.1fr] md:gap-8' : ''}`}>
      <Cover
        src={entry.coverImage}
        alt=''
        className={`rounded-lg ${featured ? 'aspect-[16/10]' : 'aspect-video'}`}
        sizes={featured ? '(min-width: 768px) 45vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
      />
      <div className={featured ? 'pt-5 md:pt-2' : 'pt-4'}>
        <div className='flex items-center gap-3 text-xs text-neutral-500'>
          <TypeBadge type={entry.type} />
          <time dateTime={entry.date}>{entry.date}</time>
        </div>
        <h3 className={`${featured ? 'mt-3 text-2xl' : 'mt-2 text-lg'} font-bold leading-snug`}>{entry.title}</h3>
        {excerptOf(entry) && <p className='mt-3 line-clamp-3 text-sm leading-6 text-neutral-600'>{excerptOf(entry)}</p>}
      </div>
    </Link>
  );
}

export function ArticleRow({ entry }: { entry: Entry }) {
  const author = resolvePeople(entry.authors)[0];
  const authorName = peopleNames(entry.authors, entry.legacyAuthor);
  return (
    <Link href={`/articles/${entry.id}`} className='group block border-b border-neutral-200 py-7'>
      <article className='grid gap-5 sm:grid-cols-[13rem_1fr]'>
        <Cover src={entry.coverImage} alt={entry.title} className='aspect-[4/3] rounded-lg sm:aspect-auto sm:min-h-40' sizes='(min-width: 640px) 13rem, 100vw' />
        <div className='flex min-w-0 flex-col justify-between py-1'>
          <div>
            <div className='mb-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500'>
              <TypeBadge type={entry.type} />
              <span>{entry.date}</span>
            </div>
            <h3 className='text-xl font-bold leading-7 group-hover:underline group-hover:underline-offset-4 md:text-2xl'>{entry.title}</h3>
            <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>{excerptOf(entry)}</p>
          </div>
          {authorName && (
            <div className='mt-5 flex items-center text-xs text-neutral-500'>
              {author?.avatar ? (
                <Image src={author.avatar} alt='' width={24} height={24} className='mr-2 rounded-full' />
              ) : (
                <span className='mr-2 size-6 rounded-full bg-neutral-300' />
              )}
              <span>{authorName}</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

export function WorkCard({ entry }: { entry: Entry }) {
  const author = resolvePeople(entry.authors)[0];
  const authorName = peopleNames(entry.authors, entry.legacyAuthor) || 'KOBO Team';
  return (
    <Link
      href={`/works/${entry.id}`}
      className='group block h-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5'
    >
      <Cover src={entry.coverImage} alt={entry.title} className='aspect-video' sizes='(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw' />
      <div className='p-5'>
        <h3 className='mb-3 text-lg font-bold leading-snug'>{entry.title}</h3>
        {(entry.machines.length > 0 || entry.status === 'wip') && (
          <div className='mb-3 flex flex-wrap gap-2'>
            {entry.status === 'wip' && <StatusBadge status='wip' />}
            <MachineTags machines={entry.machines} />
          </div>
        )}
        <div className='flex items-center'>
          {author?.avatar ? (
            <Image src={author.avatar} alt='' width={24} height={24} className='mr-2 rounded-full' />
          ) : (
            <span className='mr-2 size-6 rounded-full bg-neutral-300' />
          )}
          <span className='text-sm text-neutral-600'>{authorName}</span>
        </div>
      </div>
    </Link>
  );
}

export function EventCard({ entry, past }: { entry: Entry; past: boolean }) {
  return (
    <Link
      href={`/events/${entry.id}`}
      className='group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5'
    >
      <Cover src={entry.coverImage} alt={entry.title} className='aspect-[4/3]' sizes='(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw' position='object-top' />
      <div className='flex flex-1 flex-col gap-2 p-4'>
        <div>
          {past ? (
            <Tag className={entry.record ? 'bg-amber-50 text-amber-800' : 'bg-neutral-100 text-neutral-600'}>{entry.record ? '開催報告' : '開催済み'}</Tag>
          ) : (
            <Tag className='bg-blue-50 text-blue-700'>開催予定</Tag>
          )}
        </div>
        <h3 className='text-lg font-bold leading-snug'>{entry.title}</h3>
        <p className='technical-type text-sm text-neutral-600'>{formatEventDate(entry)}</p>
        {entry.place && <p className='text-sm text-neutral-500'>{entry.place}</p>}
      </div>
    </Link>
  );
}
