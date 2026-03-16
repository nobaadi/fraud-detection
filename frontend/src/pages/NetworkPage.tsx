import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../api';
import { Network, Users, Store, WifiOff } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNavigate } from 'react-router-dom';

export default function NetworkPage() {
  const [minRisk, setMinRisk] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: network, isLoading, isError } = useQuery({
    queryKey: ['network', minRisk],
    queryFn: () => transactionsApi.getNetwork(minRisk),
    staleTime: 10_000,
  });

  const graphData = useMemo(() => ({
    nodes: (network?.nodes ?? []).map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      risk_level: n.risk_level,
      transaction_count: n.transaction_count,
      transaction_id: n.transaction_id,
    })),
    links: (network?.edges ?? []).map(e => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    })),
  }), [network]);

  const getNodeColor = useCallback((node: any) => {
    if (node.type === 'merchant') {
      if (node.risk_level === 'High') return '#ef4444';
      if (node.risk_level === 'Medium') return '#f59e0b';
      return '#c9a46c';
    }
    if (node.risk_level === 'High') return '#dc2626';
    if (node.risk_level === 'Medium') return '#d97706';
    return '#10b981';
  }, []);

  const getLinkColor = useCallback((link: any) => {
    if (link.weight >= 0.65) return 'rgba(239,68,68,0.6)';
    if (link.weight >= 0.35) return 'rgba(245,158,11,0.4)';
    return 'rgba(255,255,255,0.06)';
  }, []);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isMerchant = node.type === 'merchant';
    const r = isMerchant ? 7 : 4.5;
    const color = getNodeColor(node);
    const isHovered = hoveredNode === node.id;

    if (isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 5, 0, 2 * Math.PI);
      ctx.fillStyle = color + '22';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (isMerchant) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${5.5 / Math.max(globalScale * 0.5, 0.5)}px Inter`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M', node.x, node.y);
    }

    if (isHovered || (isMerchant && globalScale > 0.8)) {
      const label = node.label.length > 16 ? node.label.slice(0, 16) + '…' : node.label;
      const fontSize = Math.max(10 / globalScale, 8);
      ctx.font = `${fontSize}px Inter`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#9aa0a6';
      ctx.fillText(label, node.x, node.y + r + 3);
    }
  }, [getNodeColor, hoveredNode]);

  const userCount     = network?.nodes.filter(n => n.type === 'user').length ?? 0;
  const merchantCount = network?.nodes.filter(n => n.type === 'merchant').length ?? 0;

  const riskBtn = (level: 'High' | 'Medium' | 'Low') => {
    const active = minRisk === level;
    const colors = {
      High:   { bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)',    text: '#fca5a5' },
      Medium: { bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.3)',   text: '#fcd34d' },
      Low:    { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)',  text: '#6ee7b7' },
    };
    const c = colors[level];
    return (
      <button key={level} onClick={() => setMinRisk(level)} style={{
        padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        background: active ? c.bg : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.07)'}`,
        color: active ? c.text : '#7a7a8a', transition: 'all 0.15s',
      }}>{level}</button>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <div>
          <span className="page-label">Relationship Mapping</span>
          <h1 className="page-title">
            Network <span className="serif-dim">Analysis</span>
          </h1>
          <p className="page-sub">Users connected through shared high-risk merchants</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:11, color:'#7a7a8a', fontWeight:500 }}>Min risk:</span>
          {(['High','Medium','Low'] as const).map(riskBtn)}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { icon:Users,   label:'Users in Network',      value:userCount,                   bg:'rgba(201,164,108,0.08)', border:'rgba(201,164,108,0.18)', text:'#e2c090' },
          { icon:Store,   label:'High-Risk Merchants', value:merchantCount,               bg:'rgba(239,68,68,0.07)',   border:'rgba(239,68,68,0.16)',   text:'#fca5a5' },
          { icon:Network, label:'Connections',         value:graphData.links.length,      bg:'rgba(245,158,11,0.07)', border:'rgba(245,158,11,0.16)',  text:'#fcd34d' },
        ].map(({ icon:Icon, label, value, bg, border, text }) => (
          <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:'14px 16px',
            display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon style={{ width:15, height:15, color:text }} />
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:700, color:text, letterSpacing:'-0.02em' }}>{value}</div>
              <div style={{ fontSize:11, color:'#7a7a8a', marginTop:1 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Force Graph */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#9aa0a6' }}>Transaction Network</span>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {[
              { dot:'#dc2626', label:'High-risk user' },
              { dot:'#c9a46c', label:'Merchant node' },
              { dot:'rgba(239,68,68,0.6)', label:'Risky link', line:true },
            ].map(({ dot, label, line }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                {line
                  ? <div style={{ width:16, height:1.5, background:dot, borderRadius:1 }} />
                  : <div style={{ width:8, height:8, borderRadius:'50%', background:dot }} />}
                <span style={{ fontSize:10, color:'#7a7a8a' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div ref={containerRef} style={{ background:'#2a2a2a', height:480, position:'relative' }}>
          {isLoading ? (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              color:'#7a7a8a', fontSize:13 }}>Building network graph…</div>
          ) : isError ? (
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
              <WifiOff style={{ width:28, height:28, color:'#555568' }} />
              <span style={{ color:'#7a7a8a', fontSize:13 }}>Failed to load network data. Check that the backend is running.</span>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              color:'#7a7a8a', fontSize:13 }}>No connections at this risk level.</div>
          ) : (
            <ForceGraph2D
              graphData={graphData}
              width={containerRef.current?.clientWidth ?? 800}
              height={480}
              backgroundColor="#2a2a2a"
              nodeCanvasObject={nodeCanvasObject}
              nodeCanvasObjectMode={() => 'replace'}
              linkColor={getLinkColor}
              linkWidth={(link: any) => link.weight >= 0.65 ? 1.5 : 0.8}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={(link: any) => link.weight >= 0.65 ? 1.5 : 0}
              linkDirectionalParticleColor={getLinkColor}
              onNodeHover={(node: any) => setHoveredNode(node?.id ?? null)}
              onNodeClick={(node: any) => {
                if (node.transaction_id) {
                  navigate(`/investigate/${node.transaction_id}`);
                }
              }}
              nodePointerAreaPaint={(node: any, color, ctx) => {
                const r = node.type === 'merchant' ? 12 : 8;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                ctx.fill();
              }}
              cooldownTicks={80}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
            />
          )}
        </div>
      </div>

      <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10,
        background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
        <Network style={{ width:13, height:13, color:'#7a7a8a', flexShrink:0, marginTop:2 }} />
        <p style={{ fontSize:12, color:'#7a7a8a', lineHeight:1.65, margin:0 }}>
          Drag to pan · Scroll to zoom · Hover to inspect · Click a node to investigate. Flowing particles indicate high-risk transaction links between users and merchants.
        </p>
      </div>
    </div>
  );
}
