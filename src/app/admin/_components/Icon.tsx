const paths = {
  articles: (
    <>
      <path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' />
      <path d='M14 2v4a2 2 0 0 0 2 2h4' />
      <path d='M10 9H8' />
      <path d='M16 13H8' />
      <path d='M16 17H8' />
    </>
  ),
  history: (
    <>
      <path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' />
      <path d='M3 3v5h5' />
      <path d='M12 7v5l4 2' />
    </>
  ),
  members: (
    <>
      <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
      <circle cx='9' cy='7' r='4' />
      <path d='M22 21v-2a4 4 0 0 0-3-3.87' />
      <path d='M16 3.13a4 4 0 0 1 0 7.75' />
    </>
  ),
  people: (
    <>
      <path d='M11.5 15H7a4 4 0 0 0-4 4v2' />
      <path d='M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z' />
      <circle cx='10' cy='7' r='4' />
    </>
  ),
  account: (
    <>
      <circle cx='12' cy='8' r='5' />
      <path d='M20 21a8 8 0 0 0-16 0' />
    </>
  ),
  external: (
    <>
      <path d='M15 3h6v6' />
      <path d='M10 14 21 3' />
      <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
    </>
  ),
  search: (
    <>
      <circle cx='11' cy='11' r='8' />
      <path d='m21 21-4.3-4.3' />
    </>
  ),
  plus: (
    <>
      <path d='M5 12h14' />
      <path d='M12 5v14' />
    </>
  ),
  pencil: (
    <>
      <path d='M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z' />
    </>
  ),
  key: (
    <>
      <path d='M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z' />
      <circle cx='16.5' cy='7.5' r='.5' fill='currentColor' />
    </>
  ),
  printer: (
    <>
      <path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' />
      <path d='M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6' />
      <rect x='6' y='14' width='12' height='8' rx='1' />
    </>
  ),
  camera: (
    <>
      <path d='M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z' />
      <circle cx='12' cy='13' r='3' />
    </>
  ),
  cameraOff: (
    <>
      <path d='M2 2l20 20' />
      <path d='M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16' />
      <path d='M9.5 4h5L17 7h3a2 2 0 0 1 2 2v7.5' />
      <path d='M14.121 15.121A3 3 0 1 1 9.88 10.88' />
    </>
  ),
  lamp: (
    <>
      <path d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5' />
      <path d='M9 18h6' />
      <path d='M10 22h4' />
    </>
  ),
  pause: (
    <>
      <rect x='14' y='4' width='4' height='16' rx='1' />
      <rect x='6' y='4' width='4' height='16' rx='1' />
    </>
  ),
  play: <path d='M6 3l14 9-14 9z' />,
  stop: <rect x='5' y='5' width='14' height='14' rx='2' />,
  image: (
    <>
      <rect width='18' height='18' x='3' y='3' rx='2' />
      <circle cx='9' cy='9' r='2' />
      <path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' />
    </>
  ),
};

export type IconName = keyof typeof paths;

export default function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
