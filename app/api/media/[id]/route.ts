import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { media, publications } from '@/db/schema';
import { identity, mediaReferences } from '@/lib/server';
import { validatePortfolio } from '@/lib/model';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id) || !env.BUCKET) return new Response('Not found',{ status:404 });
  const db = getDb(); const file = await db.select().from(media).where(eq(media.id,id)).get();
  if (!file) return new Response('Not found',{ status:404 });
  const user = await identity();
  if (user?.userId !== file.userId) {
    const pub = await db.select().from(publications).where(eq(publications.userId,file.userId)).get();
    if (!pub || !pub.active || !mediaReferences(validatePortfolio(JSON.parse(pub.document))).has(id)) return new Response('Not found',{ status:404 });
  }
  const object = await env.BUCKET.get(file.objectKey, { range: request.headers });
  if (!object) return new Response('Not found',{ status:404 });
  const headers = new Headers({ 'Content-Type':file.contentType,'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=0, must-revalidate','Accept-Ranges':'bytes', 'ETag': object.httpEtag });
  let status = 200;
  if (object.range && 'offset' in object.range && object.range.offset !== undefined) { status = 206; const start = object.range.offset; const length = object.range.length ?? object.size - start; headers.set('Content-Range',`bytes ${start}-${start + length - 1}/${object.size}`); headers.set('Content-Length',String(length)); }
  else headers.set('Content-Length',String(object.size));
  return new Response(object.body, { headers, status });
}
