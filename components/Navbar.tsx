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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'info');
    setIsMenuOpen(false);
    router.push('/');
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <nav className="navbar">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" onClick={closeMenu}>
            <span className="nav-logo-icon">▲</span>
            PREDICT.SYS
          </Link>

          <button className="btn btn-ghost nav-toggle" onClick={toggleMenu}>
            {isMenuOpen ? '[CLOSE]' : '[MENU]'}
          </button>

          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <Link href="/" className="nav-link" onClick={closeMenu}>Markets</Link>
            <Link href="/invest" className="nav-link" onClick={closeMenu}>Invest</Link>
            <Link href="/trade" className="nav-link" onClick={closeMenu}>Trade</Link>
            {user && <Link href="/my-bets" className="nav-link" onClick={closeMenu}>Terminals</Link>}
            {user && <Link href="/create" className="nav-link" onClick={closeMenu}>[+] Init</Link>}
            
            <div className="nav-actions">
              {!loading && (
                <>
                  {user ? (
                    <>
                      <span className="balance-chip">
                        CRD: {user.balance.toFixed(0)}
                      </span>
                      <span className="nav-link" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        USR:{user.username}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                        LOGOUT
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-outline btn-sm" onClick={() => { setAuthModal('login'); closeMenu(); }}>
                        LOGIN
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => { setAuthModal('register'); closeMenu(); }}>
                        REGISTER
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
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
