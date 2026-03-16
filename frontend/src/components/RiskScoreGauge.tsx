interface RiskScoreGaugeProps {
  score: number; // 0–1
  size?: 'sm' | 'md' | 'lg';
}

function getColor(score: number) {
  if (score >= 0.65) return '#ef4444';
  if (score >= 0.35) return '#f59e0b';
  return '#10b981';
}

export default function RiskScoreGauge({ score, size = 'md' }: RiskScoreGaugeProps) {
  const pct = Math.round(score * 100);
  const color = getColor(score);
  const radius = size === 'lg' ? 52 : size === 'sm' ? 28 : 40;
  const strokeWidth = size === 'sm' ? 5 : 7;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score);
  const svgSize = (radius + strokeWidth) * 2 + 8;
  const labelSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="#21212a"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold tabular-nums ${labelSize}`} style={{ color }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}
