'use client';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Mail, Search, Star, MoreHorizontal, Send, Paperclip, Smile, ChevronDown, RotateCcw, Play, Heart, MessageCircle, Bookmark, Check, Sparkles, ExternalLink, GitBranch } from 'lucide-react';
import { safeUrl, type Work } from '@/lib/model';
function Highlight({ text, keywords = [] }: { text: string; keywords?: string[] }) {
  const re = keywords.filter(Boolean).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!re) return <>{text}</>;
  return <>{text.split(new RegExp(`(${re})`, 'gi')).map((s, i) => keywords.some(k => k.toLowerCase() === s.toLowerCase()) ? <mark key={i}>{s}</mark> : s)}</>;
}
function Inline({ text, keywords }: { text: string; keywords?: string[] }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\))/g);
  return <>{parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}><Highlight text={part.slice(2, -2)} keywords={keywords} /></strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}><Highlight text={part.slice(1, -1)} keywords={keywords} /></em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && safeUrl(link[2])) return <a key={i} href={safeUrl(link[2])} target="_blank" rel="noreferrer"><Highlight text={link[1]} keywords={keywords} /></a>;
    return <Highlight key={i} text={part} keywords={keywords} />;
  })}</>;
}
export function RichText({ text, keywords }: { text: string; keywords?: string[] }) {
  const lines = text.split('\n'); const output: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code: string[] = []; const key = i;
      while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]);
      output.push(<pre key={key}><code>{code.join('\n')}</code></pre>); continue;
    }
    if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line); const items: ReactNode[] = []; const key = i;
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i]) : /^[-*] /.test(lines[i]))) {
        items.push(<li key={i}><Inline text={lines[i].replace(ordered ? /^\d+\. / : /^[-*] /, '')} keywords={keywords} /></li>); i++;
      }
      i--; output.push(ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>); continue;
    }
    const content = <Inline text={line.replace(/^#{1,3} |^> /, '')} keywords={keywords} />;
    if (line.startsWith('# ')) output.push(<h2 key={i}>{content}</h2>);
    else if (line.startsWith('## ') || line.startsWith('### ')) output.push(<h3 key={i}>{content}</h3>);
    else if (line.startsWith('> ')) output.push(<blockquote key={i}>{content}</blockquote>);
    else output.push(line ? <p key={i}>{content}</p> : <div className="paragraph-space" key={i} />);
  }
  return <div className="rich-text">{output}</div>;
}
export function Diff({ original, revised }: { original: string; revised: string }) {
  const a = original.split(/(\s+)/); const b = revised.split(/(\s+)/);
  // Bounded LCS keeps arbitrary long texts responsive; larger texts use paragraph-level changes.
  if (a.length * b.length > 250000) return <div className="diff"><del>{original}</del><br /><ins>{revised}</ins></div>;
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: ReactNode[] = []; let i = 0, j = 0, k = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { out.push(<span key={k++}>{a[i++]}</span>); j++; }
    else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) out.push(<ins key={k++}>{b[j++]}</ins>);
    else out.push(<del key={k++}>{a[i++]}</del>);
  }
  return <div className="diff">{out}</div>;
}
export function WorkContent({ work: w, staticMode = false }: { work: Work; staticMode?: boolean }) {
  const [mail, setMail] = useState(0);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState('diff');
  const [history, setHistory] = useState<string[]>(w.items[0] ? [w.items[0].id] : []);
  const [social, setSocial] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  if (w.type === 'email') {
    const current = w.items[mail];
    return <div className="native-mail native"><div className="mail-toolbar"><span><Mail size={18} /> Почта</span><span className="mail-search"><Search size={14} /> Поиск в почте</span><span className="native-avatar">{(w.sender || 'А')[0]}</span></div><div className="mail-layout"><aside className="mail-folders"><strong>Входящие <span>{w.items.length}</span></strong><span>Помеченные</span><span>Отправленные</span><span>Черновики</span><small>Демонстрация рассылки</small></aside><div className="mail-messages">{w.items.length ? w.items.map((item, n) => <div key={item.id}>{staticMode ? <section className="static-mail"><h3>{item.label}</h3><small>{w.sender || w.project} → Читатель</small><RichText text={item.body} /></section> : <button className={`mail-row ${mail === n ? 'selected' : ''}`} onClick={() => setMail(n)}><Star size={14} /><div><strong>{w.sender || w.project || 'Автор'}</strong><span>{item.label || `Письмо ${n + 1}`}</span><small>{item.body.slice(0, 65)}</small></div><small>{n + 1}</small></button>}</div>) : <p className="empty-content">Добавьте первое письмо в редакторе.</p>}{!staticMode && current && <article className="mail-open"><div className="mail-open-actions"><button aria-label="Предыдущее письмо" disabled={mail === 0} onClick={() => setMail(mail - 1)}><ArrowLeft size={16} /></button><span>{mail + 1} из {w.items.length}</span><button aria-label="Следующее письмо" disabled={mail >= w.items.length - 1} onClick={() => setMail(mail + 1)}><ArrowRight size={16} /></button></div><h2>{current.label}</h2><div className="sender-line"><span className="native-avatar">{(w.sender || 'А')[0]}</span><div><strong>{w.sender || w.project}</strong><small>кому: мне <ChevronDown size={11} /></small></div><span className="dim">10:24</span></div><RichText text={current.body} /></article>}</div></div></div>;
  }
  if (w.type === 'chat' || w.type === 'narrative') {
    const isNarrative = w.type === 'narrative';
    const visible = staticMode ? w.items : history.map(id => w.items.find(i => i.id === id)).filter((i): i is Work['items'][number] => !!i);
    const last = visible[visible.length - 1]; const lastIndex = w.items.findIndex(i => i.id === last?.id); const next = isNarrative ? undefined : w.items[lastIndex + 1];
    return <div className={`native ${isNarrative ? 'native-narrative' : 'native-chat'}`}><div className="chat-header"><span className="native-avatar">{isNarrative ? <GitBranch size={20} /> : (w.sender || 'К')[0]}</span><div><strong>{w.sender || w.title}</strong><small>{isNarrative ? 'Интерактивная история' : 'бот'}</small></div><button aria-label="Начать заново" onClick={() => setHistory(w.items[0] ? [w.items[0].id] : [])}><RotateCcw size={17} /></button></div><div className="chat-body"><span className="chat-date">{isNarrative ? 'Глава первая' : 'Начало диалога'}</span>{visible.map((item, n) => <div className={`chat-turn ${item.role === 'reader' ? 'reader' : ''}`} key={`${item.id}-${n}`}>{isNarrative && <small className="scene-label">{item.label}</small>}<div className="bubble"><RichText text={item.body} /><small className="bubble-time">12:{String(20 + n).padStart(2, '0')} <Check size={11} /></small></div>{staticMode && item.choices.map((c, i) => <p key={i} className="static-choice">{c.label} → {w.items.find(x => x.id === c.target)?.label}</p>)}</div>)}{!visible.length && <p>Добавьте сообщения или сцены в редакторе.</p>}{!staticMode && last && <div className="chat-choices">{last.choices.length ? last.choices.map((c, n) => <button key={n} disabled={history.length >= 100} onClick={() => setHistory([...history, c.target])}>{c.label}<ArrowRight size={14} /></button>) : next ? <button onClick={() => setHistory([...history, next.id])}>Продолжить <ArrowRight size={14} /></button> : <span className="chat-end">{isNarrative ? 'Конец этой истории' : 'Диалог завершён'}</span>}</div>}</div>{!isNarrative && <div className="chat-compose"><Paperclip size={18} /><span>Выберите ответ выше</span><Smile size={18} /><Send size={18} /></div>}</div>;
  }
  if (w.type === 'prompt') return <div className="native native-prompt"><div className="prompt-header"><Sparkles size={18} /><strong>{w.model || 'Демонстрация промпта'}</strong></div><div className="prompt-disclaimer">Сохранённый пример автора · запрос к нейросети не выполняется</div><div className="prompt-user"><RichText text={w.body} /></div>{!sent && !staticMode ? <button className="prompt-send" onClick={() => setSent(true)}>Отправить <ArrowUpIcon /></button> : <div className="prompt-answer"><Sparkles size={22} /><RichText text={w.items.map(i => i.body).join('\n\n') || 'Автор пока не добавил ответ.'} /></div>}{sent && !staticMode && <button className="text-button" onClick={() => setSent(false)}>Показать ещё раз <RotateCcw size={14} /></button>}</div>;
  if (w.type === 'editing') return <div className="native native-editing"><div className="editor-mode">{[['original', 'Исходник'], ['diff', 'Правки'], ['result', 'Результат']].map(([id, label]) => <button className={mode === id ? 'active' : ''} key={id} onClick={() => setMode(id)}>{label}</button>)}</div><div className="editing-layout"><article>{staticMode ? <><h3>Исходник и правки</h3><Diff original={w.original} revised={w.body} /><h3>Результат</h3><RichText text={w.body} /></> : mode === 'diff' ? <Diff original={w.original} revised={w.body} /> : <RichText text={mode === 'original' ? w.original : w.body} />}</article><aside><span className="comment-label">Комментарий редактора</span><RichText text={w.comment || 'Комментарий пока не добавлен.'} /></aside></div></div>;
  if (w.type === 'social') {
    const posts = staticMode ? w.items : w.items.slice(social, social + 1);
    return <div className={`social-outer ${w.platform}`}><div className="social-platform">{w.platform === 'telegram' ? 'Telegram' : w.platform === 'instagram' ? 'Instagram' : 'LinkedIn'}</div>{posts.map(item => <article className="native native-social" key={item.id}><header><span className="native-avatar">{(w.sender || 'А')[0]}</span><div><strong>{w.sender || w.project}</strong><small>{w.platform === 'telegram' ? 'публичный канал' : 'Публикация автора'}</small></div><MoreHorizontal size={20} /></header>{w.platform === 'instagram' && <div className="social-art" style={{ background: w.color }}><span>{item.label}</span><span className="art-circle" /></div>}<div className="social-copy">{w.platform !== 'instagram' && <h3>{item.label}</h3>}<RichText text={item.body} /><small className="dim">Демонстрационная публикация</small></div><footer><button aria-label={liked ? 'Убрать реакцию' : 'Поставить реакцию'} onClick={() => setLiked(!liked)}><Heart size={19} fill={liked ? '#c45f74' : 'none'} /></button><MessageCircle size={19} /><Send size={19} /><button className="bookmark" aria-label={saved ? 'Убрать закладку' : 'Добавить закладку'} onClick={() => setSaved(!saved)}><Bookmark size={19} fill={saved ? '#252825' : 'none'} /></button></footer></article>)}{!staticMode && w.items.length > 1 && <div className="series-nav"><button aria-label="Предыдущий пост" disabled={social === 0} onClick={() => setSocial(social - 1)}><ArrowLeft size={16} /></button><span>Публикация {social + 1} / {w.items.length}</span><button aria-label="Следующий пост" disabled={social === w.items.length - 1} onClick={() => setSocial(social + 1)}><ArrowRight size={16} /></button></div>}</div>;
  }
  if (w.type === 'landing') return <div className="native native-landing"><header><strong>{w.project || 'Ваш бренд'}</strong><a href="#landing-end">Подробнее <ArrowRight size={13} /></a></header>{w.items.map((item, i) => <section key={item.id} id={i === w.items.length - 1 ? 'landing-end' : undefined} className={`landing-block block-${i % 3}`} style={i === 0 ? { background: w.color } : undefined}><span className="landing-index">{String(i + 1).padStart(2, '0')} / {w.project}</span>{i === 0 ? <h2>{item.label}</h2> : <h3>{item.label}</h3>}<RichText text={item.body} />{i === 0 && <a className="landing-cta" href="#landing-end">Узнать историю <ArrowRight size={16} /></a>}{i === 0 && <div className="landing-sculpture" aria-hidden="true"><i /><i /><i /></div>}</section>)}</div>;
  if (w.type === 'video') {
    const url = safeUrl(w.videoUrl); let embed: string | undefined;
    if (url) { const u = new URL(url); if (['youtube.com', 'www.youtube.com', 'youtu.be'].includes(u.hostname)) { const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v'); if (id && /^[\w-]{11}$/.test(id)) embed = `https://www.youtube-nocookie.com/embed/${id}`; } else if (u.hostname === 'vimeo.com' && /^\/\d+$/.test(u.pathname)) embed = `https://player.vimeo.com/video${u.pathname}`; }
    return <div className="native native-script"><div className="script-caption"><Play size={16} /> СЦЕНАРИЙ / {w.project}</div>{w.items.map((i, n) => <section className="script-scene" key={i.id}><span>{String(n + 1).padStart(2, '0')}</span><div><h3>{i.label}</h3><RichText text={i.body} /></div></section>)}<RichText text={w.body} />{embed ? <iframe src={embed} title="Готовый ролик" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : url && /\.(mp4|webm)(\?.*)?$/i.test(url) ? <video controls preload="metadata" src={url} /> : url ? <a className="video-link" href={url} target="_blank" rel="noreferrer">Открыть готовый ролик <ExternalLink size={16} /></a> : <p className="video-placeholder"><Play size={22} /> Автор пока не прикрепил готовый ролик.</p>}</div>;
  }
  const keys = w.type === 'seo' ? w.keywords.split(',').map(s => s.trim()).filter(Boolean) : undefined;
  return <div className={`native article-layout ${w.type === 'seo' ? 'with-seo' : ''}`}><article className="native-article"><div className="article-kicker">{w.project || 'Авторский материал'}</div><h1>{w.title}</h1><p className="article-lead">{w.excerpt}</p><div className="article-byline">Текст автора <span>·</span> {Math.max(1, Math.ceil(w.body.split(/\s+/).length / 180))} мин чтения</div><div className="article-cover" style={{ background: w.color }}><div className="cover-window" /><span>{w.project || 'Истории в словах'}</span></div><RichText text={w.body} keywords={keys} /></article>{w.type === 'seo' && <aside className="seo-panel"><span className="comment-label">SEO-разметка</span><h4>Title</h4><p>{w.seoTitle || 'Не указан'}</p><h4>Description</h4><p>{w.seoDescription || 'Не указан'}</p><h4>Ключевые запросы</h4><div className="keyword-list">{keys?.map(k => <mark key={k}>{k}</mark>)}</div><small>Совпадения выделены в тексте.</small></aside>}</div>;
}
function ArrowUpIcon() { return <Send size={16} />; }
