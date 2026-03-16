import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../api';
import TransactionTable from '../components/TransactionTable';
import { Filter, AlertTriangle, Search, Download, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import type { Transaction } from '../types';

const RISK_LEVELS = ['High', 'Medium', 'Low'] as const;

function exportCSV(transactions: Transaction[]) {
  const headers = [
    'transaction_id', 'user_id', 'timestamp', 'amount', 'merchant',
    'merchant_category', 'location', 'device_type', 'fraud_probability',
    'risk_level', 'amount_deviation', 'transaction_velocity',
  ];
  const rows = transactions.map(tx => [
    tx.transaction_id,
    tx.user_id,
    tx.timestamp,
    tx.amount.toFixed(2),
    tx.merchant,
    tx.merchant_category,
    tx.location,
    tx.device_type,
    tx.fraud_probability != null ? (tx.fraud_probability * 100).toFixed(2) + '%' : '',
    tx.risk_level ?? '',
    tx.amount_deviation?.toFixed(2) ?? '',
    tx.transaction_velocity ?? '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fraud_alerts_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 50;

export default function AlertsPage() {
  const [minRisk, setMinRisk] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: alerts, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts', minRisk],
    queryFn: () => transactionsApi.getAlerts(minRisk, 200),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const filtered = useMemo(() => {
    if (!alerts) return [];
    const q = search.toLowerCase().trim();
    if (!q) return alerts;
    return alerts.filter(tx =>
      tx.transaction_id.toLowerCase().includes(q) ||
      tx.user_id.toLowerCase().includes(q) ||
      tx.merchant.toLowerCase().includes(q) ||
      tx.location.toLowerCase().includes(q)
    );
  }, [alerts, search]);

  // Reset to page 0 when filter/search changes
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#c9a46c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Risk Monitoring
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle style={{ width: 22, height: 22, color: '#ef4444', flexShrink: 0 }} />
            Fraud{' '}
            <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
              Alerts
            </span>
          </h1>
          <p style={{ fontSize: 13, color: '#7a7a8a', marginTop: 6 }}>
            {filtered.length}{alerts && filtered.length !== alerts.length ? ` of ${alerts.length}` : ''} transactions flagged as suspicious
          </p>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#7a7a8a', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search ID, user, merchant, location…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '7px 12px 7px 30px', fontSize: 12, color: '#e2e8f0',
                outline: 'none', width: 260,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,164,108,0.4)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
          {/* Risk filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            {RISK_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => { setMinRisk(level); setPage(0); }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  minRisk === level
                    ? level === 'High'
                      ? 'bg-danger-muted text-danger-light border-danger/40'
                      : level === 'Medium'
                      ? 'bg-warning-muted text-warning-light border-warning/40'
                      : 'bg-success-muted text-success-light border-success/40'
                    : 'text-slate-400 border-surface-600 hover:border-slate-500 bg-surface-700'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-600 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">
            Sorted by risk score — click any row to investigate
          </span>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-xs flex items-center gap-1.5"
              onClick={() => exportCSV(filtered)}
              disabled={filtered.length === 0}
              style={{ opacity: filtered.length === 0 ? 0.4 : 1 }}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button className="btn-ghost text-xs" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading fraud alerts...</div>
        ) : isError ? (
          <div className="py-16 text-center">
            <WifiOff className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Failed to load alerts</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">Check that the backend is running.</p>
            <button className="btn-ghost text-xs" onClick={() => refetch()}>Try again</button>
          </div>
        ) : (
          <TransactionTable transactions={paginated} />
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="py-16 text-center">
            <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">{search ? 'No matches found' : 'No alerts found'}</p>
            <p className="text-slate-500 text-sm mt-1">
              {search ? 'Try a different search term.' : 'Upload a transaction dataset to start fraud detection.'}
            </p>
          </div>
        )}
        {totalPages > 1 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:12, color:'#7a7a8a' }}>
              Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
                style={{ padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor: safePage === 0 ? 'not-allowed' : 'pointer',
                  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                  color: safePage === 0 ? '#555568' : '#9aa0a6', transition:'all 0.15s' }}>
                ← Prev
              </button>
              <span style={{ padding:'5px 10px', fontSize:12, color:'#7a7a8a' }}>
                {safePage + 1} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}
                style={{ padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                  color: safePage >= totalPages - 1 ? '#555568' : '#9aa0a6', transition:'all 0.15s' }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
