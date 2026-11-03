export default function AdminLoading() {
  return (
    <div role='status' className='space-y-4' aria-live='polite'>
      <p className='text-sm text-slate-500'>読み込み中…</p>
      <div aria-hidden='true' className='animate-pulse space-y-3'>
        <div className='h-7 w-36 rounded bg-slate-200' />
        <div className='h-32 rounded-lg bg-slate-100' />
      </div>
    </div>
  );
}
