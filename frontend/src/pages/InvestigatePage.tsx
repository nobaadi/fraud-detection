import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api';
import RiskBadge from '../components/RiskBadge';
import RiskScoreGauge from '../components/RiskScoreGauge';
import RiskExplanation from '../components/RiskExplanation';
import TransactionTable from '../components/TransactionTable';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  ArrowLeft,
  User,
  Store,
  MapPin,
  Smartphone,
  Clock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

type ReviewStatus = 'confirmed_fraud' | 'false_positive' | null;

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-surface-700 last:border-0">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-sm text-slate-200 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function SignalPill({ label, value, active }: { label: string; value: string | number; active?: boolean }) {
  return (
    <div className={`flex flex-col items-center p-3 rounded-lg border text-center ${
      active ? 'border-warning/30 bg-warning-muted/50' : 'border-surface-600 bg-surface-700'
    }`}>
      <span className={`text-lg font-bold tabular-nums ${active ? 'text-warning-light' : 'text-white'}`}>{value}</span>
      <span className={`text-xs mt-0.5 ${active ? 'text-warning/80' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

const FEATURE_LABELS: Record<string, string> = {
  amount_deviation: 'Amount Deviation',
  location_deviation: 'Location Deviation',
  transaction_velocity: 'Transaction Velocity',
  merchant_novelty: 'Merchant Novelty',
  device_novelty: 'Device Novelty',
  amount: 'Transaction Amount',
};

const FEATURE_EXPLANATIONS: Record<string, string> = {
  amount_deviation: 'How far this amount is from the user\'s normal spending behavior.',
  location_deviation: 'Distance from the user\'s recent transaction locations.',
  transaction_velocity: 'How quickly this user is making transactions in a short time window.',
  merchant_novelty: 'Whether this merchant is new for this user.',
  device_novelty: 'Whether this device has been seen for this user before.',
  amount: 'Raw transaction amount, which can increase or decrease risk depending on context.',
};

function ShapTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0]?.payload;
  if (!item) {
    return null;
  }

  const direction = item.value >= 0 ? 'Pushes toward fraud risk' : 'Pushes away from fraud risk';
  const directionColor = item.value >= 0 ? '#fca5a5' : '#6ee7b7';

  return (
    <div className="rounded-lg border border-surface-600 bg-surface-800 p-3 max-w-xs shadow-lg">
      <p className="text-sm font-semibold text-white mb-1">{item.label}</p>
      <p className="text-xs text-slate-400 mb-2">{item.description}</p>
      <p className="text-xs" style={{ color: directionColor }}>
        {direction} ({item.value.toFixed(4)})
      </p>
    </div>
  );
}

export default function InvestigatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tx, isLoading, isError } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionsApi.getTransaction(id!),
    enabled: !!id,
  });

  const { data: userHistory } = useQuery({
    queryKey: ['user-history', id],
    queryFn: () => transactionsApi.getUserHistory(id!),
    enabled: !!id,
  });

  const { data: merchantHistory } = useQuery({
    queryKey: ['merchant-history', id],
    queryFn: () => transactionsApi.getMerchantHistory(id!),
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const review: ReviewStatus = (tx?.review_status as ReviewStatus) ?? null;

  const reviewMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      transactionsApi.reviewTransaction(id!, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['transaction', id], updated);
    },
  });

  function handleReview(status: ReviewStatus) {
    if (!tx) return;
    const next = review === status ? 'clear' : (status ?? 'clear');
    reviewMutation.mutate({ status: next });
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">Loading transaction details...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <button onClick={() => navigate(-1)} className="btn-ghost mb-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="card text-center py-12 text-slate-400">Failed to load transaction. Check that the backend is running.</div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="p-8">
        <button onClick={() => navigate(-1)} className="btn-ghost mb-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="card text-center py-12 text-slate-400">Transaction not found.</div>
      </div>
    );
  }

  const prob = tx.fraud_probability ?? 0;
  const amountDev = tx.amount_deviation ?? 0;
  const locDev = tx.location_deviation ?? 0;
  const velocity = tx.transaction_velocity ?? 0;
  const shapChartData = Object.entries(tx.shap_values ?? {})
    .map(([feature, value]) => ({
      feature,
      value,
      label: FEATURE_LABELS[feature] ?? feature,
      description: FEATURE_EXPLANATIONS[feature] ?? 'Feature contribution to model output.',
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const chartHeight = Math.max(240, shapChartData.length * 44);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={() => navigate(-1)} className="btn-ghost"
            style={{ display:'flex', alignItems:'center', gap:6 }}>
            <ArrowLeft style={{ width:14, height:14 }} /> Back
          </button>
          <div>
            <span className="page-label">Transaction Investigation</span>
            <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontStyle:'italic',
                fontWeight:400, color:'rgba(255,255,255,0.28)', fontSize:22, letterSpacing:'-0.01em' }}>
                {tx.transaction_id}
              </span>
              {tx.risk_level && <RiskBadge level={tx.risk_level} />}
            </h1>
          </div>
        </div>

        {/* Review actions */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {review && (
            <span style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:6,
              background: review === 'confirmed_fraud' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${review === 'confirmed_fraud' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.2)'}`,
              color: review === 'confirmed_fraud' ? '#fca5a5' : '#6ee7b7',
              letterSpacing:'0.05em', textTransform:'uppercase' }}>
              {review === 'confirmed_fraud' ? 'Confirmed Fraud' : 'False Positive'}
            </span>
          )}
          <button onClick={() => handleReview('confirmed_fraud')} style={{
            padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
            background: review === 'confirmed_fraud' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${review === 'confirmed_fraud' ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
            color: review === 'confirmed_fraud' ? '#fca5a5' : '#7a7a8a',
            transition:'all 0.15s',
          }}>Confirm Fraud</button>
          <button onClick={() => handleReview('false_positive')} style={{
            padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
            background: review === 'false_positive' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${review === 'false_positive' ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.08)'}`,
            color: review === 'false_positive' ? '#6ee7b7' : '#7a7a8a',
            transition:'all 0.15s',
          }}>False Positive</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Risk score + explanation */}
        <div className="space-y-6">
          {/* Risk gauge */}
          <div className="card text-center">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Fraud Risk Score
            </h2>
            <div className="flex justify-center mb-4">
              <RiskScoreGauge score={prob} size="lg" />
            </div>
            <div className="flex items-center justify-center gap-2">
              {tx.risk_level && <RiskBadge level={tx.risk_level} />}
              <span className="text-xs text-slate-500">Confidence</span>
            </div>
          </div>

          {/* Fraud signals */}
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Fraud Signals
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <SignalPill
                label="Amt Deviation"
                value={`${amountDev > 0 ? '+' : ''}${amountDev.toFixed(1)}σ`}
                active={Math.abs(amountDev) > 3}
              />
              <SignalPill
                label="Location Δ"
                value={locDev > 0 ? `${Math.round(locDev)}km` : '0km'}
                active={locDev > 300}
              />
              <SignalPill
                label="Velocity/hr"
                value={velocity}
                active={velocity >= 3}
              />
              <SignalPill
                label="New Merchant"
                value={tx.merchant_novelty ? 'Yes' : 'No'}
                active={tx.merchant_novelty === true}
              />
              <SignalPill
                label="New Device"
                value={tx.device_novelty ? 'Yes' : 'No'}
                active={tx.device_novelty === true}
              />
            </div>
          </div>
        </div>

        {/* Middle: Transaction details */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Transaction Details
            </h2>
            <div className="space-y-0">
              <InfoRow label="Amount" value={
                <span className="font-bold text-white text-base">
                  ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              } />
              <InfoRow label="Merchant" value={tx.merchant} />
              <InfoRow label="Category" value={tx.merchant_category} />
              <InfoRow label="Location" value={
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" /> {tx.location}
                </span>
              } />
              <InfoRow
                label="Coordinates"
                value={tx.latitude ? `${tx.latitude.toFixed(4)}, ${tx.longitude?.toFixed(4)}` : 'N/A'}
                mono
              />
              <InfoRow label="Device" value={
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-slate-500" /> {tx.device_type.replace('_', ' ')}
                </span>
              } />
              <InfoRow label="Timestamp" value={
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {format(new Date(tx.timestamp), 'MMM d, yyyy HH:mm')}
                </span>
              } />
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Account Info
            </h2>
            <div>
              <InfoRow label="User ID" value={<span className="font-mono text-slate-300">{tx.user_id}</span>} />
              <InfoRow label="Total Transactions" value={userHistory?.length ?? '—'} />
            </div>
          </div>
        </div>

        {/* Right: Risk explanation + SHAP */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Risk Factors
            </h2>
            <RiskExplanation
              riskFactors={tx.risk_factors}
              fraudProbability={tx.fraud_probability}
            />
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Explainability Analysis (SHAP values)
            </h2>
            <p className="text-xs text-slate-500 mb-4">Why this was flagged</p>

            {shapChartData.length === 0 ? (
              <div className="text-sm text-slate-500 italic">SHAP values unavailable for this transaction.</div>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={shapChartData} layout="vertical" margin={{ left: 8, right: 20, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={130}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                  <Tooltip content={<ShapTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                    {shapChartData.map((entry) => (
                      <Cell key={entry.feature} fill={entry.value >= 0 ? '#ef4444' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* User transaction history */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-slate-300" />
            User Transaction History
            <span className="text-sm font-normal text-slate-500">({userHistory?.length ?? 0} recent)</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">{tx.user_id}</span>
        </div>
        <TransactionTable
          transactions={userHistory ?? []}
          showUser={false}
          highlightId={tx.transaction_id}
        />
      </div>

      {/* Merchant transaction history */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-slate-300" />
            Merchant Activity
            <span className="text-sm font-normal text-slate-500">({merchantHistory?.length ?? 0} recent)</span>
          </h2>
          <span className="text-xs text-slate-500">{tx.merchant}</span>
        </div>
        <TransactionTable
          transactions={merchantHistory ?? []}
          highlightId={tx.transaction_id}
        />
      </div>
    </div>
  );
}
