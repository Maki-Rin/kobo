'use client';

import { useRef, useState, type ComponentProps } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

const icons: Record<CopyState, React.ReactNode> = {
  idle: (
    <>
      <rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
      <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
    </>
  ),
  copied: <polyline points='20 6 9 17 4 12' />,
  failed: (
    <>
      <line x1='18' y1='6' x2='6' y2='18' />
      <line x1='6' y1='6' x2='18' y2='18' />
    </>
  ),
};

const buttonStyles: Record<CopyState, string> = {
  idle: 'bg-white/20 hover:bg-white/30',
  copied: 'bg-green-500/70',
  failed: 'bg-red-500/70',
};

export default function CodeBlock({
  'data-language': language,
  className,
  ...props
}: ComponentProps<'pre'> & { 'data-language'?: string }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [state, setState] = useState<CopyState>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(preRef.current?.textContent ?? '');
      setState('copied');
    } catch {
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 2000);
  };

  return (
    <div className='code-block'>
      {language && <span className='code-block-language'>{language}</span>}
      <button
        type='button'
        onClick={copy}
        aria-label='コードをコピー'
        className={`code-block-copy ${buttonStyles[state]}`}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='16'
          height='16'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
        >
          {icons[state]}
        </svg>
      </button>
      <pre ref={preRef} className={className} {...props} />
    </div>
  );
}
