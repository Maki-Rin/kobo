import Link from 'next/link';
import { articleTypeLabels, workStatusLabels, type ArticleType, type WorkStatus } from '@/lib/content-schema';
import { machineName } from '@/lib/content';

const typeStyles: Record<ArticleType, string> = {
  guide: 'bg-busy',
  tech: 'bg-wait',
};

export function TypeBadge({ type }: { type: ArticleType }) {
  return <span className={`pop-chip ${typeStyles[type]}`}>{articleTypeLabels[type]}</span>;
}

export function StatusBadge({ status }: { status: WorkStatus }) {
  return <span className={`pop-chip ${status === 'done' ? 'bg-free' : 'bg-wait'}`}>{workStatusLabels[status]}</span>;
}

export function MachineTags({ machines, basePath }: { machines: string[]; basePath?: string }) {
  if (machines.length === 0) return null;
  return (
    <ul className='flex flex-wrap gap-1.5'>
      {machines.map((slug) => (
        <li key={slug}>
          {basePath ? (
            <Link href={`${basePath}?machine=${slug}`} className='pop-chip hover:bg-cream'>
              {machineName(slug)}
            </Link>
          ) : (
            <span className='pop-chip'>{machineName(slug)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function FilterChips({
  options,
  current,
  hrefFor,
}: {
  options: { value: string; label: string; count?: number }[];
  current: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <ul className='flex flex-wrap gap-2'>
      {options.map((option) => (
        <li key={option.value}>
          <Link
            href={hrefFor(option.value)}
            aria-current={current === option.value ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3.5 py-1.5 text-sm font-semibold transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop ${
              current === option.value ? 'bg-accent' : 'bg-paper'
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className='text-xs font-normal text-muted'>{option.count}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PageHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className='space-y-4'>
      <h1 className='text-3xl font-extrabold tracking-tight md:text-4xl'>
        <span className='marker'>{title}</span>
      </h1>
      {children}
    </div>
  );
}
