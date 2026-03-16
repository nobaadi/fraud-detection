import { AlertTriangle, MapPin, Zap, Store, Smartphone, DollarSign } from 'lucide-react';

interface RiskExplanationProps {
  riskFactors: string | string[] | null | undefined;
  fraudProbability?: number;
}

function getIcon(factor: string) {
  const f = factor.toLowerCase();
  if (f.includes('amount') || f.includes('$')) return DollarSign;
  if (f.includes('location') || f.includes('km')) return MapPin;
  if (f.includes('velocity') || f.includes('frequency') || f.includes('transactions')) return Zap;
  if (f.includes('merchant')) return Store;
  if (f.includes('device')) return Smartphone;
  return AlertTriangle;
}

function getFactorColor(factor: string) {
  const f = factor.toLowerCase();
  if (f.includes('location') || f.includes('km')) return 'text-danger border-danger/20 bg-danger-muted/50';
  if (f.includes('amount') || f.includes('$') || f.includes('high-value')) return 'text-warning border-warning/20 bg-warning-muted/50';
  if (f.includes('velocity') || f.includes('frequency')) return 'text-danger border-danger/20 bg-danger-muted/50';
  if (f.includes('merchant')) return 'text-warning border-warning/20 bg-warning-muted/50';
  if (f.includes('device')) return 'text-brand-light border-brand/20 bg-brand/10';
  return 'text-slate-300 border-surface-500 bg-surface-700';
}

export default function RiskExplanation({ riskFactors, fraudProbability }: RiskExplanationProps) {
  let factors: string[] = [];
  if (Array.isArray(riskFactors)) {
    factors = riskFactors;
  } else if (typeof riskFactors === 'string') {
    try {
      factors = JSON.parse(riskFactors);
    } catch {
      factors = riskFactors ? [riskFactors] : [];
    }
  }

  if (factors.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic">No risk factors identified.</div>
    );
  }

  return (
    <div className="space-y-2">
      {factors.map((factor, i) => {
        const Icon = getIcon(factor);
        const colorClass = getFactorColor(factor);
        return (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${colorClass}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{factor}</span>
          </div>
        );
      })}
    </div>
  );
}
