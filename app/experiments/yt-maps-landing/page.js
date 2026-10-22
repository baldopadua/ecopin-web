'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// EXPERIMENT: YouTube × Google Maps fusion landing page
// ---------------------------------------------------------------------------
// This is a design experiment — NOT production code.
// The actual landing page lives at /app/page.js.
//
// Concept:
//   • Left panel  → "Google Maps" vibe: full-height interactive map with pins,
//     a search bar, filter pills, and the characteristic Maps color palette.
//   • Right panel → "YouTube" vibe: vertical feed of report cards styled as
//     YouTube video cards (thumbnail, avatar, title, views, timestamp).
//   • The panels talk to each other: hovering a card highlights the matching
//     map pin, and clicking a pin scrolls to the card.
// ---------------------------------------------------------------------------

// --- Static mock data -------------------------------------------------------
const REPORTS = [
  {
    id: 'R001',
    title: 'Overflowing dumpsite along Caruncho Ave',
    location: 'Caruncho Ave, Pasig City',
    barangay: 'San Nicolas',
    status: 'resolved',
    type: 'Illegal Dumping',
    views: '4.2K',
    ago: '2 days ago',
    duration: '1:24',
    reporter: 'JM Santos',
    pin: { x: 62, y: 38 },
    color: '#2E7D32',
    thumbColor: '#A7F3D0',
    thumbIcon: '\uD83D\uDDD1\uFE0F',
  },
  {
    id: 'R002',
    title: 'Clogged estero causing flooding near Shaw Blvd',
    location: 'Shaw Blvd, Pasig City',
    barangay: 'Kapitolyo',
    status: 'in-progress',
    type: 'Waterway Obstruction',
    views: '11.8K',
    ago: '5 hours ago',
    duration: '3:07',
    reporter: 'Ana Reyes',
    pin: { x: 42, y: 55 },
    color: '#0288D1',
    thumbColor: '#BAE6FD',
    thumbIcon: '\uD83C\uDF0A',
  },
  {
    id: 'R003',
    title: 'Burning trash pile behind Palatiw wet market',
    location: 'Palatiw Market, Pasig City',
    barangay: 'Palatiw',
    status: 'pending',
    type: 'Open Burning',
    views: '8.9K',
    ago: '1 day ago',
    duration: '0:58',
    reporter: 'Carlo Dela Cruz',
    pin: { x: 70, y: 65 },
    color: '#D32F2F',
    thumbColor: '#FCA5A5',
    thumbIcon: '\uD83D\uDD25',
  },
  {
    id: 'R004',
    title: 'Abandoned construction debris on Ortigas Ave',
    location: 'Ortigas Ave Ext, Pasig City',
    barangay: 'Ugong',
    status: 'resolved',
    type: 'Construction Waste',
    views: '2.1K',
    ago: '3 days ago',
    duration: '2:13',
    reporter: 'Maria Lim',
    pin: { x: 28, y: 30 },
    color: '#B45309',
    thumbColor: '#FDE68A',
    thumbIcon: '\uD83C\uDFD7\uFE0F',
  },
  {
    id: 'R005',
    title: 'Litter accumulation at Rosario flyover underpass',
    location: 'Rosario, Pasig City',
    barangay: 'Rosario',
    status: 'in-progress',
    type: 'Littering',
    views: '6.3K',
    ago: '12 hours ago',
    duration: '1:45',
    reporter: 'Diego Cruz',
    pin: { x: 54, y: 22 },
    color: '#0052CC',
    thumbColor: '#BFDBFE',
    thumbIcon: '\uD83D\uDEAE',
  },
  {
    id: 'R006',
    title: 'Dead animal waste near Bambang creek',
    location: 'Bambang, Pasig City',
    barangay: 'Bambang',
    status: 'pending',
    type: 'Sanitation Hazard',
    views: '3.7K',
    ago: '6 hours ago',
    duration: '0:47',
    reporter: 'Rosa Tan',
    pin: { x: 38, y: 75 },
    color: '#7C3AED',
    thumbColor: '#DDD6FE',
    thumbIcon: '\u26A0\uFE0F',
  },
];

const STATUS_CONFIG = {
  resolved:      { label: 'Resolved',    bg: '#DCFCE7', text: '#166534' },
  'in-progress': { label: 'In Progress', bg: '#DBEAFE', text: '#1E40AF' },
  pending:       { label: 'Pending',     bg: '#FEF3C7', text: '#92400E' },
};

// --- Tiny SVG Leaf -----------------------------------------------------------
const SolidLeaf = ({ style }) => (
  <svg viewBox="200 1400 1400 1400" style={style} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M 10212.1,6632.9 C 10020.1,5259.3 9193.56,3987.5 8016.09,3254.4 6838.63,2521.3 5332.59,2340.7 4015.19,2774.6 4583.93,4666.2 5714.06,6385.1 7225.35,7657.1 6151.28,7115.4 5305.09,6195.2 4668.79,5174.3 4032.49,4153.4 3588.08,3027 3147.23,1907.9 c -418.54,65.3 -615.3,338.8 -615.3,338.8 19.38,173.4 347.11,861.8 679.39,1513.5 -730.82,1034.7 -212.9,2598.1 730.44,3460.5 727.11,664.8 1953.15,1033.1 2856.17,1427.1 903.03,393.9 1822.34,938.6 2228.22,1836.3 C 9957.66,9456.3 10404,8006.6 10212.1,6632.9" transform="matrix(0.13333333,0,0,-0.13333333,0,2933.3333)" />
  </svg>
);

// --- Map Pin -----------------------------------------------------------------
const MapPin = ({ report, isActive, onHover, onClick }) => {
  const cfg = STATUS_CONFIG[report.status];
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Pin: ${report.title}`}
      onMouseEnter={() => onHover(report.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(report.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(report.id); }}
      style={{
        position: 'absolute',
        left: `${report.pin.x}%`,
        top: `${report.pin.y}%`,
        transform: 'translate(-50%, -100%)',
        cursor: 'pointer',
        zIndex: isActive ? 20 : 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        outline: 'none',
        transition: 'scale 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        scale: isActive ? '1.3' : '1',
      }}
    >
      {isActive && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 4px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#202124',
          color: '#fff',
          borderRadius: '8px',
          padding: '5px 10px',
          fontSize: '11px',
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          maxWidth: '180px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          lineHeight: 1.4,
          textAlign: 'center',
        }}>
          {report.title.length > 38 ? report.title.slice(0, 36) + '\u2026' : report.title}
        </div>
      )}
      <div style={{
        width: isActive ? '38px' : '28px',
        height: isActive ? '38px' : '28px',
        borderRadius: '50% 50% 50% 0',
        transform: 'rotate(-45deg)',
        background: isActive ? report.color : cfg.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isActive
          ? `0 4px 16px ${report.color}80, 0 0 0 3px #fff`
          : '0 2px 6px rgba(0,0,0,0.25)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '2.5px solid #fff',
      }}>
        <span style={{ transform: 'rotate(45deg)', fontSize: isActive ? '14px' : '11px' }}>{report.thumbIcon}</span>
      </div>
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: 'rgba(0,0,0,0.15)', marginTop: '2px',
      }} />
    </div>
  );
};

// --- YouTube-style Report Card -----------------------------------------------
const ReportCard = React.forwardRef(function ReportCard({ report, isActive, onHover, onClick }, ref) {
  const cfg = STATUS_CONFIG[report.status];
  return (
    <div
      ref={ref}
      role="article"
      tabIndex={0}
      aria-label={`Report: ${report.title}`}
      onMouseEnter={() => onHover(report.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(report.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(report.id); }}
      style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', outline: 'none' }}
    >
      {/* Thumbnail */}
      <div style={{
        width: '100%', aspectRatio: '16/9', borderRadius: '12px',
        background: report.thumbColor, position: 'relative', overflow: 'hidden',
        boxShadow: isActive
          ? `0 0 0 3px ${report.color}, 0 4px 20px ${report.color}40`
          : '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, ${report.thumbColor} 0px, ${report.thumbColor} 4px, transparent 4px, transparent 14px)`,
          opacity: 0.4,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '48px',
        }}>{report.thumbIcon}</div>
        <div style={{
          position: 'absolute', bottom: '8px', right: '8px',
          background: 'rgba(0,0,0,0.8)', color: '#fff',
          fontSize: '12px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
          fontFamily: 'Roboto Mono, monospace',
        }}>{report.duration}</div>
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          background: cfg.bg, color: cfg.text,
          fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
          fontFamily: 'Outfit, sans-serif',
        }}>{cfg.label}</div>
      </div>
      {/* Meta row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: report.color, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '13px', fontWeight: 700,
          fontFamily: 'Outfit, sans-serif',
        }}>
          {report.reporter.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Outfit, sans-serif', fontSize: '14px', fontWeight: 700,
            color: '#0F0F0F', lineHeight: 1.35, marginBottom: '4px',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{report.title}</div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '12px', color: '#606060', lineHeight: 1.4 }}>
            {report.barangay} · {report.type}
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '12px', color: '#606060', display: 'flex', gap: '4px' }}>
            <span>{report.views} views</span><span>•</span><span>{report.ago}</span>
          </div>
        </div>
        <button
          aria-label="More options"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#606060', flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

// --- Maps bottom mini-card ---------------------------------------------------
const MapBottomCard = ({ report, onClose }) => {
  if (!report) return null;
  const cfg = STATUS_CONFIG[report.status];
  return (
    <div style={{
      position: 'absolute', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)',
      background: '#fff', borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      padding: '14px 16px',
      display: 'flex', gap: '12px', alignItems: 'center',
      zIndex: 30, width: 'calc(100% - 40px)', maxWidth: '380px',
      fontFamily: 'Outfit, sans-serif',
      animation: 'ecoSlideUp 0.2s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '10px',
        background: report.thumbColor, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
      }}>{report.thumbIcon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#202124', marginBottom: '2px',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {report.title}
        </div>
        <div style={{ fontSize: '11px', color: '#5F6368' }}>{report.location}</div>
        <div style={{
          display: 'inline-flex', marginTop: '4px',
          background: cfg.bg, color: cfg.text, borderRadius: '20px',
          padding: '2px 8px', fontSize: '11px', fontWeight: 700,
        }}>{cfg.label}</div>
      </div>
      <button aria-label="Close card" onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5F6368', padding: '4px', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
};

// --- Filter pills (Maps-style) -----------------------------------------------
const FILTERS = ['All', 'Pending', 'In Progress', 'Resolved', 'Near Me'];
const FilterPills = ({ active, onChange }) => (
  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
    {FILTERS.map(f => (
      <button key={f} onClick={() => onChange(f)} style={{
        background: active === f ? '#1A73E8' : '#fff',
        color: active === f ? '#fff' : '#202124',
        border: `1px solid ${active === f ? '#1A73E8' : '#DADCE0'}`,
        borderRadius: '20px', padding: '6px 14px',
        fontSize: '13px', fontWeight: active === f ? 700 : 400,
        fontFamily: 'Outfit, sans-serif', cursor: 'pointer',
        whiteSpace: 'nowrap', transition: 'all 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flexShrink: 0,
      }}>{f}</button>
    ))}
  </div>
);

// --- YouTube section tabs ----------------------------------------------------
const YT_TABS = ['\uD83D\uDD25 Trending', '\uD83D\uDD50 Recent', '\u2705 Resolved', '\uD83D\uDD14 Near You'];
const YtTabs = ({ active, onChange }) => (
  <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #E5E5E5', marginBottom: '0' }}>
    {YT_TABS.map(t => (
      <button key={t} onClick={() => onChange(t)} style={{
        background: 'none', border: 'none',
        borderBottom: active === t ? '2px solid #0F0F0F' : '2px solid transparent',
        padding: '8px 12px', fontSize: '13px',
        fontWeight: active === t ? 700 : 500,
        fontFamily: 'Outfit, sans-serif', cursor: 'pointer',
        color: active === t ? '#0F0F0F' : '#606060',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s, border-color 0.15s',
        marginBottom: '-1px',
      }}>{t}</button>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------
export default function YtMapsExperimentPage() {
  const [activeId, setActiveId] = useState(null);
  const [mapFilter, setMapFilter] = useState('All');
  const [ytTab, setYtTab] = useState('\uD83D\uDD25 Trending');
  const [mapCard, setMapCard] = useState(null);
  const cardRefs = useRef({});

  const handleHover = useCallback((id) => setActiveId(id), []);

  const handlePinClick = useCallback((id) => {
    setMapCard(REPORTS.find(r => r.id === id) || null);
    setActiveId(id);
    const el = cardRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const handleCardClick = useCallback((id) => {
    setActiveId(prev => prev === id ? null : id);
    setMapCard(prev => prev?.id === id ? null : REPORTS.find(r => r.id === id) || null);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#F1F3F4', fontFamily: 'Outfit, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP NAV ──────────────────────────────────────────────────── */}
      <header style={{
        height: '56px', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: '16px',
        zIndex: 100, position: 'sticky', top: 0, flexShrink: 0,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0052CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SolidLeaf style={{ width: '18px', height: '18px', color: '#fff' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#202124', letterSpacing: '-0.3px' }}>
            Eco<span style={{ color: '#0052CC' }}>Pin</span>
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#5F6368', background: '#E8EAED', borderRadius: '4px', padding: '2px 6px', marginLeft: '4px' }}>
            EXPERIMENT
          </span>
        </Link>

        <div style={{ flex: 1, maxWidth: '460px' }}>
          <div style={{ background: '#F1F3F4', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" placeholder="Search Pasig City waste reports\u2026" aria-label="Search reports"
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: '14px', color: '#202124', width: '100%', fontFamily: 'Outfit, sans-serif' }} />
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
          {[['Live Map', '/map'], ['Reports', '/dashboard'], ['About', '/about']].map(([l, href]) => (
            <Link key={l} href={href} style={{ padding: '6px 14px', borderRadius: '20px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, color: '#5F6368', transition: 'background 0.15s' }}>{l}</Link>
          ))}
          <Link href="/auth/login" style={{ padding: '7px 16px', borderRadius: '20px', textDecoration: 'none', fontSize: '13px', fontWeight: 700, color: '#fff', background: '#0052CC' }}>Sign In</Link>
        </nav>
      </header>

      {/* ── MAIN SPLIT ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', minHeight: 'calc(100vh - 56px)' }}>

        {/* ══ LEFT: Map Panel ══════════════════════════════════════════ */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#E8EAF0' }}>

          {/* Grid tiles */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(200,210,220,0.6) 1px, transparent 1px),
              linear-gradient(90deg, rgba(200,210,220,0.6) 1px, transparent 1px),
              linear-gradient(rgba(220,228,235,0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(220,228,235,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
          }} />

          {/* Roads + river SVG */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* Pasig River */}
            <path d="M 0,60% C 20%,55% 35%,70% 55%,65% S 80%,50% 100%,55%" fill="none" stroke="#A8D5E2" strokeWidth="22" strokeLinecap="round" opacity="0.7"/>
            <path d="M 0,40% C 12%,45% 25%,35% 42%,42% S 60%,30% 75%,38% S 90%,25% 100%,30%" fill="none" stroke="#BDE3ED" strokeWidth="14" strokeLinecap="round" opacity="0.5"/>
            {/* Road grid */}
            <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#fff" strokeWidth="6" opacity="0.5"/>
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#fff" strokeWidth="4" opacity="0.4"/>
            <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#fff" strokeWidth="4" opacity="0.4"/>
            <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#fff" strokeWidth="4" opacity="0.4"/>
            <line x1="60%" y1="0" x2="60%" y2="100%" stroke="#fff" strokeWidth="4" opacity="0.4"/>
          </svg>

          {/* City blocks */}
          {[
            ['5%','5%','22%','18%'],['32%','5%','25%','18%'],['63%','5%','33%','18%'],
            ['5%','27%','22%','20%'],['32%','27%','25%','20%'],['63%','27%','33%','20%'],
            ['5%','52%','22%','20%'],['32%','52%','25%','20%'],['63%','52%','33%','20%'],
            ['5%','76%','22%','20%'],['32%','76%','25%','20%'],['63%','76%','33%','20%'],
          ].map(([x,y,w,h], i) => (
            <div key={i} style={{ position:'absolute', left:x, top:y, width:w, height:h, background:'rgba(210,220,200,0.45)', borderRadius:'2px' }} />
          ))}

          {/* Search + filters overlay */}
          <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 25 }}>
            <div style={{ background:'#fff', borderRadius:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', display:'flex', alignItems:'center', gap:'10px', padding:'12px 18px', maxWidth:'360px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span style={{ fontSize:'14px', color:'#5F6368', fontFamily:'Outfit, sans-serif', flex:1 }}>Search reports in Pasig City\u2026</span>
              <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'#0052CC', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>🌿</div>
            </div>
            <FilterPills active={mapFilter} onChange={setMapFilter} />
          </div>

          {/* Zoom controls */}
          <div style={{ position:'absolute', right:'16px', bottom:'100px', zIndex:25 }}>
            <div style={{ display:'flex', flexDirection:'column', background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', overflow:'hidden' }}>
              {['+','\u2212'].map((btn,i) => (
                <button key={i} aria-label={btn === '+' ? 'Zoom in' : 'Zoom out'}
                  style={{ width:'40px', height:'40px', border:'none', background:'#fff', fontSize:'18px', cursor:'pointer', color:'#5F6368', borderBottom: i===0 ? '1px solid #E8EAED':'none', fontWeight:300 }}
                  onMouseEnter={e=>e.currentTarget.style.background='#F1F3F4'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                >{btn}</button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ position:'absolute', left:'16px', bottom:'20px', zIndex:25 }}>
            <div style={{ background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', padding:'12px 14px', display:'flex', flexDirection:'column', gap:'6px', fontSize:'11px', fontFamily:'Outfit, sans-serif', minWidth:'130px' }}>
              <div style={{ fontWeight:700, color:'#202124', marginBottom:'2px', fontSize:'12px' }}>Report Status</div>
              {Object.entries(STATUS_CONFIG).map(([key,cfg]) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:cfg.text, flexShrink:0 }} />
                  <span style={{ color:'#5F6368' }}>{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map attribution */}
          <div style={{ position:'absolute', bottom:'6px', right:'16px', fontSize:'10px', color:'#5F6368', fontFamily:'sans-serif', zIndex:25 }}>
            Map data © EcoPin 2026 · Pasig City
          </div>

          {/* Pins */}
          {REPORTS.map(r => (
            <MapPin key={r.id} report={r} isActive={activeId === r.id} onHover={handleHover} onClick={handlePinClick} />
          ))}

          {/* Bottom card */}
          <MapBottomCard report={mapCard} onClose={() => { setMapCard(null); setActiveId(null); }} />
        </div>

        {/* ══ RIGHT: YouTube Feed ═══════════════════════════════════════ */}
        <div style={{
          background: '#fff', borderLeft: '1px solid #E5E5E5',
          display: 'flex', flexDirection: 'column',
          height: 'calc(100vh - 56px)', position: 'sticky', top: '56px', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <div>
                <h2 style={{ fontSize:'16px', fontWeight:800, color:'#0F0F0F', margin:0, letterSpacing:'-0.3px' }}>Reports Feed</h2>
                <p style={{ fontSize:'12px', color:'#606060', margin:'2px 0 0' }}>{REPORTS.length} reports · Pasig City</p>
              </div>
              <button style={{ background:'#F2F2F2', border:'none', borderRadius:'20px', padding:'6px 12px', fontSize:'12px', fontWeight:700, cursor:'pointer', color:'#0F0F0F', fontFamily:'Outfit, sans-serif', display:'flex', alignItems:'center', gap:'6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/>
                </svg>
                Filter
              </button>
            </div>
            <YtTabs active={ytTab} onChange={setYtTab} />
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'20px', scrollbarWidth:'thin', scrollbarColor:'#CECECE transparent' }}>
            {REPORTS.map(report => (
              <ReportCard
                key={report.id}
                ref={el => { cardRefs.current[report.id] = el; }}
                report={report}
                isActive={activeId === report.id}
                onHover={handleHover}
                onClick={handleCardClick}
              />
            ))}
          </div>

          <div style={{ padding:'12px 16px', borderTop:'1px solid #E5E5E5', background:'#fff', flexShrink:0 }}>
            <Link href="/map" style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
              background:'#0052CC', color:'#fff', borderRadius:'8px', padding:'12px',
              textDecoration:'none', fontSize:'14px', fontWeight:700, fontFamily:'Outfit, sans-serif',
              transition:'background 0.15s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='#003D99'}
              onMouseLeave={e=>e.currentTarget.style.background='#0052CC'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
              View Full Live Map
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS BANNER ──────────────────────────────────────────────── */}
      <div style={{
        background: '#0052CC', color: '#fff', padding: '48px 32px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '32px', textAlign: 'center', fontFamily: 'Outfit, sans-serif',
      }}>
        {[
          { value: '12,481', label: 'Reports Filed', icon: '\uD83D\uDCCD' },
          { value: '98.2%', label: 'AI Verified', icon: '\uD83E\uDD16' },
          { value: '3,204', label: 'Issues Resolved', icon: '\u2705' },
          { value: '42', label: 'Barangays Covered', icon: '\uD83C\uDFD9\uFE0F' },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
            <div style={{ fontSize:'32px' }}>{s.icon}</div>
            <div style={{ fontSize:'36px', fontWeight:800, letterSpacing:'-1px', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:'13px', fontWeight:500, opacity:0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{
        background: '#202124', color: '#9AA0A6',
        padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'Outfit, sans-serif', fontSize: '13px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <SolidLeaf style={{ width:'16px', height:'16px', color:'#60A5FA' }} />
          <span style={{ fontWeight:700, color:'#E8EAED' }}>EcoPin</span>
          <span>· Solid Waste Management Office · Pasig City</span>
        </div>
        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
          <span>swmo@pasigcity.gov.ph</span>
          <span>09173726888</span>
          <span style={{ color:'#4A90E2' }}>\u26A0 Design Experiment \u2014 Not Production</span>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Roboto+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes ecoSlideUp {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CECECE; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #AFAFAF; }
        @media (max-width: 768px) {
          [data-split] { grid-template-columns: 1fr !important; }
          [data-ytpanel] { position: static !important; height: auto !important; }
        }
      `}</style>
    </div>
  );
}
