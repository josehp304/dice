import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/NavBar/Navbar';
import ToastProvider from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: 'DiceBet — Prediction Markets',
  description: 'Bet on real-world outcomes. Post questions, pick YES or NO, win big. Dynamic odds powered by the crowd.',
  keywords: 'prediction market, betting, gambling, yes no, odds, crypto',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main>{children}</main>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
