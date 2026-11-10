import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { publications } from '@/db/schema';
import { identity, json, isSameOrigin, publicationDocument } from '@/lib/server';
import { validatePortfolio } from '@/lib/model';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Недопустимый источник запроса.' }, 403);
  const user = await identity(); if (!user) return json({ error: 'Войдите в аккаунт.' }, 401);
  try {
    const text = await request.text(); if (text.length > 2_000_000) return json({ error: 'Слишком большой документ.' }, 413);
    const input = JSON.parse(text); const p = publicationDocument(validatePortfolio(input.portfolio));
    if (!p.name.trim() || !p.works.length) return json({ error: 'Укажите имя в профиле и добавьте хотя бы одну работу с видимостью «В портфолио».' }, 400);
    const slug = String(input.slug || '').toLowerCase();
    if (!/^[a-z][a-z0-9-]{2,49}$/.test(slug) || slug.endsWith('-') || slug.includes('--')) return json({ error: 'Адрес: 3–50 латинских букв, цифр и одиночных дефисов. Начните с буквы.' }, 400);
    const db = getDb(); const existing = await db.select().from(publications).where(eq(publications.slug, slug)).get();
    if (existing && existing.userId !== user.userId) return json({ error: 'Этот адрес уже занят. Выберите другой.' }, 409);
    const now = new Date().toISOString();
    await db.insert(publications).values({ userId: user.userId, slug, document: JSON.stringify(p), active: 1, publishedAt: now }).onConflictDoUpdate({ target: publications.userId, set: { slug, document: JSON.stringify(p), active: 1, publishedAt: now } });
    return json({ slug, active: 1, publishedAt: now, path: `/p/${slug}` });
  } catch (e) { console.error('portfolio.publish',e); return json({ error: 'Не удалось опубликовать. Проверьте данные и попробуйте снова.' }, 503); }
}
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Недопустимый источник запроса.' }, 403);
  const user = await identity(); if (!user) return json({ error: 'Войдите в аккаунт.' }, 401);
  await getDb().update(publications).set({ active: 0 }).where(eq(publications.userId,user.userId));
  return json({ ok: true });
}
