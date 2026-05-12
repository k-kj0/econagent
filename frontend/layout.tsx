import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EconAgent | Economic Intelligence',
  description: 'AI-powered economic intelligence dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}