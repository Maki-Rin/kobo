'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { revertAction } from '../actions';
import ErrorList from './ErrorList';
import { button } from './ui';

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
    <div className='flex flex-col items-end gap-2'>
      {stage === 'confirm' ? (
        <div className='flex gap-2'>
          <button onClick={() => setStage('idle')} className={button('secondary', 'sm')}>
            やめる
          </button>
          <button onClick={run} className={button('danger', 'sm')}>
            戻す
          </button>
        </div>
      ) : (
        <button onClick={() => setStage('confirm')} disabled={stage === 'busy'} className={button('secondary', 'sm')}>
          {stage === 'busy' ? '戻しています…' : 'この変更を戻す'}
        </button>
      )}
      <ErrorList errors={errors} />
    </div>
  );
}
