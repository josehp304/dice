'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { useState } from 'react';
import AuthModal from '@/components/AuthModal';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const { showToast } = useToast();
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'info');
    router.push('/');
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <span className="nav-logo-icon">🎲</span>
            DiceBet
          </Link>

          <div className="nav-links">
            <Link href="/" className="nav-link">Markets</Link>
            {user && <Link href="/my-bets" className="nav-link">My Bets</Link>}
            {user && <Link href="/create" className="nav-link">+ Post Question</Link>}
          </div>

          <div className="nav-actions">
            {!loading && (
              <>
                {user ? (
                  <>
                    <span className="balance-chip">
                      🪙 {user.balance.toFixed(0)} coins
                    </span>
                    <span className="nav-link" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      @{user.username}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => setAuthModal('login')}>
                      Login
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setAuthModal('register')}>
                      Register
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={(m) => setAuthModal(m)}
        />
      )}
    </>
  );
}
