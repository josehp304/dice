'use client';

interface OddsBarProps {
  yesAmount: number;
  noAmount: number;
  showLabels?: boolean;
}

export default function OddsBar({ yesAmount, noAmount, showLabels = true }: OddsBarProps) {
  const total = yesAmount + noAmount;
  const yesPercent = total === 0 ? 50 : (yesAmount / total) * 100;
  const noPercent = 100 - yesPercent;

  const yesOdds = total === 0 ? 2.0 : Math.max(1.01, (1 / (yesAmount / total)) * 0.95);
  const noOdds = total === 0 ? 2.0 : Math.max(1.01, (1 / (noAmount / total)) * 0.95);

  return (
    <div>
      {showLabels && (
        <div className="question-odds" style={{ marginBottom: '0.4rem' }}>
          <span className="odds-yes">✓ YES {yesPercent.toFixed(0)}% · {yesOdds.toFixed(2)}x</span>
          <span className="odds-no">{noOdds.toFixed(2)}x · {noPercent.toFixed(0)}% NO ✕</span>
        </div>
      )}
      <div className="odds-bar">
        <div className="odds-bar-yes" style={{ width: `${yesPercent}%` }} />
        <div className="odds-bar-no" style={{ width: `${noPercent}%` }} />
      </div>
    </div>
  );
}
