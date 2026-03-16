import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { Shield, ArrowUpRight, LayoutDashboard, AlertTriangle, TrendingUp, Network, Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../api';

/* ─── ticker ──────────────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  'Automated Risk Scoring','ML-Powered Detection','Network Fraud Analysis',
  'Explainable AI','Analyst Feedback Loop','Ensemble ML Models',
  'Fraud Pattern Recognition','Transaction Intelligence',
];
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{ height:28, borderBottom:'1px solid rgba(255,255,255,0.04)',
      background:'rgba(201,164,108,0.025)', overflow:'hidden', display:'flex', alignItems:'center' }}>
      <div style={{ display:'flex', alignItems:'center', animation:'ticker 38s linear infinite', width:'max-content' }}>
        {items.map((item,i)=>(
          <span key={i} style={{ display:'flex', alignItems:'center' }}>
            <span style={{ fontSize:9.5, fontWeight:500, color:'rgba(201,164,108,0.4)',
              letterSpacing:'0.07em', textTransform:'uppercase', whiteSpace:'nowrap', padding:'0 18px' }}>
              {item}
            </span>
            <span style={{ width:2.5, height:2.5, borderRadius:'50%', background:'rgba(201,164,108,0.18)', flexShrink:0 }} />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── right panel tab ─────────────────────────────────────────────────────── */
const TABS = [
  { to:'/dashboard', icon:LayoutDashboard, label:'Overview',     sub:'Live stats' },
  { to:'/alerts',    icon:AlertTriangle,   label:'Fraud Alerts', sub:'Risk queue' },
  { to:'/analytics', icon:TrendingUp,      label:'Analytics',    sub:'Trend reports' },
  { to:'/network',   icon:Network,         label:'Network Graph',sub:'Entity graph' },
  { to:'/upload',    icon:Upload,          label:'Upload Data',  sub:'Import CSV' },
];

function TabItem({
  to, icon:Icon, label, sub, badge,
}: { to:string; icon:React.ElementType; label:string; sub:string; badge?: number }) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(to);
  const [hov, setHov] = useState(false);
  const lit = active || hov;

  return (
    <NavLink to={to}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
        borderRadius:10, textDecoration:'none', transition:'all 0.18s',
        background: active ? 'rgba(201,164,108,0.07)' : hov ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: `1px solid ${active ? 'rgba(201,164,108,0.22)' : 'transparent'}`,
        position:'relative',
      }}>
      {active && (
        <span style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)',
          width:2.5, height:18, borderRadius:2, background:'#c9a46c',
          boxShadow:'0 0 8px rgba(201,164,108,0.6)' }} />
      )}
      <div style={{ position:'relative', width:30, height:30, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
        background: active ? 'rgba(201,164,108,0.15)' : 'rgba(255,255,255,0.04)',
        border:`1px solid ${active ? 'rgba(201,164,108,0.28)' : 'rgba(255,255,255,0.06)'}`,
        transition:'all 0.18s' }}>
        <Icon style={{ width:13, height:13, color: active ? '#c9a46c' : lit ? '#9aa0a6' : '#7a7a8a', transition:'color 0.18s' }} />
        {badge != null && badge > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, minWidth:14, height:14, borderRadius:7,
            background:'#ef4444', border:'1.5px solid #2a2a2a', fontSize:8, fontWeight:700,
            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 2px' }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color: active ? '#e2e8f0' : lit ? '#9aa0a6' : '#7a7a8a',
          letterSpacing:'-0.01em', transition:'color 0.18s', whiteSpace:'nowrap' }}>
          {label}
        </div>
        <div style={{ fontSize:10, color: active ? 'rgba(201,164,108,0.6)' : '#555568',
          marginTop:1, transition:'color 0.18s' }}>
          {sub}
        </div>
      </div>
    </NavLink>
  );
}

/* ─── layout ──────────────────────────────────────────────────────────────── */
export default function Layout() {
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const prevHighRisk = useRef<number | null>(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // Scroll main content to top on every route change
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  const { data: activity, dataUpdatedAt } = useQuery({
    queryKey: ['activity'],
    queryFn: transactionsApi.getActivity,
    refetchInterval: 20_000,
  });

  // Track seconds since last sync
  useEffect(() => {
    setSecondsSinceSync(0);
    const iv = setInterval(() => setSecondsSinceSync(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [dataUpdatedAt]);

  // Detect new high-risk alerts
  useEffect(() => {
    if (activity == null) return;
    const curr = activity.high_risk_count;
    if (prevHighRisk.current !== null && curr > prevHighRisk.current) {
      const diff = curr - prevHighRisk.current;
      setNewAlertCount(n => n + diff);
      // Auto-clear badge after 30s
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = setTimeout(() => setNewAlertCount(0), 30_000);
    }
    prevHighRisk.current = curr;
  }, [activity]);

  // Cleanup alert timeout on unmount
  useEffect(() => {
    return () => { if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current); };
  }, []);

  const syncLabel = secondsSinceSync < 5
    ? 'Just synced'
    : secondsSinceSync < 60
    ? `Synced ${secondsSinceSync}s ago`
    : `Synced ${Math.floor(secondsSinceSync / 60)}m ago`;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh',
      background:'#2a2a2a', fontFamily:'Inter,system-ui,sans-serif' }}>

      <style>{`
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .serif { font-family:'Playfair Display',Georgia,serif; }
        .gold-gradient {
          background:linear-gradient(135deg,#c9a46c 0%,#e8cfa0 50%,#c9a46c 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
      `}</style>

      {/* ── top bar ──────────────────────────────────────────────── */}
      <header style={{ flexShrink:0, zIndex:50,
        background:'rgba(42,42,42,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.055)' }}>
        <div style={{ maxWidth:'100%', padding:'0 24px', height:52,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* logo */}
          <Link to="/dashboard" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none', flexShrink:0 }}>
            <div style={{ width:27,height:27,borderRadius:7,background:'rgba(201,164,108,0.14)',
              border:'1px solid rgba(201,164,108,0.28)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Shield style={{ width:12,height:12,color:'#c9a46c' }} />
            </div>
            <span style={{ fontSize:13,fontWeight:700,color:'#e2e8f0',letterSpacing:'-0.02em' }}>FraudIQ</span>
          </Link>

          {/* live status */}
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {/* new alert flash */}
            {newAlertCount > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:6,
                background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
                animation:'fadeSlideIn 0.3s ease' }}>
                <span style={{ width:5,height:5,borderRadius:'50%',background:'#ef4444',display:'inline-block',
                  boxShadow:'0 0 6px #ef4444', animation:'blink 1s ease-in-out infinite' }} />
                <span style={{ fontSize:11,color:'#fca5a5',fontWeight:600 }}>
                  {newAlertCount} new high-risk alert{newAlertCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:5,height:5,borderRadius:'50%',background:'#34d399',
                display:'inline-block',boxShadow:'0 0 6px #34d399',animation:'blink 2.5s ease-in-out infinite' }} />
              <div>
                <span style={{ fontSize:11,color:'#34d399',fontWeight:500,letterSpacing:'0.04em' }}>Active</span>
                <span style={{ fontSize:10,color:'#7a7a8a',marginLeft:5 }}>{syncLabel}</span>
              </div>
            </div>
          </div>
        </div>
        <Ticker />
      </header>

      {/* ── body: content + right panel ──────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* main content */}
        <main ref={mainRef} style={{ flex:1, overflowY:'auto', minWidth:0 }}>
          <Outlet />
        </main>

        {/* ── RIGHT PANEL ────────────────────────────────────────── */}
        <aside style={{ width:196, flexShrink:0, display:'flex', flexDirection:'column',
          borderLeft:'1px solid rgba(255,255,255,0.05)',
          background:'rgba(255,255,255,0.012)' }}>

          <div style={{ padding:'20px 14px 10px' }}>
            <span style={{ fontSize:9.5,fontWeight:600,color:'#555568',
              textTransform:'uppercase',letterSpacing:'0.1em' }}>Navigation</span>
          </div>

          <nav style={{ padding:'0 8px', display:'flex', flexDirection:'column', gap:3 }}>
            {TABS.map(t => (
              <TabItem
                key={t.to}
                {...t}
                badge={t.to === '/alerts' && newAlertCount > 0 ? newAlertCount : undefined}
              />
            ))}
          </nav>

          <div style={{ margin:'16px 14px', height:1, background:'rgba(255,255,255,0.05)' }} />

          {/* high risk count */}
          {activity && activity.high_risk_count > 0 && (
            <div style={{ margin:'12px 8px 0', padding:'10px 14px', borderRadius:10,
              background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.12)' }}>
              <div style={{ fontSize:9.5, fontWeight:600, color:'rgba(239,68,68,0.5)',
                textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>High Risk</div>
              <div style={{ fontSize:20, fontWeight:700, color:'#fca5a5', letterSpacing:'-0.02em' }}>
                {activity.high_risk_count.toLocaleString()}
              </div>
              <div style={{ fontSize:10, color:'#7a7a8a', marginTop:2 }}>flagged transactions</div>
            </div>
          )}

          <div style={{ flex:1 }} />

          <div style={{ padding:'16px 14px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            <Link to="/"
              style={{ display:'flex',alignItems:'center',gap:6,textDecoration:'none',
                padding:'8px 10px',borderRadius:8,transition:'background 0.15s',
                background:'transparent' }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.03)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div style={{ width:22,height:22,borderRadius:6,background:'rgba(201,164,108,0.12)',
                border:'1px solid rgba(201,164,108,0.22)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <ArrowUpRight style={{ width:10,height:10,color:'#c9a46c',transform:'rotate(180deg)' }} />
              </div>
              <span style={{ fontSize:11,color:'#7a7a8a',fontWeight:500 }}>Back to home</span>
            </Link>
          </div>

        </aside>
      </div>
    </div>
  );
}
