'use client';

import { useState } from 'react';
import type { ActionResult } from '../actions';
import ErrorList from './ErrorList';

export default function LinkButton({
  label,
  note,
  create,
}: {
  label: string;
  note: string;
  create: () => Promise<ActionResult<string>>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setErrors([]);
    const result = await create();
    if (!result.ok) return setErrors(result.errors);
    setUrl(result.value);
    setCopied(false);
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <div className='space-y-2'>
      <button
        type='button'
        onClick={run}
        className='rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100'
      >
        {label}
      </button>
      <ErrorList errors={errors} />
      {url && (
        <div className='space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm'>
          <p>{note}</p>
          <div className='flex gap-2'>
            <input readOnly value={url} className='min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs' />
            <button type='button' onClick={copy} className='rounded bg-slate-900 px-3 py-1 text-white'>
              {copied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
