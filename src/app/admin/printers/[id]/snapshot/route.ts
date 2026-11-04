import { currentUser } from '@/lib/editor/auth';
import { getPrinterSnapshot } from '@/lib/printer-admin';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await currentUser())) return new Response(null, { status: 401 });
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) return new Response(null, { status: 404 });
  const image = await getPrinterSnapshot(id).catch(() => null);
  if (image === null) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(image, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
