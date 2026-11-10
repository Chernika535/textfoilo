import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { portfolios, publications } from '@/db/schema';
import { identity, createGuest, json, emptyPortfolio, isSameOrigin } from '@/lib/server';
import { validatePortfolio } from '@/lib/model';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    let user=await identity();let cookie:string|undefined;
    if(!user){const session=await createGuest();user=session.user;cookie=session.cookie;}
    const db = getDb();
    const row = await db.select().from(portfolios).where(eq(portfolios.userId, user.userId)).get();
    const pub = await db.select({ slug: publications.slug, active: publications.active, publishedAt: publications.publishedAt }).from(publications).where(eq(publications.userId, user.userId)).get();
    const response=json({ portfolio: row ? validatePortfolio(JSON.parse(row.document)) : emptyPortfolio(user.fullName || '', user.email), revision: row?.revision || 0, updatedAt: row?.updatedAt || null, publication: pub || null, account: user.userId, guest:user.guest });
    if(cookie)response.headers.set('Set-Cookie',cookie);
    return response;
  } catch (e) { console.error('portfolio.load', e); return json({ error: 'Не удалось открыть портфолио. Повторите загрузку.' }, 503); }
}
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Недопустимый источник запроса.' }, 403);
  const user = await identity(); if (!user) return json({ error: 'Сессия браузера недоступна. Скачайте копию работ и обновите страницу.' }, 401);
  try {
    const text = await request.text(); if (text.length > 2_000_000) return json({ error: 'Портфолио превышает 2 МБ текста. Медиа загружайте отдельными файлами.' }, 413);
    const input = JSON.parse(text); const p = validatePortfolio(input.portfolio);
    if (!Number.isSafeInteger(input.revision) || input.revision < 0) return json({ error: 'Неверная версия документа.' }, 400);
    const db = getDb(); const now = new Date().toISOString();
    let saved;
    if (input.revision === 0) saved = await db.insert(portfolios).values({ userId: user.userId, document: JSON.stringify(p), revision: 1, updatedAt: now }).onConflictDoNothing().returning({ revision: portfolios.revision }).get();
    else saved = await db.update(portfolios).set({ document: JSON.stringify(p), revision: input.revision + 1, updatedAt: now }).where(and(eq(portfolios.userId, user.userId), eq(portfolios.revision, input.revision))).returning({ revision: portfolios.revision }).get();
    if (!saved) return json({ error: 'Портфолио изменено в другом окне или на другом устройстве. Сохраните копию и загрузите актуальную версию.', conflict: true }, 409);
    return json({ revision: saved.revision, updatedAt: now });
  } catch (e) { if (e instanceof SyntaxError || (e instanceof Error && /Некоррект|поддерживается|файле|идентификаторы/.test(e.message))) return json({ error: e.message }, 400); console.error('portfolio.save',e); return json({ error: 'Изменения пока не сохранены на сервере. Повторим при восстановлении соединения.' }, 503); }
}
