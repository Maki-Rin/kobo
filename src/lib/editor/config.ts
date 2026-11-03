export interface EditorConfig {
  origin: string;
  rpID: string;
}

export function editorConfig(): EditorConfig {
  if (process.env.NODE_ENV === 'production' && !process.env.EDITOR_ORIGIN) {
    throw new Error('EDITOR_ORIGIN is required in production');
  }
  const origin =
    process.env.EDITOR_ORIGIN ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password ||
      (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost' && url.protocol === 'http:'))) {
    throw new Error('EDITOR_ORIGIN must be an exact HTTPS origin');
  }
  const rpID = process.env.EDITOR_RP_ID ?? url.hostname;
  if (rpID !== url.hostname) throw new Error('EDITOR_RP_ID must match EDITOR_ORIGIN hostname');
  return { origin, rpID };
}

export const CONTENT_BRANCH = process.env.EDITOR_GITHUB_BRANCH ?? 'main';
