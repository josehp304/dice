'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';

const CATEGORIES = ['Sports', 'Politics', 'Crypto', 'Entertainment', 'Science', 'Technology', 'Finance', 'Other'];

const EXAMPLE_QUESTIONS = [
  'Will Bitcoin reach $100,000 before the end of this year?',
  'Will the home team win the next World Cup?',
  'Will AI pass the Turing test by 2025?',
  'Will the next iPhone have a folding screen?',
];

export default function CreatePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Crypto',
    expiresAt: '',
  });
  const [loading, setLoading] = useState(false);

  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 1);
  const minDateStr = minDate.toISOString().slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { showToast('Please login to post a question', 'error'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Market created! 🎯', 'success');
      router.push(`/questions/${data.question._id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create question', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="question-detail" style={{ maxWidth: 600 }}>
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div className="empty-title">Login Required</div>
          <p>You need to be logged in to post a prediction question.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Go to Markets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1.5rem 3rem' }}>
      <Link href="/" className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
        ← Back to Markets
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          📝 Post a Prediction Market
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Ask a YES/NO question about the future. Other users will bet on the outcome using parimutuel odds.
        </p>
      </div>

      {/* Examples */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-hover)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          💡 Example Questions
        </p>
        {EXAMPLE_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => setForm({ ...form, title: q })}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem 0', lineHeight: 1.5 }}
          >
            → {q}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Question Title *</label>
            <input
              id="question-title"
              className="form-input"
              placeholder="Will X happen by date Y?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={200}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{form.title.length}/200</span>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              id="question-description"
              className="form-input"
              placeholder="Provide context, sources, or resolution criteria..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={4}
              maxLength={1000}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label className="form-label">Category *</label>
              <select
                id="question-category"
                className="form-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label className="form-label">Closes At *</label>
             <input
                id="question-expires"
                type="datetime-local"
                className="form-input"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                min={minDateStr}
                required
              /> 
            </div>
          </div>

          {/* Preview odds */}
          <div style={{ background: 'rgba(16,217,118,0.06)', border: '1px solid rgba(16,217,118,0.15)', borderRadius: '12px', padding: '1rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--yes-color)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🎲 Initial Odds
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Both YES and NO start at <strong style={{ color: 'var(--text-primary)' }}>2.00x</strong> (50/50).
              As bets come in, odds shift dynamically — more money on one side means lower return for that side.
            </p>
          </div>

          <button
            id="submit-question"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ padding: '0.85rem', fontSize: '1rem' }}
          >
            {loading ? <span className="spinner" /> : '🚀 Launch This Market'}
          </button>
        </form>
      </div>
    </div>
  );
}
