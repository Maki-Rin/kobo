'use client';

import { forwardRef, memo, useMemo } from 'react';

type Kind = 'h1' | 'h2' | 'h3' | 'code' | 'fence' | 'quote' | 'image' | 'text';

const kindStyles: Record<Kind, string> = {
  h1: 'bg-sky-100/80 shadow-[inset_3px_0_0_var(--color-sky-500)]',
  h2: 'bg-sky-100/80 shadow-[inset_3px_0_0_var(--color-sky-500)]',
  h3: 'bg-sky-50 shadow-[inset_3px_0_0_var(--color-sky-300)]',
  code: 'bg-stone-200/60',
  fence: 'bg-stone-200/90',
  quote: 'shadow-[inset_3px_0_0_var(--color-stone-300)]',
  image: 'bg-emerald-50',
  text: '',
};

export function classifyLines(value: string): Kind[] {
  let inCode = false;
  return value.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inCode = !inCode;
      return 'fence';
    }
    if (inCode) return 'code';
    const heading = line.match(/^(#{1,6})\s/);
    if (heading) return heading[1].length === 1 ? 'h1' : heading[1].length === 2 ? 'h2' : 'h3';
    if (/^\s*>/.test(line)) return 'quote';
    if (/^\s*!\[[^\]]*\]\([^)]*\)\s*$/.test(line)) return 'image';
    return 'text';
  });
}

const EditorBackdrop = memo(
  forwardRef<HTMLDivElement, { value: string; caretLine: number; numbers: boolean; className: string; rightInset: number }>(
    function EditorBackdrop({ value, caretLine, numbers, className, rightInset }, ref) {
      const lines = useMemo(() => value.split('\n'), [value]);
      const kinds = useMemo(() => classifyLines(value), [value]);
      return (
        <div aria-hidden='true' className='pointer-events-none absolute inset-0 overflow-hidden'>
          <div ref={ref} className={className} style={{ marginRight: rightInset }}>
            {lines.map((line, index) => (
              <div
                key={index}
                className={`relative -mx-2 whitespace-pre-wrap break-words rounded-[3px] px-2 ${kindStyles[kinds[index]]} ${
                  index + 1 === caretLine && kinds[index] === 'text' ? 'bg-stone-100' : ''
                }`}
              >
                {numbers && (
                  <span className='absolute right-full top-0 mr-3 select-none text-right text-xs leading-[1.7rem] tabular-nums text-stone-400'>
                    {index + 1}
                  </span>
                )}
                <span className='text-transparent'>{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  )
);

export default EditorBackdrop;
