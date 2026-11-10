'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X, FileText, PanelsTopLeft, Mail, AtSign, MessagesSquare, TextCursorInput, Search, Clapperboard, Sparkles, GitBranch } from 'lucide-react';
import { formats, type Format } from '@/lib/model';
const icons = { FileText, PanelsTopLeft, Mail, AtSign, MessagesSquare, TextCursorInput, Search, Clapperboard, Sparkles, GitBranch };
export function FormatIcon({ type, size = 18 }: { type: Format; size?: number }) { const Icon = icons[formats[type].icon]; return <Icon size={size} strokeWidth={1.6} />; }
export function Modal({ title, children, onClose, wide = false, drawer = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''} ${drawer ? 'drawer' : ''}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }} aria-label={title}><header className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Закрыть окно"><X size={20} /></button></header>{children}</dialog>;
}
export function Flower({ className = '' }: { className?: string }) { return <svg viewBox="0 0 160 160" className={`flower ${className}`} aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.25">{Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx="80" cy="49" rx="14" ry="35" transform={`rotate(${i * 40} 80 80)`} />)}<circle cx="80" cy="80" r="13" /></g></svg>; }
