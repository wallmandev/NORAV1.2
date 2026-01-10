import '../index.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NORA - AI Sales Assistant',
  description: 'AI-driven sales onboarding demo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
