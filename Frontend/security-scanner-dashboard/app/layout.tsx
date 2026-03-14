import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SecureScope - Security Vulnerability Scanner',
  description: 'Advanced security vulnerability scanner with AI-powered analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white">
        {children}
      </body>
    </html>
  );
}