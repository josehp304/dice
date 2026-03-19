'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import OddsBar from '@/components/OddsBar';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

const categoryEmoji: Record<string, string> = {
  Sports: '[S]', Politics: '[P]', Crypto: '[C]', Entertainment: '[E]',
  Science: '[SC]', Technology: '[T]', Finance: '[F]', Other: '[X]',
};

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [betSide, setBetSide] = useState<'yes' | 'no' | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [betLoading, setBetLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'bets' | 'info'>('bets');

  const fetchQuestion = useCallback(async () => {
    try {
      const res = await fetch(`/api/questions/${params.id}`);
      if (!res.ok) { router.push('/'); return; }
      const data = await res.json();
      setQuestion(data.question);
    } catch { router.push('/'); }
    finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => {
    fetchQuestion();
    const interval = setInterval(fetchQuestion, 10000);
    return () => clearInterval(interval);
  }, [fetchQuestion]);

  const totalPool = question ? question.totalYesAmount + question.totalNoAmount : 0;
  const yesPercent = totalPool === 0 ? 50 : (question?.totalYesAmount / totalPool) * 100;
  const noPercent = 100 - yesPercent;

  const getOddsForSide = (side: 'yes' | 'no') => {
    if (!question) return 2.0;
    const betAmt = parseFloat(betAmount) || 0;
    const totalWithBet = totalPool + betAmt;
    const sideAmt = (side === 'yes' ? question.totalYesAmount : question.totalNoAmount) + betAmt;
    if (totalWithBet === 0 || sideAmt === 0) return 2.0;
    return Math.max(1.01, (1 / (sideAmt / totalWithBet)) * 0.95);
  };

  const potentialReturn = betSide && parseFloat(betAmount) > 0
    ? parseFloat(betAmount) * getOddsForSide(betSide)
    : 0;

  const handleBet = async () => {
    if (!user) { showToast('Please login to bet', 'error'); return; }
    if (!betSide) { showToast('Select YES or NO', 'error'); return; }
    const amount = parseFloat(betAmount);
    if (!amount || amount < 1) { showToast('Enter a valid bet amount', 'error'); return; }

    setBetLoading(true);
    try {
      const res = await fetch(`/api/questions/${params.id}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side: betSide, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Bet placed! Potential return: 🪙${data.bet.potentialReturn.toFixed(0)}`, 'success');
      setBetAmount('');
      setBetSide(null);
      await fetchQuestion();
      await refreshUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to place bet', 'error');
    } finally {
      setBetLoading(false);
    }
  };

  const handleResolve = async (outcome: 'yes' | 'no') => {
    if (!confirm(`Are you sure? This will mark "${outcome.toUpperCase()}" as the winner and pay out all winning bets.`)) return;
    setResolveLoading(true);
    try {
      const res = await fetch(`/api/questions/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Question resolved! Winning bets paid out 🎉', 'success');
      await fetchQuestion();
      await refreshUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve', 'error');
    } finally {
      setResolveLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
      </div>
    );
  }

  if (!question) return null;

  const isOwner = user?.id === question.createdBy?.toString() || user?.username === question.creatorUsername;
  const isOpen = question.status === 'open' && new Date(question.expiresAt) > new Date();
  const isResolved = question.status === 'resolved';

  return (
    <div className="question-detail">
      {/* Back */}
      <Link href="/" className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
        [&lt;] BACK TO MARKETS
      </Link>

      {/* Header */}
      <div className="detail-header">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span className={`badge ${isOpen ? 'badge-open' : isResolved ? 'badge-resolved' : 'badge-closed'}`}>
            {isOpen ? '/// ACTIVE' : isResolved ? '/// RESOLVED' : '/// HALTED'}
          </span>
          <span className="badge badge-category">
            {categoryEmoji[question.category]} {question.category}
          </span>
          {isResolved && (
            <span className={question.outcome === 'yes' ? 'badge badge-open' : 'badge badge-closed'}>
              {question.outcome === 'yes' ? '/// YES WON' : '/// NO WON'}
            </span>
          )}
        </div>
        <h1 style={{ fontFamily: 'var(--font-header)', fontSize: '2.5rem', fontWeight: 400, lineHeight: 1.1, marginBottom: '1rem', textTransform: 'uppercase' }}>
          {question.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem', fontSize: '0.9rem' }}>
          {question.description}
        </p>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <span>USR: {question.creatorUsername}</span>
          <span>{isOpen ? `T-${formatDistanceToNow(new Date(question.expiresAt))}` : `T=0 [${format(new Date(question.expiresAt), 'MMM d, yyyy')}]`}</span>
        </div>
      </div>

      {/* Stats Card */}
      <div className="detail-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-header)', fontSize: '2rem', color: 'var(--text-primary)' }}>{totalPool.toFixed(0)}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VOLUME</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '2px solid var(--border)', borderRight: '2px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-header)', fontSize: '2rem', color: 'var(--text-primary)' }}>
              {question.totalYesBets + question.totalNoBets}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TRANSACTIONS</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-header)', fontSize: '2rem', color: 'var(--yes-color)', textShadow: '0 0 5px var(--yes-dark)' }}>{yesPercent.toFixed(0)}%</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROBABILITY</div>
          </div>
        </div>

        <OddsBar yesAmount={question.totalYesAmount} noAmount={question.totalNoAmount} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.5rem' }}>
          <div className={`bet-card-selector ${betSide === 'yes' ? 'selected' : ''}`} style={{ border: '2px solid var(--yes-color)', background: betSide === 'yes' ? 'var(--yes-color)' : 'var(--yes-bg)', color: betSide === 'yes' ? 'var(--bg-primary)' : 'inherit', padding: '1rem', textAlign: 'center', boxShadow: betSide === 'yes' ? '0px 0px 0px transparent' : '4px 4px 0px var(--yes-color)', transform: betSide === 'yes' ? 'translate(4px, 4px)' : 'none', cursor: 'pointer', transition: 'all 0.15s ease' }} onClick={() => setBetSide('yes')}>
            <div style={{ fontFamily: 'var(--font-header)', fontSize: '2rem', color: betSide === 'yes' ? 'black' : 'var(--yes-color)', textShadow: betSide === 'yes' ? 'none' : '0 0 5px var(--yes-dark)' }}>
              [{getOddsForSide('yes').toFixed(2)}x]
            </div>
            <div style={{ fontSize: '0.85rem', color: betSide === 'yes' ? 'black' : 'var(--text-primary)', fontWeight: 700 }}>YES MULTIPLIER</div>
            <div style={{ fontSize: '0.75rem', color: betSide === 'yes' ? 'rgba(0,0,0,0.7)' : 'var(--yes-color)', marginTop: '0.5rem' }}>
              VOL: {question.totalYesAmount.toFixed(0)} | TX: {question.totalYesBets}
            </div>
          </div>
          <div className={`bet-card-selector ${betSide === 'no' ? 'selected' : ''}`} style={{ border: '2px solid var(--no-color)', background: betSide === 'no' ? 'var(--no-color)' : 'var(--no-bg)', color: betSide === 'no' ? 'var(--bg-primary)' : 'inherit', padding: '1rem', textAlign: 'center', boxShadow: betSide === 'no' ? '0px 0px 0px transparent' : '4px 4px 0px var(--no-color)', transform: betSide === 'no' ? 'translate(4px, 4px)' : 'none', cursor: 'pointer', transition: 'all 0.15s ease' }} onClick={() => setBetSide('no')}>
            <div style={{ fontFamily: 'var(--font-header)', fontSize: '2rem', color: betSide === 'no' ? 'black' : 'var(--no-color)', textShadow: betSide === 'no' ? 'none' : '0 0 5px var(--no-dark)' }}>
              [{getOddsForSide('no').toFixed(2)}x]
            </div>
            <div style={{ fontSize: '0.85rem', color: betSide === 'no' ? 'white' : 'var(--text-primary)', fontWeight: 700 }}>NO MULTIPLIER</div>
            <div style={{ fontSize: '0.75rem', color: betSide === 'no' ? 'rgba(255,255,255,0.8)' : 'var(--no-color)', marginTop: '0.5rem' }}>
              VOL: {question.totalNoAmount.toFixed(0)} | TX: {question.totalNoBets}
            </div>
          </div>
        </div>
      </div>

      {/* Bet Panel */}
      {isOpen && (
        <div className="bet-panel">
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginBottom: '1rem' }}>
            {user ? 'Place Your Bet' : 'Login to Place a Bet'}
          </h3>

          {user ? (
            <>
              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    id={`quick-amount-${amt}`}
                    className={`btn btn-sm ${betAmount === amt.toString() ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setBetAmount(amt.toString())}
                    disabled={user.balance < amt}
                  >
                    🪙{amt}
                  </button>
                ))}
                <button className="btn btn-sm btn-ghost" onClick={() => setBetAmount(String(Math.floor(user.balance)))}>
                  All In
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Bet Amount</label>
                <input
                  id="bet-amount-input"
                  type="number"
                  className="form-input"
                  placeholder="Enter amount..."
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="1"
                  max={user.balance}
                />
              </div>

              {betSide && parseFloat(betAmount) > 0 && (
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Betting on</span>
                    <span style={{ fontWeight: 600, color: betSide === 'yes' ? 'var(--yes-color)' : 'var(--no-color)' }}>
                      {betSide.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Odds (after your bet)</span>
                    <span style={{ fontWeight: 600 }}>{getOddsForSide(betSide).toFixed(3)}x</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Potential return</span>
                    <span style={{ fontWeight: 700, color: 'var(--gold)' }}>🪙{potentialReturn.toFixed(0)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>Balance: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>🪙{user.balance.toFixed(0)}</span></span>
              </div>

              <button
                id="place-bet-btn"
                className={`btn w-full ${betSide === 'yes' ? 'btn-yes' : betSide === 'no' ? 'btn-no' : 'btn-primary'}`}
                style={{ padding: '0.75rem', fontSize: '0.95rem' }}
                onClick={handleBet}
                disabled={betLoading || !betSide || !betAmount}
              >
                {betLoading ? <span className="spinner" /> : `Place ${betSide?.toUpperCase() || 'Bet'} → 🪙${parseFloat(betAmount) || 0}`}
              </button>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              <a href="#" style={{ color: 'var(--accent-hover)', fontWeight: 600 }}>Login</a> or <a href="#" style={{ color: 'var(--accent-hover)', fontWeight: 600 }}>Register</a> to place a bet.
            </p>
          )}
        </div>
      )}

      {/* Resolve panel - for question creator */}
      {isOwner && !isResolved && (
        <div className="detail-card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginBottom: '0.5rem', color: 'var(--gold)' }}>
            ⚡ Resolve This Question
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            As the creator, you can resolve this question and pay out winning bets.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button id="resolve-yes" className="btn btn-yes" onClick={() => handleResolve('yes')} disabled={resolveLoading}>
              {resolveLoading ? <span className="spinner" /> : '✓ YES Wins'}
            </button>
            <button id="resolve-no" className="btn btn-no" onClick={() => handleResolve('no')} disabled={resolveLoading}>
              {resolveLoading ? <span className="spinner" /> : '✕ NO Wins'}
            </button>
          </div>
        </div>
      )}

      {/* Resolved result */}
      {isResolved && (
        <div className={`result-banner ${question.outcome === 'yes' ? 'result-yes' : 'result-no'}`} style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{question.outcome === 'yes' ? '✓' : '✕'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {question.outcome === 'yes' ? 'YES' : 'NO'} Wins!
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>
              Winning bets have been paid out proportionally from the pool.
            </div>
          </div>
        </div>
      )}

      {/* Bets / Info Tabs */}
      <div className="page-tabs">
        <button id="tab-bets" className={`page-tab ${activeTab === 'bets' ? 'active' : ''}`} onClick={() => setActiveTab('bets')}>
          Bet History ({(question.bets || []).length})
        </button>
        <button id="tab-info" className={`page-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
          Market Info
        </button>
      </div>

      {activeTab === 'bets' && (
        <div className="detail-card">
          {question.bets?.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-icon">🎲</div>
              <div className="empty-title">No bets yet</div>
              <p>Be the first one to bet!</p>
            </div>
          ) : (
            <>
              {[...question.bets].reverse().slice(0, 50).map((bet: any, i: number) => (
                <div key={i} className="bet-row">
                  <div>
                    <span style={{ fontWeight: 600 }}>@{bet.username}</span>
                    <span style={{ color: bet.side === 'yes' ? 'var(--yes-color)' : 'var(--no-color)', marginLeft: '0.5rem', fontWeight: 600 }}>
                      {bet.side.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🪙{bet.amount}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{bet.odds.toFixed(2)}x</span>
                    {bet.settled && bet.payout > 0 && (
                      <span style={{ color: 'var(--yes-color)', fontWeight: 600 }}>+🪙{bet.payout.toFixed(0)}</span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'info' && (
        <div className="detail-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>How odds work</span>
              <span style={{ color: 'var(--text-muted)', maxWidth: '60%', textAlign: 'right', lineHeight: 1.5 }}>
                Parimutuel: more money on a side = lower odds for that side. 5% house edge applied.
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>House Edge</span>
              <span style={{ fontWeight: 600 }}>5%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Created</span>
              <span>{format(new Date(question.createdAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Closes</span>
              <span>{format(new Date(question.expiresAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
