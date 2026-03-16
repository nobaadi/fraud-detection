import clsx from 'clsx';

interface RiskBadgeProps {
  level: string;
  size?: 'sm' | 'md';
}

export default function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const classes = clsx(
    'inline-flex items-center rounded-full font-semibold border',
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs',
    {
      'bg-danger-muted text-danger-light border-danger/30': level === 'High',
      'bg-warning-muted text-warning-light border-warning/30': level === 'Medium',
      'bg-success-muted text-success-light border-success/30': level === 'Low',
      'bg-surface-600 text-slate-400 border-surface-500': !['High', 'Medium', 'Low'].includes(level),
    }
  );

  return <span className={classes}>{level}</span>;
}
