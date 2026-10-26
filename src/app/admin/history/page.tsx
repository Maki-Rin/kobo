import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/editor/auth';
import { getStore } from '@/lib/editor/store';
import RevertButton from '../_components/RevertButton';

const formatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function HistoryPage() {
  const user = await currentUser();
  if (!user) redirect('/admin');
  const history = await getStore().history(30);
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>変更履歴</h1>
        <p className='mt-2 text-sm text-slate-600'>
          記事の変更の記録です（新しい順に30件）。「戻す」と、その変更の前の状態に戻す変更が新しく記録されます。
          {user.role === 'editor' && '自分の変更だけ戻せます。'}
        </p>
      </div>
      <ul className='divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white'>
        {history.map((entry) => (
          <li key={entry.id} className='flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3'>
            <div className='min-w-0 flex-1'>
              <p className='font-medium'>{entry.title}</p>
              <p className='text-sm text-slate-500'>
                {formatter.format(new Date(entry.at))}・{entry.authorName}
                {!entry.editorId && '（開発者）'}
              </p>
            </div>
            {(user.role !== 'editor' || entry.editorId === user.id) && (
              <RevertButton commitId={entry.id} />
            )}
          </li>
        ))}
        {history.length === 0 && <li className='px-4 py-3 text-slate-500'>まだ記録がありません</li>}
      </ul>
    </div>
  );
}
