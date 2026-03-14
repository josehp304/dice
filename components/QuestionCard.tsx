'use client';

import Link from 'next/link';
import OddsBar from '@/components/OddsBar';
import { formatDistanceToNow } from 'date-fns';

interface QuestionCardProps {
  question: {
    _id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    outcome: string | null;
    expiresAt: string;
    totalYesBets: number;
    totalNoBets: number;
    totalYesAmount: number;
    totalNoAmount: number;
    creatorUsername: string;
    createdAt: string;
  };
}

const categoryEmoji: Record<string, string> = {
  Sports: '⚽',
  Politics: '🏛️',
  Crypto: '₿',
  Entertainment: '🎬',
  Science: '🔬',
  Technology: '💻',
  Finance: '📈',
  Other: '🎯',
};

export default function QuestionCard({ question }: QuestionCardProps) {
  const totalBets = question.totalYesBets + question.totalNoBets;
  const totalPool = question.totalYesAmount + question.totalNoAmount;
  const isExpired = new Date(question.expiresAt) < new Date();

  const statusDisplay = question.status === 'resolved'
    ? { label: question.outcome === 'yes' ? '✓ YES Won' : '✕ NO Won', cls: question.outcome === 'yes' ? 'badge-open' : 'badge-closed' }
    : question.status === 'closed' || isExpired
    ? { label: 'Closed', cls: 'badge-closed' }
    : { label: 'Live', cls: 'badge-open' };

  return (
    <Link href={`/questions/${question._id}`} style={{ textDecoration: 'none' }}>
      <div className="card card-clickable">
        <div className="question-card">
          <div className="question-meta">
            <span className={`badge ${statusDisplay.cls}`}>{statusDisplay.label}</span>
            <span className="badge badge-category">
              {categoryEmoji[question.category] || '🎯'} {question.category}
            </span>
          </div>

          <h3 className="question-title">{question.title}</h3>
          <p className="question-desc">{question.description}</p>

          <OddsBar yesAmount={question.totalYesAmount} noAmount={question.totalNoAmount} />

          <div className="question-footer">
            <span>👥 {totalBets} bets · 🪙 {totalPool.toFixed(0)} pool</span>
            <span>
              {isExpired || question.status !== 'open'
                ? 'Expired'
                : `Closes ${formatDistanceToNow(new Date(question.expiresAt), { addSuffix: true })}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
