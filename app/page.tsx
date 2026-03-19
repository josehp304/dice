'use client';

import { useEffect, useState, useCallback } from 'react';
import QuestionCard from '@/components/QuestionCard';

const CATEGORIES = ['All', 'Sports', 'Politics', 'Crypto', 'Entertainment', 'Science', 'Technology', 'Finance', 'Other'];
const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: '🟢 Live', value: 'open' },
  { label: '🔒 Closed', value: 'closed' },
  { label: '✅ Resolved', value: 'resolved' },
];
const SORT_OPTIONS = [
  { label: '🕐 Newest', value: 'newest' },
  { label: '🔥 Popular', value: 'popular' },
  { label: '⏰ Closing Soon', value: 'closing' },
];

export default function HomePage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, live: 0, pool: 0 });

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(category !== 'All' ? { category } : {}),
        ...(status ? { status } : {}),
        sort,
        page: page.toString(),
      });
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setTotalPages(data.pages || 1);

      const liveCount = (data.questions || []).filter((q: any) => q.status === 'open').length;
      const poolTotal = (data.questions || []).reduce(
        (acc: number, q: any) => acc + q.totalYesAmount + q.totalNoAmount,
        0
      );
      setStats({ total: data.total || 0, live: liveCount, pool: poolTotal });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category, status, sort, page]);

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 15000); // auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchQuestions]);

  useEffect(() => {
    setPage(1);
  }, [category, status, sort]);

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">
          [ ⚡ SYS.ONLINE ]
        </div>
        <h1 className="hero-title">Predict<br />The Future</h1>
        <p className="hero-subtitle">
          POST MARKETS. VOTE /// YES /// OR /// NO ///. WIN TOKENS. DYNAMIC ODDS ALGORITHM POWERED BY COLLECTIVE INTELLIGENCE.
        </p>
        <div className="hero-stats">
          <div className="stat-item">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Markets</div>
          </div>
          <div className="stat-item" style={{ borderLeft: '3px solid var(--border)', paddingLeft: '2rem' }}>
            <div className="stat-value" style={{ color: 'var(--yes-color)', textShadow: '2px 2px 0px var(--yes-dark)' }}>{stats.live}</div>
            <div className="stat-label">Live_Now</div>
          </div>
          <div className="stat-item" style={{ borderLeft: '3px solid var(--border)', paddingLeft: '2rem' }}>
            <div className="stat-value" style={{ color: 'var(--gold)', textShadow: '2px 2px 0px rgba(255,230,0,0.4)' }}>{stats.pool.toFixed(0)}</div>
            <div className="stat-label">Total_Volume</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        {/* Categories Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <label htmlFor="category-select" style={{ fontWeight: 700, opacity: 0.8 }}>Category</label>
          <select
            id="category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-input"
            style={{ width: '160px', minWidth: '120px', padding: '0.35rem 0.7rem', borderRadius: '8px' }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
            {/* Status */}
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                id={`filter-status-${f.value || 'all'}`}
                className={`filter-chip ${status === f.value ? 'active' : ''}`}
                onClick={() => setStatus(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            id="sort-select"
            className="form-input"
            style={{ width: 'auto', padding: '0.3rem 2rem 0.3rem 0.75rem', fontSize: '0.82rem', borderRadius: '8px' }}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎲</div>
          <div className="empty-title">No markets yet</div>
          <p>Be the first to post a prediction question!</p>
        </div>
      ) : (
        <div className="questions-grid">
          {questions.map((q) => (
            <QuestionCard key={q._id} question={q} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '2rem' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              id={`page-${p}`}
              className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
