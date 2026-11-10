import { headers } from 'next/headers';
import { eq, gt, and } from 'drizzle-orm';
import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { guestSessions, portfolios, publications, media } from '@/db/schema';
import { type Portfolio } from './model';
export const GUEST_COOKIE = '__Host-textfolio-guest';
export type Identity = ChatGPTUser & { guest: boolean };
async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function guestSession() {
  const requestHeaders = await headers();
  const matches = (requestHeaders.get('Cookie') || '').split(';').map(s=>s.trim()).filter(s=>s.startsWith(`${GUEST_COOKIE}=`));
  if (matches.length !== 1) return null;
  const token=matches[0].slice(GUEST_COOKIE.length+1);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return getDb().select().from(guestSessions).where(and(eq(guestSessions.tokenHash,await hashToken(token)),gt(guestSessions.expiresAt,new Date().toISOString()))).get();
}
export async function identity(): Promise<Identity|null> {
  const user=await getChatGPTUser();
  const guest=await guestSession();
  if (user) {
    if (guest) {
      const db=getDb();
      const existing=await db.select({id:portfolios.userId}).from(portfolios).where(eq(portfolios.userId,user.userId)).get();
      const existingPublication=await db.select({id:publications.userId}).from(publications).where(eq(publications.userId,user.userId)).get();
      if(!existing&&!existingPublication){
        await db.batch([
          db.update(portfolios).set({userId:user.userId}).where(eq(portfolios.userId,guest.userId)),
          db.update(publications).set({userId:user.userId}).where(eq(publications.userId,guest.userId)),
          db.update(media).set({userId:user.userId}).where(eq(media.userId,guest.userId)),
          db.delete(guestSessions).where(eq(guestSessions.tokenHash,guest.tokenHash)),
        ]);
      }
    }
    return {...user,guest:false};
  }
  return guest ? {userId:guest.userId,displayName:'',fullName:null,email:'',guest:true} : null;
}
export async function createGuest() {
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
  const tokenHash=await hashToken(token);
  const userId=`guest_${crypto.randomUUID()}`;
  await getDb().insert(guestSessions).values({tokenHash,userId,expiresAt:new Date(Date.now()+365*24*60*60*1000).toISOString()});
  return {user:{userId,displayName:'',fullName:null,email:'',guest:true} satisfies Identity,cookie:`${GUEST_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`};
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  return request.headers.get('Sec-Fetch-Site') !== 'cross-site' && (!origin || origin === new URL(request.url).origin);
}
export function emptyPortfolio(name = '', email = ''): Portfolio {
  return { version: 1, theme: 'bureau', name, email, role: '', bio: '', location: '', available: true, sections: [], works: [] };
}
export function publicationDocument(p: Portfolio): Portfolio {
  return { ...p, works: p.works.filter(w => w.status === 'published') };
}
export function mediaReferences(p: Portfolio): Set<string> {
  const refs = new Set<string>();
  for (const w of p.works) for (const value of [w.coverImage, w.videoUrl, ...w.items.map(i => i.image)]) {
    const match = value?.match(/^\/api\/media\/([a-f0-9-]{36})$/i);
    if (match) refs.add(match[1]);
  }
  return refs;
}
