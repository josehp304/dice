'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { format } from 'date-fns';

export default function MyBetsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch('/api/bets/mine')
      .then((r) => r.json())
      .then((d) => setBets(d.bets || []))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 600, margin: '4rem auto', padding: '0 1.5rem' }}>
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div className="empty-title">Login to see your bets</div>
          <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Go to Markets
          </Link>
        </div>
      </div>
    );
  }

  const totalBets = bets.length;
  const wonBets = bets.filter((b) => b.settled && b.payout > 0);
  const lostBets = bets.filter((b) => b.settled && b.payout === 0);
  const pendingBets = bets.filter((b) => !b.settled);

  const totalWagered = bets.reduce((a, b) => a + b.amount, 0);
  const totalPayout = wonBets.reduce((a, b) => a + b.payout, 0);
  const profit = totalPayout - bets.filter((b) => b.settled).reduce((a, b) => a + b.amount, 0);

  const filteredBets = bets.filter((b) => {
    if (filter === 'pending') return !b.settled;
    if (filter === 'won') return b.settled && b.payout > 0;
    if (filter === 'lost') return b.settled && b.payout === 0;
    return true;
  });

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1.5rem 3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          🎲 My Bets
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track your betting history and results</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Bets', value: totalBets, color: 'var(--text-primary)' },
          { label: 'Wagered', value: `🪙${totalWagered.toFixed(0)}`, color: 'var(--gold)' },
          { label: 'Won', value: wonBets.length, color: 'var(--yes-color)' },
          { label: profit >= 0 ? 'Profit' : 'Loss', value: `${profit >= 0 ? '+' : ''}🪙${profit.toFixed(0)}`, color: profit >= 0 ? 'var(--yes-color)' : 'var(--no-color)' },
        ].map((s) => (
          <div key={s.label} className="detail-card" style={{ padding: '1rem', textAlign: 'center', margin: 0 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="page-tabs" style={{ marginBottom: '1rem' }}>
        {[
          { label: `All (${totalBets})`, value: 'all' },
          { label: `Pending (${pendingBets.length})`, value: 'pending' },
          { label: `Won (${wonBets.length})`, value: 'won' },
          { label: `Lost (${lostBets.length})`, value: 'lost' },
        ].map((t) => (
          <button
            key={t.value}
            id={`my-bets-tab-${t.value}`}
            className={`page-tab ${filter === t.value ? 'active' : ''}`}
            onClick={() => setFilter(t.value as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bets list */}
      {filteredBets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <div className="empty-title">No bets here</div>
          <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Browse Markets
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredBets.map((bet, i) => {
            const isResolved = bet.questionStatus === 'resolved';
            const won = bet.settled && bet.payout > 0;
            const lost = bet.settled && bet.payout === 0;
            const pending = !bet.settled;

            let statusColor = 'var(--text-muted)';
            let statusLabel = '⏳ Pending';
            if (won) { statusColor = 'var(--yes-color)'; statusLabel = `✓ Won 🪙+${bet.payout.toFixed(0)}`; }
            if (lost) { statusColor = 'var(--no-color)'; statusLabel = '✕ Lost'; }

            return (
              <Link key={i} href={`/questions/${bet.questionId}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.35rem', lineHeight: 1.4 }}>
                        {bet.questionTitle}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>Placed {format(new Date(bet.placedAt), 'MMM d, yyyy')}</span>
                        <span>Odds locked: {bet.odds.toFixed(2)}x</span>
                        <span style={{ color: bet.questionStatus === 'open' ? 'var(--yes-color)' : 'var(--text-muted)' }}>
                          {bet.questionStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
                        <span className={`badge ${bet.side === 'yes' ? 'badge-open' : 'badge-closed'}`}>
                          {bet.side.toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.9rem' }}>🪙{bet.amount}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: statusColor }}>{statusLabel}</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
