import { type Portfolio, validatePortfolio } from './model';
export const STORAGE_KEY = 'textfolio:portfolio:v1';
export function loadPortfolio(): Portfolio | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? validatePortfolio(JSON.parse(raw)) : null;
}
export function savePortfolio(p: Portfolio) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
