import { getChatGPTUser } from '@/app/chatgpt-auth';
import { type Portfolio } from './model';
export async function identity() {
  const user = await getChatGPTUser();
  return user;
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
