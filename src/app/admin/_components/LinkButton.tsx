'use client';

import { useState } from 'react';
import type { ActionResult } from '../actions';
import ErrorList from './ErrorList';
import { button, input } from './ui';

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
    <div className='space-y-3'>
      <button type='button' onClick={run} className={button('secondary', 'sm')}>
        {label}
      </button>
      <ErrorList errors={errors} />
      {url && (
        <div className='space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3.5'>
          <p className='text-sm text-amber-950'>{note}</p>
          <div className='flex gap-2'>
            <input readOnly value={url} className={`${input} font-mono text-xs`} onFocus={(e) => e.target.select()} />
            <button type='button' onClick={copy} className={button('primary')}>
              {copied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
