'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { revertAction } from '../actions';
import ErrorList from './ErrorList';

export default function RevertButton({ commitId }: { commitId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<'idle' | 'confirm' | 'busy'>('idle');
  const [errors, setErrors] = useState<string[]>([]);

  const run = async () => {
    setStage('busy');
    const result = await revertAction(commitId);
    setStage('idle');
    if (!result.ok) return setErrors(result.errors);
    setErrors([]);
    router.refresh();
  };

  return (
    <div className='space-y-2'>
      {stage === 'confirm' ? (
        <span className='flex gap-2'>
          <button onClick={run} className='rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700'>
            戻す
          </button>
          <button onClick={() => setStage('idle')} className='rounded border border-slate-300 px-3 py-1 text-sm'>
            やめる
          </button>
        </span>
      ) : (
        <button
          onClick={() => setStage('confirm')}
          disabled={stage === 'busy'}
          className='rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-50'
        >
          {stage === 'busy' ? '戻しています…' : 'この変更を戻す'}
        </button>
      )}
      <ErrorList errors={errors} />
    </div>
  );
}
