import type { Metadata } from 'next';
import { AppLayout } from '@/components/AppLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mediquery',
  description: 'Ingest, organize, and query discharge data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
