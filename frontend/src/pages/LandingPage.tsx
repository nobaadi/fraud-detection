import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Shield, ArrowUpRight, AlertTriangle, Activity } from 'lucide-react';

/* ─── fade-up ─────────────────────────────────────────────────────────────── */
function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

/* ─── mockup ──────────────────────────────────────────────────────────────── */
function Mockup() {
  const rows = [
    { id: 'TXN-8821', amt: '$12,450', risk: 94, tag: 'HIGH', c: '#ef4444' },
    { id: 'TXN-3309', amt: '$8,200',  risk: 87, tag: 'HIGH', c: '#ef4444' },
    { id: 'TXN-5541', amt: '$3,780',  risk: 71, tag: 'HIGH', c: '#ef4444' },
    { id: 'TXN-1192', amt: '$990',    risk: 54, tag: 'MED',  c: '#f59e0b' },
    { id: 'TXN-7703', amt: '$210',    risk: 18, tag: 'LOW',  c: '#10b981' },
  ];
  const bars = [28,50,36,72,58,88,42,78,48,62,35,70,54,82];
  return (
    <div style={{ background:'#0d0d12', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16,
      boxShadow:'0 60px 160px rgba(0,0,0,0.95)', overflow:'hidden',
      fontFamily:'Inter,system-ui,sans-serif', userSelect:'none' }}>
      <div style={{ background:'#101015', borderBottom:'1px solid rgba(255,255,255,0.05)',
        padding:'9px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:20,height:20,borderRadius:5,background:'rgba(201,164,108,0.18)',
            border:'1px solid rgba(201,164,108,0.28)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Shield style={{ width:10,height:10,color:'#c9a46c' }} />
          </div>
          <span style={{ fontSize:10,fontWeight:700,color:'#fff',letterSpacing:'-0.01em' }}>FraudIQ</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {['Overview','Alerts','Analytics','Network'].map(l=>(
            <span key={l} style={{ fontSize:9.5,color:l==='Overview'?'#e2e8f0':'#7a7a8a',fontWeight:500 }}>{l}</span>
          ))}
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:5 }}>
          <span style={{ width:5,height:5,borderRadius:'50%',background:'#34d399',display:'inline-block',boxShadow:'0 0 5px #34d399' }}/>
          <span style={{ fontSize:9,color:'#34d399',fontWeight:500 }}>Live</span>
        </div>
      </div>
      <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
          {[
            { l:'Transactions', v:'48,293', bg:'rgba(59,130,246,0.1)',  bd:'rgba(59,130,246,0.18)', t:'#93c5fd' },
            { l:'High Risk',    v:'127',    bg:'rgba(239,68,68,0.1)',   bd:'rgba(239,68,68,0.18)',  t:'#fca5a5' },
            { l:'Avg Score',    v:'34.2%',  bg:'rgba(245,158,11,0.1)', bd:'rgba(245,158,11,0.18)', t:'#fcd34d' },
            { l:'Prevented',    v:'$2.1M',  bg:'rgba(16,185,129,0.08)',bd:'rgba(16,185,129,0.18)', t:'#6ee7b7' },
          ].map(c=>(
            <div key={c.l} style={{ background:c.bg,border:`1px solid ${c.bd}`,borderRadius:8,padding:'7px 9px' }}>
              <div style={{ fontSize:8,color:'#4a4a5a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3 }}>{c.l}</div>
              <div style={{ fontSize:15,fontWeight:700,color:c.t,letterSpacing:'-0.02em' }}>{c.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:8 }}>
          <div style={{ background:'#101015',border:'1px solid rgba(255,255,255,0.04)',borderRadius:8,padding:'9px 11px' }}>
            <div style={{ fontSize:9,fontWeight:600,color:'#9aa0a6',marginBottom:8 }}>Daily High-Risk Alerts</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:2.5, height:48 }}>
              {bars.map((h,i)=>(
                <div key={i} style={{ flex:1,height:`${h}%`,borderRadius:'2px 2px 0 0',
                  background:i>=10?'rgba(239,68,68,0.65)':'rgba(239,68,68,0.2)' }} />
              ))}
            </div>
          </div>
          <div style={{ background:'#101015',border:'1px solid rgba(255,255,255,0.04)',borderRadius:8,padding:'9px 11px' }}>
            <div style={{ fontSize:9,fontWeight:600,color:'#9aa0a6',marginBottom:9 }}>Risk Levels</div>
            {([['High',22,'#ef4444','#fca5a5'],['Med',35,'#f59e0b','#fcd34d'],['Low',43,'#10b981','#6ee7b7']] as const).map(([l,p,c,t])=>(
              <div key={l} style={{ marginBottom:6 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:2.5 }}>
                  <span style={{ fontSize:8,color:'#4a4a5a' }}>{l}</span>
                  <span style={{ fontSize:8,fontWeight:700,color:t }}>{p}%</span>
                </div>
                <div style={{ height:3,background:'#1a1a22',borderRadius:2,overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${p}%`,background:c,borderRadius:2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:'#101015',border:'1px solid rgba(255,255,255,0.04)',borderRadius:8,overflow:'hidden' }}>
          <div style={{ padding:'7px 11px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:5 }}>
            <span style={{ width:5,height:5,borderRadius:'50%',background:'#ef4444',display:'inline-block',boxShadow:'0 0 4px #ef4444' }}/>
            <span style={{ fontSize:9,fontWeight:600,color:'#9aa0a6' }}>Top Fraud Alerts</span>
          </div>
          {rows.map((r,i)=>(
            <div key={r.id} style={{ display:'grid',gridTemplateColumns:'1fr 1fr 70px 42px',
              padding:'5px 11px',borderBottom:i<rows.length-1?'1px solid rgba(255,255,255,0.025)':'none',alignItems:'center' }}>
              <span style={{ fontSize:8.5,color:'#4a4a5a',fontFamily:'monospace' }}>{r.id}</span>
              <span style={{ fontSize:8.5,color:'#d1d5db',fontWeight:600 }}>{r.amt}</span>
              <div style={{ display:'flex',alignItems:'center',gap:3 }}>
                <div style={{ flex:1,height:2.5,background:'#1a1a22',borderRadius:1.5,overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${r.risk}%`,background:r.c,borderRadius:1.5 }} />
                </div>
                <span style={{ fontSize:8,color:'#6b7280' }}>{r.risk}%</span>
              </div>
              <span style={{ fontSize:7.5,fontWeight:700,padding:'2px 4px',borderRadius:3,textAlign:'center',
                background:`${r.c}18`,color:r.c,border:`1px solid ${r.c}30` }}>{r.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── marquee ─────────────────────────────────────────────────────────────── */
const PARTNERS = ['Python','FastAPI','PostgreSQL','scikit-learn','React','TypeScript','Pandas','Tailwind CSS','React Query','Recharts'];
function Marquee() {
  const list = [...PARTNERS, ...PARTNERS];
  return (
    <div style={{ overflow:'hidden' }}>
      <div style={{ display:'flex', gap:56, animation:'marquee 26s linear infinite', width:'max-content' }}>
        {list.map((n,i)=>(
          <span key={i} style={{ fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.1)',
            letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap',userSelect:'none' }}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── features ────────────────────────────────────────────────────────────── */
const FEATURES = [
  { n:'01', title:'Fraud Risk Scoring',    desc:'Ensemble ML risk scores for every transaction. Isolation Forest, Logistic Regression, and Random Forest combined.' },
  { n:'02', title:'Batch Analysis',        desc:'Upload a CSV dataset and get full fraud scoring, signal engineering, and risk classification instantly.' },
  { n:'03', title:'Network Analysis',      desc:'Graph detection of coordinated fraud rings invisible to rule-based systems.' },
  { n:'04', title:'Explainable AI',        desc:'Human-readable risk factors per transaction. Know exactly why a transaction was flagged.' },
  { n:'05', title:'Advanced Analytics',    desc:'Trend analysis, top high-risk merchants, and geographic risk patterns over your dataset.' },
  { n:'06', title:'Analyst Feedback Loop', desc:'Mark transactions as confirmed fraud or false positives. The model retrains on your verified labels.' },
];

function FeatureRow({ n, title, desc }: { n:string; title:string; desc:string }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'grid', gridTemplateColumns:'52px 1fr 1.4fr 36px',
        alignItems:'center', padding:'22px 0', gap:28, cursor:'default',
        borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize:11,fontWeight:600,color:hov?'#c9a46c':'#555568',
        fontFamily:'JetBrains Mono,monospace',transition:'color 0.2s',letterSpacing:'0.04em' }}>{n}</span>
      <span style={{ fontSize:15,fontWeight:600,color:hov?'#fff':'#9aa0a6',
        letterSpacing:'-0.015em',transition:'color 0.2s' }}>{title}</span>
      <span style={{ fontSize:13,color:'#7a7a8a',lineHeight:1.6 }}>{desc}</span>
      <div style={{ width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
        border:`1px solid ${hov?'rgba(201,164,108,0.4)':'rgba(255,255,255,0.06)'}`,
        background:hov?'rgba(201,164,108,0.08)':'transparent',transition:'all 0.2s' }}>
        <ArrowUpRight style={{ width:12,height:12,color:hov?'#c9a46c':'#555568',transition:'color 0.2s' }} />
      </div>
    </div>
  );
}


/* ─── landing page ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const mockY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const mockOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.2]);
  const [showScroll, setShowScroll] = useState(true);

  useEffect(() => {
    const onScroll = () => { if (window.scrollY > 60) setShowScroll(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background:'#2a2a2a', minHeight:'100vh', color:'#fff',
      fontFamily:'Inter,system-ui,sans-serif', overflowX:'clip' }}>

      <style>{`
        @keyframes marquee  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scrollBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        .serif { font-family:'Playfair Display',Georgia,serif; }
        .outlined { color:transparent; -webkit-text-stroke:1.5px rgba(255,255,255,0.15); }
        .gold-gradient {
          background:linear-gradient(135deg,#c9a46c 0%,#e8cfa0 50%,#c9a46c 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
      `}</style>

      {/* ── NAV ────────────────────────────────────────────────────────── */}
      <header style={{ position:'sticky',top:0,zIndex:50,
        background:'rgba(11,11,15,0.88)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.055)' }}>
        <div style={{ maxWidth:1280,margin:'0 auto',padding:'0 36px',height:58,
          display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <Link to="/" style={{ display:'flex',alignItems:'center',gap:9,textDecoration:'none' }}>
            <div style={{ width:29,height:29,borderRadius:7,background:'rgba(201,164,108,0.14)',
              border:'1px solid rgba(201,164,108,0.28)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Shield style={{ width:13,height:13,color:'#c9a46c' }} />
            </div>
            <span style={{ fontSize:14,fontWeight:700,color:'#e2e8f0',letterSpacing:'-0.02em' }}>FraudIQ</span>
          </Link>

          {/* intentionally no dead nav links */}
          <div />

          <Link to="/dashboard"
            style={{ display:'flex',alignItems:'center',gap:7,padding:'7px 8px 7px 16px',
              borderRadius:999,border:'1px solid rgba(255,255,255,0.15)',fontSize:13,fontWeight:600,
              color:'#fff',textDecoration:'none',background:'rgba(255,255,255,0.04)',transition:'all 0.15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,0.28)'; e.currentTarget.style.background='rgba(255,255,255,0.08)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}>
            Open Dashboard
            <div style={{ width:23,height:23,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.16)',
              background:'rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <ArrowUpRight style={{ width:11,height:11 }} />
            </div>
          </Link>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position:'relative',overflow:'hidden',paddingTop:90,minHeight:'calc(100vh - 58px)' }}>
        <div style={{ position:'absolute',inset:0,pointerEvents:'none',
          backgroundImage:`linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),
                           linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)`,
          backgroundSize:'52px 52px' }} />
        <div style={{ position:'absolute',top:-100,left:'50%',transform:'translateX(-50%)',
          width:900,height:500,pointerEvents:'none',
          background:'radial-gradient(ellipse,rgba(201,164,108,0.058) 0%,transparent 68%)' }} />

        <div style={{ position:'relative',zIndex:1 }}>
          {/* centered headline */}
          <div style={{ textAlign:'center',padding:'0 24px' }}>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6 }}
              style={{ display:'inline-flex',alignItems:'center',gap:8,marginBottom:30,
                padding:'4px 14px',borderRadius:999,border:'1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ width:5,height:5,borderRadius:'50%',background:'#c9a46c',display:'inline-block',
                animation:'blink 2.4s ease-in-out infinite' }} />
              <span style={{ fontSize:11,fontWeight:600,color:'#5a5a6a',letterSpacing:'0.1em',textTransform:'uppercase' }}>
                Fraud Detection Platform
              </span>
            </motion.div>

            <motion.div initial={{ opacity:0,y:24 }} animate={{ opacity:1,y:0 }}
              transition={{ duration:0.9,delay:0.1,ease:[0.16,1,0.3,1] }}
              style={{ marginBottom:26 }}>
              <span className="outlined" style={{ fontSize:'clamp(68px,10.5vw,132px)',
                fontWeight:700,lineHeight:0.88,letterSpacing:'-0.04em',display:'block' }}>
                FRAUD
              </span>
              <span className="serif gold-gradient" style={{ fontSize:'clamp(52px,8.5vw,106px)',
                fontWeight:700,fontStyle:'italic',lineHeight:0.9,letterSpacing:'-0.02em',display:'block' }}>
                Intelligence
              </span>
              <span style={{ fontSize:'clamp(22px,3.5vw,44px)',fontWeight:300,lineHeight:1,
                color:'rgba(255,255,255,0.2)',letterSpacing:'-0.01em',marginTop:6,display:'block' }}>
                for Modern Fintech
              </span>
            </motion.div>

            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.7,delay:0.35 }}
              style={{ fontSize:13,color:'#7a7a8a',marginBottom:36,letterSpacing:'0.01em',lineHeight:1.7 }}>
              ML-Powered Scoring &nbsp;·&nbsp; Fraud Network Detection &nbsp;·&nbsp; Explainable AI
            </motion.p>

            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
              transition={{ duration:0.7,delay:0.45 }}
              style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:88 }}>
              <Link to="/upload"
                style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 8px 10px 20px',
                  borderRadius:999,border:'1px solid rgba(201,164,108,0.35)',fontSize:13,fontWeight:600,
                  color:'#e2c090',textDecoration:'none',background:'rgba(201,164,108,0.07)',transition:'all 0.15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(201,164,108,0.12)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='rgba(201,164,108,0.07)'; }}>
                Upload Your Data
                <div style={{ width:26,height:26,borderRadius:'50%',border:'1px solid rgba(201,164,108,0.3)',
                  background:'rgba(201,164,108,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <ArrowUpRight style={{ width:11,height:11,color:'#e2c090' }} />
                </div>
              </Link>
            </motion.div>
          </div>

          {/* diagonal mockup with parallax */}
          <div style={{ position:'relative',display:'flex',justifyContent:'center' }}>
            <div style={{ position:'absolute',top:'10%',left:'50%',transform:'translateX(-50%)',
              width:'65%',height:'50%',zIndex:0,pointerEvents:'none',
              background:'radial-gradient(ellipse,rgba(201,164,108,0.05) 0%,rgba(59,130,246,0.03) 45%,transparent 70%)',
              filter:'blur(50px)' }} />

            <motion.div style={{ y:mockY,opacity:mockOpacity }}
              initial={{ opacity:0,y:70 }} animate={{ opacity:1,y:0 }}
              transition={{ duration:1.1,delay:0.3,ease:[0.16,1,0.3,1] }}>
              <div style={{ width:'min(940px,91vw)',
                transform:'perspective(1600px) rotateX(7deg) rotateZ(-3.5deg)',
                transformOrigin:'center top',position:'relative',zIndex:1 }}>
                <Mockup />
              </div>
            </motion.div>

            {/* floating alert card */}
            <motion.div initial={{ opacity:0,x:30,y:20 }} animate={{ opacity:1,x:0,y:0 }}
              transition={{ duration:0.9,delay:0.65,ease:[0.16,1,0.3,1] }}
              style={{ position:'absolute',right:'max(20px,calc(50% - 540px))',top:30,zIndex:3,
                transform:'perspective(700px) rotateZ(2deg)' }}>
              <div style={{ background:'#0f0f14',border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:12,padding:'13px 15px',width:195,boxShadow:'0 24px 64px rgba(0,0,0,0.75)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:10 }}>
                  <div style={{ width:26,height:26,borderRadius:7,background:'rgba(239,68,68,0.13)',
                    border:'1px solid rgba(239,68,68,0.22)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <AlertTriangle style={{ width:12,height:12,color:'#f87171' }} />
                  </div>
                  <div>
                    <div style={{ fontSize:10.5,fontWeight:700,color:'#fff' }}>TXN-8821</div>
                    <div style={{ fontSize:9,color:'#4a4a5a' }}>$12,450 · 2s ago</div>
                  </div>
                </div>
                <div style={{ height:3,background:'#1a1a22',borderRadius:2,overflow:'hidden',marginBottom:5 }}>
                  <div style={{ height:'100%',width:'94%',background:'linear-gradient(90deg,#ef4444,#b91c1c)',borderRadius:2 }} />
                </div>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:9,color:'#4a4a5a' }}>Risk Score</span>
                  <span style={{ fontSize:11,fontWeight:800,color:'#f87171' }}>94%</span>
                </div>
              </div>
            </motion.div>

            {/* floating stat card */}
            <motion.div initial={{ opacity:0,x:-30,y:20 }} animate={{ opacity:1,x:0,y:0 }}
              transition={{ duration:0.9,delay:0.78,ease:[0.16,1,0.3,1] }}
              style={{ position:'absolute',left:'max(20px,calc(50% - 540px))',top:80,zIndex:3,
                transform:'perspective(700px) rotateZ(-1.5deg)' }}>
              <div style={{ background:'#0f0f14',border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:12,padding:'13px 15px',width:158,boxShadow:'0 24px 64px rgba(0,0,0,0.75)' }}>
                <div style={{ fontSize:9,color:'#7a7a8a',fontWeight:600,textTransform:'uppercase',
                  letterSpacing:'0.08em',marginBottom:8 }}>Prevented Today</div>
                <div style={{ fontSize:24,fontWeight:800,color:'#6ee7b7',letterSpacing:'-0.03em',marginBottom:3 }}>$2.1M</div>
                <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                  <Activity style={{ width:10,height:10,color:'#10b981' }} />
                  <span style={{ fontSize:9,color:'#10b981',fontWeight:500 }}>127 alerts blocked</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* scroll indicator — fixed to bottom of viewport, fades out on scroll */}
        {showScroll && (
          <div
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            style={{ position:'fixed', bottom:32, left:'50%', transform:'translateX(-50%)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:6, zIndex:100, cursor:'pointer',
              transition:'opacity 0.4s' }}>
            <span style={{ fontSize:9, fontWeight:600, color:'rgba(201,164,108,0.55)',
              textTransform:'uppercase', letterSpacing:'0.12em' }}>Scroll</span>
            <div style={{ animation:'scrollBounce 1.6s ease-in-out infinite' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4.5L7 9.5L12 4.5" stroke="rgba(201,164,108,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────────────────── */}
      <FadeUp delay={0.05}>
        <section style={{ padding:'56px 0',borderTop:'1px solid rgba(255,255,255,0.05)',marginTop:48 }}>
          <div style={{ marginBottom:20,textAlign:'center' }}>
            <span style={{ fontSize:10,fontWeight:600,color:'#555568',textTransform:'uppercase',letterSpacing:'0.12em' }}>
              Built with
            </span>
          </div>
          <Marquee />
        </section>
      </FadeUp>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section style={{ padding:'96px 36px',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth:1060,margin:'0 auto' }}>
          <FadeUp>
            <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:24,marginBottom:64 }}>
              <div>
                <p style={{ fontSize:11,fontWeight:600,color:'#c9a46c',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14 }}>
                  Capabilities
                </p>
                <h2 style={{ fontSize:'clamp(32px,5vw,56px)',fontWeight:700,letterSpacing:'-0.03em',lineHeight:1.05,color:'#fff',margin:0 }}>
                  Built for the<br />
                  <span className="serif" style={{ fontStyle:'italic',fontWeight:400,color:'rgba(255,255,255,0.28)' }}>
                    serious operator
                  </span>
                </h2>
              </div>
              <Link to="/dashboard"
                style={{ display:'flex',alignItems:'center',gap:7,padding:'10px 8px 10px 20px',
                  borderRadius:999,border:'1px solid rgba(255,255,255,0.12)',fontSize:13,fontWeight:600,
                  color:'#fff',textDecoration:'none',background:'rgba(255,255,255,0.03)',flexShrink:0 }}>
                Explore the platform
                <div style={{ width:26,height:26,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.14)',
                  background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <ArrowUpRight style={{ width:11,height:11 }} />
                </div>
              </Link>
            </div>
          </FadeUp>
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            {FEATURES.map((f,i)=>(
              <FadeUp key={f.n} delay={i*0.06}>
                <FeatureRow {...f} />
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ──────────────────────────────────────────────────── */}
      <FadeUp>
        <section style={{ padding:'96px 36px 112px',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth:600,margin:'0 auto',textAlign:'center' }}>
            <div style={{ position:'relative',display:'inline-block',width:'100%',marginBottom:32 }}>
              <div style={{ position:'absolute',top:-24,left:'50%',transform:'translateX(-50%)',
                whiteSpace:'nowrap',pointerEvents:'none',zIndex:0 }}>
                <span className="outlined" style={{ fontSize:'clamp(64px,11vw,120px)',fontWeight:700,
                  letterSpacing:'-0.04em',opacity:0.45 }}>DETECT</span>
              </div>
              <h2 style={{ position:'relative',zIndex:1,fontSize:'clamp(30px,4.5vw,50px)',
                fontWeight:700,letterSpacing:'-0.025em',color:'#fff',lineHeight:1.1,margin:0 }}>
                Start detecting fraud<br />
                <span className="serif gold-gradient" style={{ fontStyle:'italic',fontWeight:400 }}>
                  in minutes
                </span>
              </h2>
            </div>
            <p style={{ fontSize:15,color:'#7a7a8a',marginBottom:44,lineHeight:1.75 }}>
              Upload transaction data and get instant risk scores,<br />alerts, and network analysis.
            </p>
            <Link to="/upload"
              style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'12px 10px 12px 24px',
                borderRadius:999,border:'1px solid rgba(255,255,255,0.18)',fontSize:14,fontWeight:600,
                color:'#fff',textDecoration:'none',background:'rgba(255,255,255,0.05)',transition:'all 0.15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.09)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}>
              Upload Your Data
              <div style={{ width:28,height:28,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.18)',
                background:'rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <ArrowUpRight style={{ width:12,height:12 }} />
              </div>
            </Link>
          </div>
        </section>
      </FadeUp>

    </div>
  );
}
