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

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <nav className="navbar">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" onClick={closeMenu}>
            <span className="nav-logo-icon">▲</span>
            PREDICT.SYS
          </Link>

          <button
            className={`nav-toggle ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
          </button>

          <button
            className={`nav-scrim ${isMenuOpen ? 'active' : ''}`}
            onClick={closeMenu}
            aria-hidden={!isMenuOpen}
            tabIndex={-1}
          />

          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`} id="mobile-menu">
            <Link href="/" className="nav-link" onClick={closeMenu}>Markets</Link>
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
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-outline btn-sm" onClick={() => { setAuthModal('login'); closeMenu(); }}>
                        Login
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => { setAuthModal('register'); closeMenu(); }}>
                        Register
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
