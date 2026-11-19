import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Access Studio: role-scoped internal tool demo',
  description: 'Independent demo with synthetic data. Not affiliated with Floracene.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
