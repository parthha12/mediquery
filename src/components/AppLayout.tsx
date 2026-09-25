'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SafetyBanner } from './SafetyBanner';

const NAV_ITEMS = [
  { href: '/', label: 'Home', match: (path: string) => path === '/' },
  { href: '/dashboard', label: 'Board', match: (path: string) => path === '/dashboard' || path.startsWith('/patients') },
  { href: '/intake', label: 'Intake', match: (path: string) => path.startsWith('/intake') },
  { href: '/ask', label: 'Ask', match: (path: string) => path.startsWith('/ask') },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/" className="app-brand">
          <span className="app-mark" aria-hidden="true">M</span>
          <span className="app-brand-title">MediQuery</span>
        </Link>
        <nav className="app-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.match(pathname) ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="app-main mq-wide">
        <SafetyBanner />
        {children}
      </main>
    </div>
  );
}
