'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';

interface Props {
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitch: (mode: 'login' | 'register') => void;
}

export default function AuthModal({ mode, onClose, onSwitch }: Props) {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        showToast('SESSION_AUTHORIZED', 'success');
      } else {
        await register(form.username, form.email, form.password);
        showToast('ACCOUNT_CREATED // BLD: 1000 CRD', 'success');
      }
      onClose();
    } catch (err: any) {
      showToast(err.message || 'SYS_ERR', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          [X]
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <div className="nav-logo" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
            ▲ PREDICT.SYS
          </div>
          <h2 style={{ fontFamily: 'var(--font-header)', fontSize: '2rem', fontWeight: 400, textAlign: 'center', color: 'var(--text-primary)' }}>
            {mode === 'login' ? 'AUTH_REQUIRED' : 'INIT_USER'}
          </h2>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', textTransform: 'uppercase' }}>
            {mode === 'register' ? 'INITIALIZING NEW NODE WITH 1000 CRD' : 'ENTER CREDENTIALS'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                id="reg-username"
                className="form-input"
                placeholder="CryptoKing99"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                minLength={3}
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <button type="submit" id="auth-submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}>
            {loading ? <span className="spinner" /> : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => onSwitch(mode === 'login' ? 'register' : 'login')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-hover)', cursor: 'pointer', fontWeight: 600 }}
          >
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
