import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, AlertTriangle, Store, MapPin, WifiOff } from 'lucide-react';

function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
      <div style={{ width:32, height:32, borderRadius:9, background:'rgba(201,164,108,0.1)',
        border:'1px solid rgba(201,164,108,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon style={{ width:15, height:15, color:'#c9a46c' }} />
      </div>
      <div>
        <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0', letterSpacing:'-0.01em' }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:'#7a7a8a', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: trends, isLoading, isError } = useQuery({
    queryKey: ['trends'],
    queryFn: transactionsApi.getTrends,
    staleTime: 10_000,
  });

  const hasData =
    (trends?.daily_alerts?.length ?? 0) > 0 ||
    (trends?.probability_distribution?.length ?? 0) > 0;

  if (isLoading || isError || !hasData) {
    return (
      <div className="p-8">
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#c9a46c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Intelligence Reports
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.1 }}>
            Fraud Trend{' '}
            <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>Analytics</span>
          </h1>
        </div>
        <div className="card py-16 text-center">
          {isLoading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <div style={{ width:16, height:16, border:'2px solid rgba(201,164,108,0.25)', borderTopColor:'#c9a46c',
                borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <span className="text-slate-400 text-sm">Loading analytics...</span>
            </div>
          ) : isError ? (
            <>
              <WifiOff className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Failed to load analytics</p>
              <p className="text-slate-500 text-sm mt-2">Check that the backend is running.</p>
            </>
          ) : (
            <>
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No analytics data available</p>
              <p className="text-slate-500 text-sm mt-2">Upload a transaction dataset to generate fraud analytics.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#c9a46c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Intelligence Reports
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.1 }}>
          Fraud Trend{' '}
          <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
            Analytics
          </span>
        </h1>
        <p style={{ fontSize: 13, color: '#7a7a8a', marginTop: 6 }}>Systemic patterns and fraud intelligence insights</p>
      </div>

      {/* Daily alerts — full width */}
      <div className="card">
        <SectionHeader icon={AlertTriangle} title="Daily Fraud Alerts" sub="High-risk transactions over time" />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trends?.daily_alerts ?? []}>
            <defs>
              <linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill:'#7a7a8a', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={(v)=>v.slice(5)} />
            <YAxis tick={{ fill:'#7a7a8a', fontSize:11 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ background:'#353535', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8 }}
              labelStyle={{ color:'#6b7280' }} itemStyle={{ color:'#ef4444' }} />
            <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} fill="url(#alertFill)" name="Alerts" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Probability distribution */}
      {(trends?.probability_distribution?.length ?? 0) > 0 && (
        <div className="card">
          <SectionHeader icon={TrendingUp} title="Risk Score Distribution" sub="How fraud probability is spread across all transactions" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trends?.probability_distribution ?? []} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="range" tick={{ fill:'#7a7a8a', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#7a7a8a', fontSize:11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background:'#353535', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8 }}
                labelStyle={{ color:'#94a3b8' }} itemStyle={{ color:'#c9a46c' }} />
              <Bar dataKey="count" radius={[4,4,0,0]} name="Transactions"
                fill="url(#distGradient)" />
              <defs>
                <linearGradient id="distGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a46c" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#c9a46c" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top merchants + Location risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top high-risk merchants */}
        <div className="card">
          <SectionHeader icon={Store} title="Top High-Risk Merchants" sub="Most fraud-flagged merchants" />
          {(trends?.top_merchants?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={trends?.top_merchants?.slice(0, 8) ?? []}
                layout="vertical"
                margin={{ left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="merchant"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                />
                <Tooltip
                  contentStyle={{ background: '#353535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#ef4444' }}
                />
                <Bar dataKey="fraud_count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Fraud Alerts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No data</div>
          )}
        </div>

        {/* Geographic risk */}
        <div className="card">
          <SectionHeader icon={MapPin} title="Geographic Risk Patterns" sub="Average fraud risk by location" />
          <div className="space-y-2 overflow-y-auto max-h-64">
            {(trends?.risk_by_location ?? []).map((loc, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-4 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-300">{loc.location}</span>
                    <span className={`text-xs font-semibold tabular-nums ${
                      loc.avg_risk >= 0.65 ? 'text-danger-light' :
                      loc.avg_risk >= 0.35 ? 'text-warning-light' :
                      'text-success-light'
                    }`}>
                      {(loc.avg_risk * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        loc.avg_risk >= 0.65 ? 'bg-danger' :
                        loc.avg_risk >= 0.35 ? 'bg-warning' :
                        'bg-success'
                      }`}
                      style={{ width: `${loc.avg_risk * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-600">{loc.transaction_count}tx</span>
              </div>
            ))}
            {(trends?.risk_by_location?.length ?? 0) === 0 && (
              <div className="py-8 text-center text-slate-500 text-sm">No location data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
