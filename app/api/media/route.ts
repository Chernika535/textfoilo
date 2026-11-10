import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { media } from '@/db/schema';
import { identity, json, isSameOrigin } from '@/lib/server';
export const dynamic = 'force-dynamic';
const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']);
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Недопустимый источник запроса.' }, 403);
  const user = await identity(); if (!user) return json({ error: 'Сессия браузера недоступна. Обновите страницу.' }, 401);
  if (!env.BUCKET) return json({ error: 'Хранилище файлов недоступно.' }, 503);
  if (Number(request.headers.get('Content-Length')) > 21_000_000) return json({ error: 'Максимальный размер файла — 20 МБ.' }, 413);
  try {
    const data = await request.formData(); const file = data.get('file');
    if (!(file instanceof File) || !allowed.has(file.type)) return json({ error: 'Поддерживаются JPEG, PNG, WebP, GIF, MP4 и WebM.' }, 400);
    if (!file.size || file.size > 20_000_000) return json({ error: 'Файл пустой или превышает 20 МБ.' }, 413);
    const id = crypto.randomUUID(); const objectKey = `${user.userId}/${id}`;
    await env.BUCKET.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
    try { await getDb().insert(media).values({ id, userId: user.userId, objectKey, contentType: file.type, size: file.size, filename: file.name.slice(0,200), createdAt: new Date().toISOString() }); }
    catch(e) { await env.BUCKET.delete(objectKey); throw e; }
    return json({ id, url: `/api/media/${id}`, name: file.name, size: file.size });
  } catch(e) { console.error('media.upload',e); return json({ error: 'Не удалось загрузить файл. Попробуйте снова.' }, 503); }
}
