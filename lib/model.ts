export const formats = {
  article: { name: 'Статья', hint: 'Блог, медиа, лонгрид', icon: 'FileText' },
  landing: { name: 'Лендинг', hint: 'Страница из смысловых блоков', icon: 'PanelsTopLeft' },
  email: { name: 'Письма', hint: 'Рассылка в почтовом интерфейсе', icon: 'Mail' },
  social: { name: 'Соцсети', hint: 'Посты и серии публикаций', icon: 'AtSign' },
  chat: { name: 'Чат-бот', hint: 'Диалог с кнопками и развилками', icon: 'MessagesSquare' },
  editing: { name: 'Редактура', hint: 'Исходник, правки и комментарии', icon: 'TextCursorInput' },
  seo: { name: 'SEO-текст', hint: 'Ключевые слова и метаданные', icon: 'Search' },
  video: { name: 'Сценарий', hint: 'Сцены, реплики и готовое видео', icon: 'Clapperboard' },
  prompt: { name: 'Промпт', hint: 'Запрос и сохранённый ответ модели', icon: 'Sparkles' },
  narrative: { name: 'Нарратив', hint: 'Интерактивная сцена с выбором', icon: 'GitBranch' },
} as const;
export type Format = keyof typeof formats;
export const themes = [
  { id: 'editorial', name: 'Редакция', note: 'Тексты с характером', vibe: 'Журнальная', color: '#eee9df' },
  { id: 'bureau', name: 'Бюро', note: 'Уверенность в каждой детали', vibe: 'Сдержанная', color: '#e3e8ef' },
  { id: 'culture', name: 'Культура', note: 'Независимый взгляд', vibe: 'Экспериментальная', color: '#e6ee61' },
  { id: 'pop', name: 'Поп', note: 'Смело. Громко. По-своему.', vibe: 'Яркая', color: '#ebbbdc' },
  { id: 'cinema', name: 'Титры', note: 'У каждой истории свой экран', vibe: 'Кинематографичная', color: '#242a2b' },
  { id: 'gallery', name: 'Галерея', note: 'Пространство для главного', vibe: 'Минималистичная', color: '#e7e3db' },
] as const;
export type Theme = typeof themes[number]['id'];
export interface Item { id: string; label: string; body: string; role: 'author' | 'reader'; choices: { label: string; target: string }[] }
export interface Work {
  id: string; type: Format; title: string; project: string; sections: string[]; excerpt: string;
  body: string; original: string; comment: string; items: Item[]; status: 'published' | 'draft';
  color: string; sender: string; platform: 'telegram' | 'instagram' | 'linkedin';
  seoTitle: string; seoDescription: string; keywords: string; videoUrl: string; model: string;
  goal: string; contribution: string; result: string; metricBefore: string; metricAfter: string; metricLabel: string;
}
export interface Section { id: string; name: string; description: string }
export interface Portfolio {
  version: 1; theme: Theme; name: string; role: string; bio: string; email: string; location: string;
  available: boolean; sections: Section[]; works: Work[];
}
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const makeItem = (): Item => ({ id: uid(), label: '', body: '', role: 'author', choices: [] });
export function makeWork(type: Format): Work {
  return { id: uid(), type, title: '', project: '', sections: [], excerpt: '', body: '', original: '', comment: '', items: [], status: 'draft', color: '#e5ebdf', sender: '', platform: 'telegram', seoTitle: '', seoDescription: '', keywords: '', videoUrl: '', model: '', goal: '', contribution: '', result: '', metricBefore: '', metricAfter: '', metricLabel: '' };
}
export function validatePortfolio(value: unknown): Portfolio {
  if (!value || typeof value !== 'object') throw new Error('В файле нет данных портфолио.');
  const p = value as Portfolio;
  if (p.version !== 1 || !themes.some(t => t.id === p.theme)) throw new Error('Эта версия файла не поддерживается.');
  for (const key of ['name', 'role', 'bio', 'email', 'location'] as const) if (typeof p[key] !== 'string') throw new Error('Некорректный профиль.');
  if (typeof p.available !== 'boolean' || !Array.isArray(p.sections) || !Array.isArray(p.works) || p.works.length > 2000) throw new Error('Некорректная структура файла.');
  const sectionIds = new Set<string>();
  p.sections.forEach(s => { if (!s || typeof s.id !== 'string' || typeof s.name !== 'string' || typeof s.description !== 'string' || sectionIds.has(s.id)) throw new Error('Некорректные разделы.'); sectionIds.add(s.id); });
  const workIds = new Set<string>();
  p.works.forEach(w => {
    if (!w || typeof w.id !== 'string' || workIds.has(w.id) || !Object.hasOwn(formats, w.type) || !['published', 'draft'].includes(w.status)) throw new Error('Некорректная работа.');
    workIds.add(w.id);
    const base = makeWork(w.type);
    for (const key of Object.keys(base) as (keyof Work)[]) if (typeof base[key] === 'string' && typeof w[key] !== 'string') throw new Error('Некорректные поля работы.');
    if (!/^#[0-9a-f]{6}$/i.test(w.color) || !['telegram', 'instagram', 'linkedin'].includes(w.platform)) throw new Error('Некорректное оформление работы.');
    if (!Array.isArray(w.sections) || w.sections.some(s => !sectionIds.has(s)) || !Array.isArray(w.items)) throw new Error('Некорректное содержимое работы.');
    const ids = new Set(w.items.map(i => i?.id));
    if (ids.size !== w.items.length) throw new Error('Повторяются идентификаторы сообщений.');
    w.items.forEach(i => { if (!i || typeof i.id !== 'string' || typeof i.label !== 'string' || typeof i.body !== 'string' || !['author', 'reader'].includes(i.role) || !Array.isArray(i.choices) || i.choices.some(c => !c || typeof c.label !== 'string' || typeof c.target !== 'string' || !ids.has(c.target))) throw new Error('Некорректные сообщения или переходы.'); });
  });
  return p;
}
export function safeUrl(value: string): string | undefined {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined; } catch { return undefined; }
}
