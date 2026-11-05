import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Electoral Committee - Dashboard',
  description: 'Real-time response management dashboard for Electoral Committee Application Forms',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
