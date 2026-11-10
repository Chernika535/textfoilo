import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Textfolio — тексты в своей среде',
  description: 'Создайте портфолио, в котором статьи, письма, диалоги и истории живут в привычных интерфейсах.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><head><link rel="stylesheet" href="/portfolio.css" /></head><body>{children}</body></html>;
}
