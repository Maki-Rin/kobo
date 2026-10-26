type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700',
  secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerOutline: 'border border-red-300 bg-white text-red-700 hover:bg-red-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-base',
};

export function button(variant: Variant = 'secondary', size: Size = 'md'): string {
  return `inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]}`;
}

export const input =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10';

export const textarea =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10';

export const card = 'rounded-lg border border-slate-200 bg-white';

export const badge = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

export const pageTitle = 'text-xl font-bold';

export const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic UI", Meiryo, system-ui, sans-serif';

export const select =
  'h-9 rounded-md border border-slate-300 bg-white pl-3 pr-8 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10';
