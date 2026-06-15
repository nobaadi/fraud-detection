import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../api';
import {
  AlertTriangle,
  Activity,
  TrendingUp,
  Users,
  ChevronRight,
  RefreshCw,
  Upload,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useNavigate, Link } from 'react-router-dom';
import TransactionTable from '../components/TransactionTable';

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'brand',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'brand' | 'danger' | 'warning' | 'success';
}) {
  const colorMap = {
    brand: { bg: 'bg-brand/10 border-brand/20', icon: 'text-brand-light', value: 'text-white' },
    danger: { bg: 'bg-danger-muted border-danger/20', icon: 'text-danger-light', value: 'text-danger-light' },
    warning: { bg: 'bg-warning-muted border-warning/20', icon: 'text-warning-light', value: 'text-warning-light' },
    success: { bg: 'bg-success-muted border-success/20', icon: 'text-success-light', value: 'text-success-light' },
  };
  const c = colorMap[color];
  return (
    <div className={`card border ${c.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl font-bold tabular-nums ${c.value}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: overview, isLoading: loadingOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['overview'],
    queryFn: transactionsApi.getOverview,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['alerts', 'High'],
    queryFn: () => transactionsApi.getAlerts('High', 10),
    staleTime: 10_000,
  });

  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: transactionsApi.getTrends,
    staleTime: 10_000,
  });

  const { data: modelMetrics, isLoading: loadingModelMetrics } = useQuery({
    queryKey: ['model-metrics'],
    queryFn: transactionsApi.getModelMetrics,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false,
  });

  const recentAlerts = alerts?.slice(0, 5) ?? [];
  const dailyData = trends?.daily_alerts?.slice(-14) ?? [];

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loadingOverview) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
        <div style={{ width:20, height:20, border:'2px solid rgba(201,164,108,0.25)',
          borderTopColor:'#c9a46c', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!overview || overview.total_transactions === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        minHeight:'80vh', textAlign:'center', padding:'0 24px' }}>
        <div style={{ width:56, height:56, borderRadius:14, background:'rgba(201,164,108,0.1)',
          border:'1px solid rgba(201,164,108,0.22)', display:'flex', alignItems:'center', justifyContent:'center',
          marginBottom:24 }}>
          <Upload style={{ width:24, height:24, color:'#c9a46c' }} />
        </div>
        <span style={{ fontSize:11, fontWeight:600, color:'#c9a46c', textTransform:'uppercase',
          letterSpacing:'0.1em', marginBottom:12, display:'block' }}>No Data</span>
        <h2 style={{ fontSize:28, fontWeight:700, color:'#fff', letterSpacing:'-0.025em',
          lineHeight:1.1, margin:'0 0 12px' }}>
          Nothing to analyze yet
        </h2>
        <p style={{ fontSize:14, color:'#7a7a8a', lineHeight:1.7, maxWidth:380, marginBottom:36 }}>
          Upload a CSV of transactions to start fraud scoring, risk analysis, and network detection.
        </p>
        <Link to="/upload" style={{ display:'inline-flex', alignItems:'center', gap:8,
          padding:'10px 8px 10px 20px', borderRadius:999, fontSize:13, fontWeight:600,
          border:'1px solid rgba(201,164,108,0.32)', color:'#e2c090', textDecoration:'none',
          background:'rgba(201,164,108,0.07)' }}>
          Upload Transaction Data
          <div style={{ width:26, height:26, borderRadius:'50%', border:'1px solid rgba(201,164,108,0.28)',
            background:'rgba(201,164,108,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronRight style={{ width:11, height:11 }} />
          </div>
        </Link>
      </div>
    );
  }

  // ── Full dashboard ────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#c9a46c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Dashboard
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.1 }}>
            Fraud Intelligence{' '}
            <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
              Overview
            </span>
          </h1>
          <p style={{ fontSize: 13, color: '#7a7a8a', marginTop: 6 }}>
            Batch transaction analysis and risk scoring
          </p>
        </div>
        <button onClick={() => refetchOverview()} className="btn-ghost flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Total Transactions"
          value={overview.total_transactions.toLocaleString()}
          sub="All time"
          color="brand"
        />
        <StatCard
          icon={AlertTriangle}
          label="High-Risk Flagged"
          value={overview.fraud_alerts_today}
          sub="Fraud probability ≥ 65%"
          color="danger"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Fraud Probability"
          value={`${(overview.average_fraud_score * 100).toFixed(1)}%`}
          sub="Across all transactions"
          color="warning"
        />
        <StatCard
          icon={Users}
          label="Medium Risk"
          value={overview.medium_risk_count.toLocaleString()}
          sub={`${overview.low_risk_count} low risk`}
          color="warning"
        />
      </div>

      {/* Risk Distribution + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily alerts chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-white">Daily High-Risk Alerts</h2>
            <span className="text-xs text-slate-500">Last 14 days</span>
          </div>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background:'#353535', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8 }}
                  labelStyle={{ color:'#94a3b8' }} itemStyle={{ color:'#ef4444' }} />
                <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} fill="url(#alertGradient)" name="Alerts" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              No alert data yet. Upload a dataset to begin.
            </div>
          )}
        </div>

        {/* Risk breakdown */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-6">Risk Level Distribution</h2>
          <div className="space-y-4">
            {[
              { label: 'High Risk', count: overview.high_risk_count, color: 'risk-bar-high', text: 'text-danger-light' },
              { label: 'Medium Risk', count: overview.medium_risk_count, color: 'risk-bar-medium', text: 'text-warning-light' },
              { label: 'Low Risk', count: overview.low_risk_count, color: 'risk-bar-low', text: 'text-success-light' },
            ].map(({ label, count, color, text }) => {
              const total = overview.high_risk_count + overview.medium_risk_count + overview.low_risk_count;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-slate-400">{label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${text}`}>{count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width:`${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Model performance */}
      <div className="card border border-brand/15 bg-brand/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-brand/10 border border-brand/20">
              <BarChart3 className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Model Performance (Real Data)</h2>
              <p className="text-xs text-slate-500">Live model metrics from trained ensemble</p>
            </div>
          </div>
          {modelMetrics && (
            <span className="text-xs text-slate-500">
              Trained on {modelMetrics.dataset_size.toLocaleString()} transactions
            </span>
          )}
        </div>

        {loadingModelMetrics ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading model metrics...</div>
        ) : !modelMetrics ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Metrics unavailable. Train the model first by uploading a dataset.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <div className="p-3 rounded-lg border border-white/5 bg-surface-700/60">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">F1 Score</p>
                <p className="text-xl font-bold text-white tabular-nums">{(modelMetrics.f1_score * 100).toFixed(2)}%</p>
              </div>
              <div className="p-3 rounded-lg border border-white/5 bg-surface-700/60">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Precision</p>
                <p className="text-xl font-bold text-warning-light tabular-nums">{(modelMetrics.precision * 100).toFixed(2)}%</p>
              </div>
              <div className="p-3 rounded-lg border border-white/5 bg-surface-700/60">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Recall</p>
                <p className="text-xl font-bold text-danger-light tabular-nums">{(modelMetrics.recall * 100).toFixed(2)}%</p>
              </div>
              <div className="p-3 rounded-lg border border-white/5 bg-surface-700/60">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">ROC-AUC</p>
                <p className="text-xl font-bold text-success-light tabular-nums">{(modelMetrics.roc_auc * 100).toFixed(2)}%</p>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex flex-wrap gap-x-5 gap-y-1">
              <span>Fraud cases: {modelMetrics.fraud_count.toLocaleString()} ({(modelMetrics.fraud_rate * 100).toFixed(2)}%)</span>
              <span>TP: {modelMetrics.confusion_matrix.true_positives.toLocaleString()}</span>
              <span>FP: {modelMetrics.confusion_matrix.false_positives.toLocaleString()}</span>
              <span>FN: {modelMetrics.confusion_matrix.false_negatives.toLocaleString()}</span>
              <span>TN: {modelMetrics.confusion_matrix.true_negatives.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>

      {/* Top fraud alerts */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <h2 className="text-base font-semibold text-white">Top Fraud Alerts</h2>
          </div>
          <button className="btn-ghost flex items-center gap-1 text-xs" onClick={() => navigate('/alerts')}>
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {loadingAlerts ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading alerts...</div>
        ) : recentAlerts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No high-risk transactions detected.
          </div>
        ) : (
          <TransactionTable transactions={recentAlerts} />
        )}
      </div>
    </div>
  );
}
