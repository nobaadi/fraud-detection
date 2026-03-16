import { useNavigate } from 'react-router-dom';
import type { Transaction } from '../types';
import RiskBadge from './RiskBadge';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, MapPin, Cpu } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  showUser?: boolean;
  highlightId?: string;
}

export default function TransactionTable({
  transactions,
  showUser = true,
  highlightId,
}: TransactionTableProps) {
  const navigate = useNavigate();

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500">
        No transactions to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <th className="table-header text-left pb-3 pl-4">Transaction ID</th>
            {showUser && <th className="table-header text-left pb-3">User</th>}
            <th className="table-header text-left pb-3">Amount</th>
            <th className="table-header text-left pb-3">Merchant</th>
            <th className="table-header text-left pb-3">Location</th>
            <th className="table-header text-left pb-3">Device</th>
            <th className="table-header text-left pb-3">Risk Score</th>
            <th className="table-header text-left pb-3">Risk Level</th>
            <th className="table-header text-left pb-3">Time</th>
            <th className="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const isHighlighted = tx.transaction_id === highlightId;
            const prob = tx.fraud_probability ?? 0;
            const probColor =
              prob >= 0.65 ? 'text-danger' :
              prob >= 0.35 ? 'text-warning' :
              'text-success';

            return (
              <tr
                key={tx.transaction_id}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: isHighlighted ? 'rgba(201,164,108,0.05)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = isHighlighted ? 'rgba(201,164,108,0.08)' : 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = isHighlighted ? 'rgba(201,164,108,0.05)' : 'transparent')}
                onClick={() => navigate(`/investigate/${tx.transaction_id}`)}
              >
                <td className="py-3 pl-4">
                  <span className="font-mono text-xs text-slate-400">{tx.transaction_id}</span>
                </td>
                {showUser && (
                  <td className="py-3">
                    <span className="font-mono text-xs" style={{ color:'#9aa0a6' }}>{tx.user_id}</span>
                  </td>
                )}
                <td className="py-3">
                  <span className="font-semibold text-white">${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
                <td className="py-3">
                  <div className="text-slate-200">{tx.merchant}</div>
                  <div className="text-xs text-slate-500">{tx.merchant_category}</div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {tx.location}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Cpu className="w-3 h-3" />
                    {tx.device_type.replace('_', ' ')}
                  </div>
                </td>
                <td className="py-3">
                  <span className={`font-mono font-semibold text-sm tabular-nums ${probColor}`}>
                    {prob !== undefined ? `${(prob * 100).toFixed(1)}%` : '—'}
                  </span>
                </td>
                <td className="py-3">
                  {tx.risk_level ? <RiskBadge level={tx.risk_level} /> : <span className="text-slate-500">—</span>}
                </td>
                <td className="py-3 text-xs text-slate-500">
                  {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                </td>
                <td className="py-3 pr-4">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
