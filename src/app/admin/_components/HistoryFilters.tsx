'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { select } from './ui';

export default function HistoryFilters({
  articles,
  members,
}: {
  articles: { id: string; title: string }[];
  members: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/history${next.size ? `?${next}` : ''}`);
  };
  return (
    <div className='flex flex-wrap gap-3'>
      <select
        aria-label='記事・作品・イベントで絞り込む'
        value={params.get('entry') ?? ''}
        onChange={(e) => set('entry', e.target.value)}
        className={`${select} max-w-full`}
      >
        <option value=''>すべての記事・作品・イベント</option>
        {articles.map((article) => (
          <option key={article.id} value={article.id}>
            {article.title || article.id}
          </option>
        ))}
      </select>
      <select
        aria-label='人で絞り込む'
        value={params.get('user') ?? ''}
        onChange={(e) => set('user', e.target.value)}
        className={select}
      >
        <option value=''>すべての人</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
