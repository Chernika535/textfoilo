'use client';
import { useState } from 'react';
import { ArrowUpRight, ArrowRight, Info, Mail } from 'lucide-react';
import { safeUrl, type Portfolio, type Work, formats } from '@/lib/model';
import { FormatIcon, Flower, Modal } from './ui';
import { WorkContent } from './content';
export function WorkMini({ work: w }: { work: Work }) {
  const image = safeUrl(w.coverImage || w.items.find(i => i.image)?.image || '');
  return <div className={`work-mini mini-${w.type}`} style={{ background: w.color }} aria-hidden="true">
    {image ? <img className="real-cover" src={image} alt="" /> : w.type === 'article' || w.type === 'seo' ? <div className="mini-paper"><small>{w.project || formats[w.type].name}</small><strong>{w.title || 'Без названия'}</strong>{w.excerpt && <p className="mini-real-lead">{w.excerpt}</p>}<p className="mini-real-copy">{w.body.replace(/^#{1,3} /gm,'').slice(0,700)}</p></div> :
    w.type === 'email' ? <div className="mini-email"><div className="mini-bar"><Mail size={10} /> Входящие <span>{w.items.length}</span></div><div className="mini-envelope"><small>{w.sender || w.project}</small><strong>{w.items[0]?.label || w.title}</strong><p className="mini-real-copy">{w.items[0]?.body.slice(0,400)}</p></div></div> :
    w.type === 'landing' ? <div className="mini-landing"><small>{w.project || 'Лендинг'}</small><strong>{w.items[0]?.label || w.title}</strong><p className="mini-real-lead">{w.items[0]?.body.slice(0,230)}</p></div> :
    w.type === 'chat' || w.type === 'narrative' ? <div className="mini-chat"><small>{w.sender || w.project}</small><div>{w.items[0]?.body.slice(0,180) || w.title}</div>{w.items[0]?.choices[0]?.label && <span>{w.items[0].choices[0].label}</span>}</div> :
    w.type === 'editing' ? <div className="mini-edit"><small>ИСХОДНИК / РЕЗУЛЬТАТ</small><del>{w.original.slice(0,150)}</del><strong>{w.body.slice(0,130)}</strong></div> :
    w.type === 'social' ? <div className="mini-social"><small>● {w.sender || w.project}</small><strong>{w.items[0]?.label || w.title}</strong><p>{w.items[0]?.body.slice(0,230)}</p></div> :
    w.type === 'prompt' ? <div className="mini-prompt"><strong>{w.title}</strong><p className="mini-real-copy">{w.body.slice(0,200)}</p></div> : <div className="mini-other"><FormatIcon type={w.type} size={26} /><strong>{w.title}</strong><small>{w.items[0]?.label || formats[w.type].name}</small></div>}
  </div>;
}
export function CaseInfo({ work: w }: { work: Work }) {
  const before = Number(w.metricBefore); const after = Number(w.metricAfter);
  const hasMetric = w.metricBefore !== '' && w.metricAfter !== '' && Number.isFinite(before) && Number.isFinite(after) && before >= 0 && after >= 0;
  const max = Math.max(before, after, 1);
  return <div className="case-info"><span className="eyebrow">Контекст работы</span><h2>{w.project || w.title}</h2>{[['Задача', w.goal], ['Мой вклад', w.contribution], ['Результат', w.result]].map(([label, text]) => <section key={label}><h3>{label}</h3><p>{text || 'Автор пока не добавил описание.'}</p></section>)}{hasMetric && <section className="case-metric"><h3>{w.metricLabel || 'Сравнение показателей'}</h3><div><span>До</span><i style={{ width: `${Math.max(2, before / max * 100)}%` }} /><strong>{before.toLocaleString('ru-RU')}</strong></div><div><span>После</span><i style={{ width: `${Math.max(2, after / max * 100)}%` }} /><strong>{after.toLocaleString('ru-RU')}</strong></div></section>}</div>;
}
export function PortfolioSite({ portfolio: p, staticMode = false }: { portfolio: Portfolio; staticMode?: boolean }) {
  const [section, setSection] = useState('all');
  const [opened, setOpened] = useState<Work | null>(null);
  const [info, setInfo] = useState<Work | null>(null);
  const works = p.works.filter(w => w.status === 'published' && (section === 'all' || w.sections.includes(section)));
  const current = p.sections.find(s => s.id === section);
  return <div className={`portfolio-site theme-${p.theme}`}>
    <header className="portfolio-nav"><a href="#portfolio-top" className="portfolio-wordmark">{p.name || 'Имя автора'}<span>®</span></a><nav aria-label="Разделы портфолио">{staticMode ? <a href="#selected-works">Работы</a> : <><button className={section === 'all' ? 'active' : ''} onClick={() => setSection('all')}>Все работы</button>{p.sections.map(s => <button className={section === s.id ? 'active' : ''} key={s.id} onClick={() => setSection(s.id)}>{s.name}</button>)}</>}<a href="#portfolio-contact">Контакты <ArrowUpRight size={13} /></a></nav></header>
    <section className="portfolio-hero" id="portfolio-top"><div className="portfolio-status"><span />{p.available ? 'Открыта к новым проектам' : 'Избранные проекты'}</div><div className="portfolio-hero-grid"><div><span className="portfolio-role">{p.name}</span><h1>{p.role ? p.role : p.theme === 'bureau' ? <>Слова, которые<br />решают задачи.</> : p.theme === 'culture' ? <>ЕСТЬ<br /><em>ЧТО СКАЗАТЬ.</em></> : p.theme === 'pop' ? <>Слова?<br /><em>Это ко мне.</em></> : p.theme === 'cinema' ? <>Каждая история<br />начинается <em>здесь.</em></> : p.theme === 'gallery' ? <>Точно.<br /><em>По существу.</em></> : <>На стороне<br /><em>хороших историй.</em></>}</h1></div><div className="portfolio-intro"><Flower /><p>{p.bio}</p><span>{p.location}</span></div></div><div className="hero-baseline"><span>Тексты. И всё, что между строк.</span><a href="#selected-works">Смотреть работы <ArrowRight size={17} /></a></div></section>
    <section className="portfolio-works" id="selected-works"><div className="portfolio-section-title"><div><span className="eyebrow">Портфолио / {String(works.length).padStart(2, '0')}</span><h2>{current?.name || 'Избранные работы'}<span>↘</span></h2>{current?.description && <p>{current.description}</p>}</div><span className="portfolio-volume">Собрание текстов, идей<br />и точных попаданий.</span></div><div className="portfolio-grid">{works.map((w, i) => <article className="portfolio-work" key={w.id}>{staticMode ? <a href={`#work-${w.id}`}><WorkMini work={w} /></a> : <button className="portfolio-cover" onClick={() => setOpened(w)} aria-label={`Открыть ${w.title}`}><WorkMini work={w} /><span className="cover-open"><ArrowUpRight size={22} /></span></button>}<div className="portfolio-work-meta"><span>{String(i + 1).padStart(2, '0')} / {formats[w.type].name}</span><span>{w.project}</span></div><div className="portfolio-work-title">{staticMode ? <a href={`#work-${w.id}`}><h3>{w.title}</h3></a> : <button onClick={() => setOpened(w)}><h3>{w.title}</h3></button>}{!staticMode && <button className="project-info-button" aria-label={`О проекте ${w.project || w.title}`} onClick={() => setInfo(w)}><Info size={18} /></button>}</div><p>{w.excerpt}</p></article>)}</div>{!works.length && <p className="portfolio-empty">В этом разделе пока нет опубликованных работ.</p>}</section>
    {staticMode && <section className="export-materials">{works.map(w => <details id={`work-${w.id}`} key={w.id}><summary><span>{formats[w.type].name}</span><h2>{w.title}</h2><span>Открыть работу ↓</span></summary><WorkContent work={w} staticMode /><details className="export-case"><summary>О проекте</summary><CaseInfo work={w} /></details></details>)}</section>}
    <footer className="portfolio-footer" id="portfolio-contact"><span>Следующая история — наша?</span><h2>Давайте найдём<br /><em>нужные слова.</em></h2>{p.email && <a href={`mailto:${p.email}`}>{p.email}<ArrowUpRight size={22} /></a>}<div><span>{p.name}</span><span>Собрано в Textfolio</span></div></footer>
    {opened && <Modal title={opened.title} wide onClose={() => setOpened(null)}><div className="work-reader"><div className="reader-caption"><span>{formats[opened.type].name} / {opened.project}</span><button onClick={() => setInfo(opened)}><Info size={15} /> О проекте</button></div><WorkContent key={opened.id} work={opened} /></div></Modal>}
    {info && <Modal title="О проекте" onClose={() => setInfo(null)}><CaseInfo work={info} /></Modal>}
  </div>;
}
