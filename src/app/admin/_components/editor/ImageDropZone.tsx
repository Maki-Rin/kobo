'use client';

import { useRef, useState } from 'react';
import { imageFiles } from './prepareImage';

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export default function ImageDropZone({
  onFiles,
  children,
  className = '',
  label,
}: {
  onFiles: (files: File[]) => void;
  children?: React.ReactNode;
  className?: string;
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      role='button'
      tabIndex={0}
      aria-label={label}
      onClick={() => input.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        onFiles(imageFiles(event.dataTransfer.files));
      }}
      className={`cursor-pointer rounded-lg border-2 border-dashed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
        over ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-500 hover:bg-slate-50'
      } ${className}`}
    >
      {children}
      <input
        ref={input}
        type='file'
        accept={IMAGE_ACCEPT}
        className='hidden'
        onChange={(event) => {
          onFiles(imageFiles(event.target.files));
          event.target.value = '';
        }}
      />
    </div>
  );
}
