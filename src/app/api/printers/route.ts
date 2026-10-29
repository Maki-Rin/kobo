import { getPublicPrinters } from '@/lib/printers-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await getPublicPrinters();
  return Response.json(result, {
    status: result.data === null ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST() {
  return Response.json(
    { error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}
