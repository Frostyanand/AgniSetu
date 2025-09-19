import { AuthProvider } from '@/context/AuthContext'; 
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Agnishakti',
  description: 'Live monitoring dashboard and incident reports.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* AuthProvider now wraps your entire application */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
