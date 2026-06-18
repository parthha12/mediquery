'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SafetyBanner } from './SafetyBanner';

const NAV_ITEMS = [
  { href: '/intake', label: 'Intake', match: (path: string) => path.startsWith('/intake') },
  { href: '/dashboard', label: 'Records', match: (path: string) => path === '/dashboard' || path.startsWith('/patients') },
  { href: '/ask', label: 'Ask', match: (path: string) => path.startsWith('/ask') },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/dashboard" className="app-brand" style={{ textDecoration: 'none' }}>
          <span className="app-brand-title">Mediquery</span>
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
      <main className="app-main">
        <SafetyBanner />
        {children}
      </main>
    </div>
  );
}
