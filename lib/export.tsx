import type { Portfolio } from './model';
import { download } from './storage';
export async function exportPortfolio(p: Portfolio) {
  const [{ renderToStaticMarkup }, { PortfolioSite }] = await Promise.all([import('react-dom/server'), import('@/components/textfolio/portfolio')]);
  const response = await fetch('/portfolio.css');
  if (!response.ok) throw new Error('Не удалось загрузить оформление. Попробуйте ещё раз.');
  const css = await response.text();
  const title = `${p.name || 'Автор'} — портфолио`.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const markup = renderToStaticMarkup(<PortfolioSite portfolio={p} staticMode />);
  download('portfolio.html', `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${css}</style></head><body>${markup}<script>document.addEventListener('click',function(e){var a=e.target.closest('a[href^="#work-"]');if(a){var d=document.getElementById(a.getAttribute('href').slice(1));if(d)d.open=true;}});</script></body></html>`, 'text/html;charset=utf-8');
}
