import { currentUser } from '@/lib/editor/auth';
import { getStore } from '@/lib/editor/store';

const types: [number[], string][] = [
  [[0xff, 0xd8, 0xff], 'image/jpeg'],
  [[0x89, 0x50, 0x4e, 0x47], 'image/png'],
  [[0x47, 0x49, 0x46, 0x38], 'image/gif'],
  [[0x52, 0x49, 0x46, 0x46], 'image/webp'],
];

export async function GET(_request: Request, { params }: { params: Promise<{ sha: string }> }) {
  if (!(await currentUser())) return new Response('Unauthorized', { status: 401 });
  const { sha } = await params;
  const data = await getStore().staged(sha);
  const type = data && types.find(([magic]) => magic.every((byte, i) => data[i] === byte))?.[1];
  if (!data || !type) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
