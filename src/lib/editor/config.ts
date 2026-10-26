export interface EditorConfig {
  origin: string;
  rpID: string;
}

export function editorConfig(): EditorConfig {
  const origin =
    process.env.EDITOR_ORIGIN ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';
  return {
    origin,
    rpID: process.env.EDITOR_RP_ID ?? new URL(origin).hostname,
  };
}

export const CONTENT_BRANCH = process.env.EDITOR_GITHUB_BRANCH ?? 'main';
