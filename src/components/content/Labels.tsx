import Link from 'next/link';
import { articleTypeLabels, workStatusLabels, type ArticleType, type WorkStatus } from '@/lib/content-schema';
import { machineName } from '@/lib/content';

const typeStyles: Record<ArticleType, string> = {
  guide: 'bg-sky-100 text-sky-900',
  tech: 'bg-violet-100 text-violet-900',
};

export function TypeBadge({ type }: { type: ArticleType }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${typeStyles[type]}`}>{articleTypeLabels[type]}</span>;
}

export function StatusBadge({ status }: { status: WorkStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status === 'done' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
      {workStatusLabels[status]}
    </span>
  );
}

export function MachineTags({ machines, basePath }: { machines: string[]; basePath?: string }) {
  if (machines.length === 0) return null;
  return (
    <ul className='flex flex-wrap gap-1.5'>
      {machines.map((slug) => (
        <li key={slug}>
          {basePath ? (
            <Link href={`${basePath}?machine=${slug}`} className='rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-700 hover:bg-gray-100'>
              {machineName(slug)}
            </Link>
          ) : (
            <span className='rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-700'>{machineName(slug)}</span>
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
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${
              current === option.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className='text-xs opacity-70'>{option.count}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
