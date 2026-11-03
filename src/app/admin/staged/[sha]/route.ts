import { currentUser } from '@/lib/editor/auth';
import { getStore } from '@/lib/editor/store';
import { detectImageType } from '@/lib/image-type';

export async function GET(_request: Request, { params }: { params: Promise<{ sha: string }> }) {
  if (!(await currentUser())) return new Response('Unauthorized', { status: 401 });
  const { sha } = await params;
  const data = await getStore().staged(sha);
  const type = data && detectImageType(data);
  if (!data || !type) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': type === 'jpg' ? 'image/jpeg' : `image/${type}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
