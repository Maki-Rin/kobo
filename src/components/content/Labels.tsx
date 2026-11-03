import Link from 'next/link';
import { articleTypeLabels, workStatusLabels, type ArticleType, type WorkStatus } from '@/lib/content-schema';
import { machineName } from '@/lib/content';

const typeStyles: Record<ArticleType, string> = {
  guide: 'bg-blue-50 text-blue-700',
  tech: 'bg-violet-50 text-violet-700',
};

const machineStyles: Record<string, string> = {
  '3d-printer': 'bg-blue-50 text-blue-700',
  'laser-cutter': 'bg-rose-50 text-rose-700',
  embroidery: 'bg-amber-50 text-amber-800',
};

export function Tag({ className = 'bg-neutral-100 text-neutral-700', children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

export function TypeBadge({ type }: { type: ArticleType }) {
  return <Tag className={typeStyles[type]}>{articleTypeLabels[type]}</Tag>;
}

export function StatusBadge({ status }: { status: WorkStatus }) {
  return (
    <Tag className={status === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}>{workStatusLabels[status]}</Tag>
  );
}

export function MachineTags({ machines, basePath }: { machines: string[]; basePath?: string }) {
  if (machines.length === 0) return null;
  return (
    <ul className='flex flex-wrap gap-2'>
      {machines.map((slug) => {
        const style = machineStyles[slug] ?? 'bg-emerald-50 text-emerald-700';
        return (
          <li key={slug}>
            {basePath ? (
              <Link href={`${basePath}?machine=${slug}`} className='hover:opacity-80'>
                <Tag className={style}>{machineName(slug)}</Tag>
              </Link>
            ) : (
              <Tag className={style}>{machineName(slug)}</Tag>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function FilterChips({
  options,
  current,
  hrefFor,
  label,
}: {
  options: { value: string; label: string; count?: number }[];
  current: string;
  hrefFor: (value: string) => string;
  label?: string;
}) {
  return (
    <ul className='flex flex-wrap gap-2' aria-label={label}>
      {options.map((option) => (
        <li key={option.value}>
          <Link
            href={hrefFor(option.value)}
            aria-current={current === option.value ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              current === option.value
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={`text-xs ${current === option.value ? 'text-white/70' : 'text-neutral-500'}`}>{option.count}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PageHeading({ title, aside, children }: { title: string; aside?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className='mb-10 space-y-4 border-b border-neutral-200 pb-6'>
      <div className='flex items-end justify-between gap-4'>
        <h1 className='text-3xl font-bold md:text-4xl'>{title}</h1>
        {aside}
      </div>
      {children}
    </div>
  );
}

export function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className='mb-7 flex items-end justify-between border-b border-neutral-200 pb-3'>
      <h2 className='text-2xl font-bold'>{title}</h2>
      {href && linkLabel && (
        <Link href={href} className='shrink-0 text-sm text-neutral-600 underline underline-offset-4'>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className='rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-6 py-8 text-sm text-neutral-500'>{children}</p>;
}
