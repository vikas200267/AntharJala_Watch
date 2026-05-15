import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { api, connectSSE } from './api/apiClient';
import { useRealtimeData, useDashboard, useAlerts, useAnalytics, useHeatmap, useCommunity } from './hooks/useRealtimeData';
import {
  Home, Map, Bell, MessageSquare, Users, Settings, Droplets, TrendingUp,
  TrendingDown, Wifi, WifiOff, ChevronRight, Send, Plus, Camera, RefreshCw,
  AlertTriangle, CheckCircle, Info, Search, Filter, Star, Heart,
  MessageCircle, Share2, ArrowLeft, LogOut, Globe, Lock, Moon, Volume2, Zap,
  Download, FileText, Image, Layers, Activity, CloudOff, Cloud,
  BarChart2, ChevronDown, X, Edit3, Mic, Upload, Check,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS — Abyssal Intelligence Theme
// ═══════════════════════════════════════════════════════════════
const C = {
  bg:    '#010b16',
  s1:    '#04162a',
  s2:    '#07203e',
  g:     'rgba(255,255,255,0.035)',
  gb:    'rgba(0,190,255,0.08)',
  cy:    '#00c8f0',
  cy3:   'rgba(0,200,240,0.28)',
  cy15:  'rgba(0,200,240,0.14)',
  cy08:  'rgba(0,200,240,0.07)',
  grn:   '#00e898',
  grn3:  'rgba(0,232,152,0.28)',
  grn15: 'rgba(0,232,152,0.13)',
  am:    '#ffbb2e',
  am15:  'rgba(255,187,46,0.14)',
  rd:    '#ff3d5c',
  rd15:  'rgba(255,61,92,0.14)',
  pu:    '#9e80f0',
  pu15:  'rgba(158,128,240,0.14)',
  tx:    '#d2ecf5',
  txm:   'rgba(210,236,245,0.58)',
  txd:   'rgba(210,236,245,0.30)',
  bd:    'rgba(0,175,225,0.11)',
  bdm:   'rgba(0,175,225,0.22)',
};

const F = {
  d: '"Cinzel", "Palatino Linotype", Georgia, serif',
  b: '"Exo 2", "Segoe UI", system-ui, sans-serif',
  m: '"Space Mono", "Courier New", monospace',
};

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Exo+2:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
::-webkit-scrollbar { display: none; }
@keyframes pulseGlow { 0%,100%{box-shadow:0 0 10px rgba(0,200,240,0.18)}50%{box-shadow:0 0 24px rgba(0,200,240,0.45)} }
@keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn    { from{opacity:0} to{opacity:1} }
@keyframes ripOut    { 0%{transform:scale(1);opacity:0.45} 100%{transform:scale(3);opacity:0} }
@keyframes pulse     { 0%,100%{opacity:0.35} 50%{opacity:1} }
@keyframes spin      { to{transform:rotate(360deg)} }
@keyframes scanLine  { 0%{top:-4px} 100%{top:calc(100% + 4px)} }
@keyframes typeBlink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes slideRight{ from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideUp   { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
@keyframes bounceIn  { 0%{transform:scale(0.4);opacity:0} 70%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
@keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes toastIn   { 0%{opacity:0;transform:translateY(-20px) scale(0.95)} 100%{opacity:1;transform:translateY(0) scale(1)} }
@keyframes fillBar   { from{width:0%} to{width:var(--target-w)} }
@keyframes countUp   { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
`;

// ═══════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════
const Card = ({ children, style, onClick, accent }) => (
  <div
    onClick={onClick}
    style={{
      background: accent ? `${accent}06` : C.g,
      border: `0.5px solid ${accent ? accent + '1c' : C.bd}`,
      borderRadius: 14, padding: '12px 14px',
      backdropFilter: 'blur(12px)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.18s',
      ...style,
    }}
  >
    {children}
  </div>
);

const Tag = ({ label, color = C.cy }) => (
  <span style={{
    background: color + '18', color,
    border: `0.5px solid ${color}28`,
    borderRadius: 20, padding: '2px 8px',
    fontSize: 9, fontFamily: F.b, fontWeight: 600,
    letterSpacing: '0.07em', textTransform: 'uppercase',
  }}>{label}</span>
);

const Divider = ({ style }) => (
  <div style={{ height: 0.5, background: C.bd, margin: '7px 0', ...style }} />
);

const Toggle = ({ on, onChange, color = C.cy }) => (
  <div
    onClick={() => onChange(!on)}
    style={{
      width: 40, height: 22, borderRadius: 11,
      background: on ? color : 'rgba(255,255,255,0.08)',
      border: `0.5px solid ${on ? color + '50' : C.bd}`,
      position: 'relative', cursor: 'pointer', transition: 'all 0.22s', flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute', top: 3, left: on ? 19 : 3,
      width: 16, height: 16, borderRadius: '50%',
      background: '#fff', transition: 'left 0.22s',
      boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
    }} />
  </div>
);

const Skeleton = ({ w, h, r = 6 }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, rgba(0,175,225,0.06) 25%, rgba(0,175,225,0.13) 50%, rgba(0,175,225,0.06) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.6s ease infinite',
  }} />
);

const ProgressBar = ({ value, max, color = C.cy, label, style }) => {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={style}>
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{label}</span>
        <span style={{ fontFamily: F.m, fontSize: 9, color }}>{pct}%</span>
      </div>}
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 2,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: 'width 1.2s ease',
        }} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// WATER BACKGROUND
// ═══════════════════════════════════════════════════════════════
function WaterBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', borderRadius: 'inherit' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 25% 18%, rgba(0,55,95,0.55) 0%, transparent 55%),
          radial-gradient(ellipse 70% 55% at 78% 72%, rgba(0,35,70,0.45) 0%, transparent 50%),
          radial-gradient(ellipse 50% 40% at 60% 30%, rgba(0,80,100,0.2) 0%, transparent 45%),
          linear-gradient(175deg, #010d1a 0%, #01080f 100%)
        `,
      }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          top: `${22 + i * 22}%`, left: `${18 + i * 24}%`,
          width: 70 + i * 45, height: 70 + i * 45,
          borderRadius: '50%',
          border: `1px solid rgba(0,190,240,${0.05 - i * 0.01})`,
          animation: `ripOut ${4.5 + i * 1.8}s ease-out ${i * 1.3}s infinite`,
        }} />
      ))}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025 }}>
        <defs>
          <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#00b4e0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: SPLASH
// ═══════════════════════════════════════════════════════════════
function SplashScreen({ onDone }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 1300);
    const t3 = setTimeout(onDone, 2800);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <WaterBg />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{
          width: 84, height: 84, borderRadius: 26, margin: '0 auto 22px',
          background: `linear-gradient(145deg, ${C.cy08}, ${C.cy15})`,
          border: `1px solid ${C.cy3}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: step >= 1 ? 'pulseGlow 3s ease infinite, bounceIn 0.7s ease both' : 'none',
        }}>
          <Droplets size={38} color={C.cy} />
        </div>
        <div style={{ animation: step >= 1 ? 'fadeUp 0.7s ease both' : 'none' }}>
          <div style={{ fontFamily: F.d, fontSize: 27, fontWeight: 700, color: C.cy, letterSpacing: '0.1em', marginBottom: 4 }}>ANTHAR-JALA</div>
          <div style={{ fontFamily: F.d, fontSize: 11, color: C.txd, letterSpacing: '0.4em', textTransform: 'uppercase' }}>WATCH</div>
        </div>
        {step >= 2 && (
          <div style={{ fontFamily: F.b, fontSize: 12, color: C.txd, marginTop: 12, animation: 'fadeUp 0.5s ease both', letterSpacing: '0.04em' }}>
            Groundwater Intelligence Platform
          </div>
        )}
      </div>
      {step >= 1 && (
        <div style={{ position: 'absolute', bottom: 56, left: 56, right: 56, height: 2, background: C.bd, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: `linear-gradient(90deg, ${C.cy}, ${C.grn})`,
            borderRadius: 2, transition: 'width 1.5s ease',
            width: step >= 2 ? '100%' : '35%',
          }} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: LOGIN (OTP)
// ═══════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [phase, setPhase] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);

  const handleOtp = (i, val) => {
    const d = [...otp]; d[i] = val.slice(-1); setOtp(d);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (d.every(x => x)) setTimeout(onLogin, 500);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 5 }}>
      <WaterBg />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', paddingTop: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.cy15, border: `0.5px solid ${C.cy3}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Droplets size={18} color={C.cy} />
          </div>
          <div style={{ fontFamily: F.d, fontSize: 14, color: C.cy, letterSpacing: '0.1em' }}>ANTHAR-JALA</div>
        </div>

        <div style={{ fontFamily: F.d, fontSize: 22, color: C.tx, letterSpacing: '0.05em', marginBottom: 6 }}>
          {phase === 'phone' ? 'Welcome Back' : 'Verify Identity'}
        </div>
        <div style={{ fontFamily: F.b, fontSize: 13, color: C.txd, marginBottom: 32, lineHeight: 1.5 }}>
          {phase === 'phone' ? 'Sign in with your registered number to\naccess groundwater data.' : `OTP sent to +91 ${phone} — enter below`}
        </div>

        {phase === 'phone' ? (
          <div style={{ animation: 'fadeUp 0.45s ease' }}>
            <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Mobile Number</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.g, border: `0.5px solid ${C.bdm}`, borderRadius: 12, padding: '13px 14px', marginBottom: 20 }}>
              <span style={{ fontFamily: F.m, fontSize: 14, color: C.txm }}>+91</span>
              <div style={{ width: 1, height: 18, background: C.bd }} />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: F.m, fontSize: 16, color: C.tx, letterSpacing: '0.12em' }}
              />
            </div>
            <button
              onClick={() => phone.length === 10 && setPhase('otp')}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: phone.length === 10 ? 'pointer' : 'not-allowed',
                background: phone.length === 10 ? `linear-gradient(135deg, ${C.cy} 0%, #0098c8 100%)` : 'rgba(255,255,255,0.06)',
                color: phone.length === 10 ? '#002838' : C.txd,
                fontFamily: F.b, fontWeight: 600, fontSize: 14, letterSpacing: '0.06em', transition: 'all 0.2s',
              }}
            >Send OTP →</button>
          </div>
        ) : (
          <div style={{ animation: 'fadeUp 0.45s ease' }}>
            <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>6-Digit OTP</div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 20 }}>
              {otp.map((d, i) => (
                <input
                  key={i} ref={el => refs.current[i] = el}
                  value={d} maxLength={1}
                  onChange={e => handleOtp(i, e.target.value)}
                  onKeyDown={e => e.key === 'Backspace' && !d && i > 0 && refs.current[i - 1]?.focus()}
                  style={{
                    flex: 1, height: 54, borderRadius: 12, textAlign: 'center',
                    background: d ? C.cy15 : C.g,
                    border: `0.5px solid ${d ? C.cy3 : C.bd}`,
                    color: C.cy, fontFamily: F.m, fontSize: 22, fontWeight: 700, outline: 'none', transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
            <div style={{ fontFamily: F.b, fontSize: 11, color: C.txd, textAlign: 'center', marginBottom: 16 }}>Demo: enter any 6 digits</div>
            <button
              onClick={onLogin}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${C.cy} 0%, #0098c8 100%)`,
                color: '#002838', fontFamily: F.b, fontWeight: 600, fontSize: 14, letterSpacing: '0.06em',
              }}
            >Verify & Enter →</button>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingBottom: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Lock size={11} color={C.txd} />
          <span style={{ fontFamily: F.b, fontSize: 10, color: C.txd }}>Secured · Play Integrity · JWT Auth</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATIC DATA
// ═══════════════════════════════════════════════════════════════
const waterTrend = [
  { m: 'Jan', lvl: 24, rain: 12, avg: 22 }, { m: 'Feb', lvl: 22, rain: 8, avg: 21 },
  { m: 'Mar', lvl: 19, rain: 5, avg: 19 },  { m: 'Apr', lvl: 16, rain: 3, avg: 17 },
  { m: 'May', lvl: 14, rain: 2, avg: 15 },  { m: 'Jun', lvl: 19, rain: 30, avg: 18 },
  { m: 'Jul', lvl: 27, rain: 84, avg: 24 }, { m: 'Aug', lvl: 32, rain: 98, avg: 28 },
  { m: 'Sep', lvl: 29, rain: 56, avg: 26 }, { m: 'Oct', lvl: 25, rain: 23, avg: 23 },
  { m: 'Nov', lvl: 22, rain: 11, avg: 21 }, { m: 'Dec', lvl: 20, rain: 7, avg: 20 },
];

const forecastData = [
  { d: 'W1', sm: 20, g: 19, cl: 21, gpt: 20 }, { d: 'W2', sm: 18, g: 17, cl: 18, gpt: 19 },
  { d: 'W3', sm: 15, g: 14, cl: 16, gpt: 15 }, { d: 'W4', sm: 13, g: 12, cl: 14, gpt: 13 },
  { d: 'W5', sm: 12, g: 11, cl: 13, gpt: 12 }, { d: 'W6', sm: 14, g: 13, cl: 14, gpt: 14 },
  { d: 'W7', sm: 17, g: 16, cl: 17, gpt: 16 }, { d: 'W8', sm: 20, g: 19, cl: 21, gpt: 20 },
  { d: 'W9', sm: 24, g: 23, cl: 25, gpt: 23 }, { d: 'W10', sm: 27, g: 26, cl: 28, gpt: 26 },
  { d: 'W11', sm: 29, g: 28, cl: 30, gpt: 28 }, { d: 'W12', sm: 31, g: 30, cl: 32, gpt: 30 },
  { d: 'W13', sm: 33, g: 32, cl: 34, gpt: 32 },
];

const readings = [
  { id: 1, depth: '87 m', yield: '2,400 L/h', loc: 'Kolar Village', time: '2m', status: 'good', synced: true },
  { id: 2, depth: '132 m', yield: '820 L/h', loc: 'Doddabale Gram', time: '18m', status: 'warn', synced: true },
  { id: 3, depth: '65 m', yield: '3,200 L/h', loc: 'Tumkur Road', time: '1h', status: 'good', synced: false },
];

const ALERTS = [
  { id: 1, lvl: 'critical', title: 'Critical Water Stress', loc: 'Anantapur District', msg: 'Water table has dropped below 150m. Pumping rates must be reduced immediately.', time: '12m', ai: 'Gemini' },
  { id: 2, lvl: 'high', title: 'Borewell Yield Decline', loc: 'Chikkaballapur Taluk', msg: '40% yield reduction detected over 30 days. Consider deepening or locating new source.', time: '2h', ai: 'Claude' },
  { id: 3, lvl: 'medium', title: 'Seasonal Depletion', loc: 'Kolar District', msg: 'Pre-monsoon levels 18% below the 5-year average. Monitor closely through May.', time: '6h', ai: 'GPT-4' },
  { id: 4, lvl: 'low', title: 'Offline Sync Pending', loc: 'Tumkur Area', msg: '3 borewell records waiting to upload. Connect to internet to sync.', time: '1d', ai: null },
];

const CHATS = [
  { id: 1, role: 'ai', model: 'Gemini', text: 'நமஸ்தே! I\'m your Anthar-Jala AI guide. I can analyze water table trends, predict stress events, and recommend conservation strategies. How can I help you today?' },
  { id: 2, role: 'user', text: 'What is the water table trend in Kolar district this season?' },
  { id: 3, role: 'ai', model: 'Claude', text: 'Based on 847 borewell readings across Kolar district in 2024, the water table has declined an average of 2.3 m annually. Northern taluks show the highest stress. Borewells between 80–120 m depth need close monitoring this season.' },
  { id: 4, role: 'ai', model: 'GPT-4', text: '📊 90-Day ML Forecast (SageMaker):\n• 78% probability of further decline unless monsoon exceeds 850 mm\n• Model confidence: ▓▓▓▓▓░ 83%\n• Recommended action: Reduce extraction by 20% in stress zones' },
];

const POSTS = [
  { id: 1, user: 'Suresh Rao', role: 'Expert', loc: 'Kolar', av: 'SR', time: '2h', text: 'Noticed significant recharge at 85m depth after last week\'s rains. Recovery time dropped from 4h to 45min — best in 3 years!', likes: 24, cmts: 8 },
  { id: 2, user: 'Meera Patil', role: 'Farmer', loc: 'Tumkur', av: 'MP', time: '5h', text: 'My borewell dried at 120m last summer. Following expert advice here, deepened to 165m — now getting 1,800 L/h consistently. Game-changer!', likes: 41, cmts: 15 },
  { id: 3, user: 'Dr. Kumar', role: 'Geologist', loc: 'CGWB', av: 'DK', time: '1d', text: '⚠️ Pre-monsoon survey update: Anantapur and Kurnool districts showing critical stress indices. All farmers in these zones should initiate conservation protocols NOW.', likes: 89, cmts: 32 },
];

// ═══════════════════════════════════════════════════════════════
// FCM TOAST NOTIFICATION
// ═══════════════════════════════════════════════════════════════
function FCMToast({ msg, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, []);

  const lvlColor = { critical: C.rd, high: C.am, medium: C.cy, low: C.grn };
  const col = lvlColor[msg.lvl] || C.cy;

  return (
    <div style={{
      position: 'absolute', top: 8, left: 10, right: 10, zIndex: 100,
      background: 'rgba(4,18,38,0.97)', border: `0.5px solid ${col}40`,
      borderRadius: 14, padding: '10px 12px', backdropFilter: 'blur(20px)',
      animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px ${col}20`,
    }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
          background: `${col}18`, border: `0.5px solid ${col}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bell size={12} color={col} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: col, animation: 'pulse 1.5s ease infinite' }} />
              <span style={{ fontFamily: F.b, fontSize: 9, color: col, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>FCM Alert</span>
            </div>
            <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={11} color={C.txd} />
            </button>
          </div>
          <div style={{ fontFamily: F.b, fontSize: 11, fontWeight: 600, color: C.tx, marginBottom: 2 }}>{msg.title}</div>
          <div style={{ fontFamily: F.b, fontSize: 10, color: C.txm, lineHeight: 1.5 }}>{msg.msg}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: DASHBOARD
// ═══════════════════════════════════════════════════════════════
function DashboardScreen({ goTo, onTriggerNotif }) {
  const [anim, setAnim] = useState(false);
  const [liveReadings, setLiveReadings] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  useEffect(() => { setTimeout(() => setAnim(true), 80); }, []);
  useEffect(() => {
    api.getDashboard().then(res => {
      if (res) { setDashData(res.dashboard); if (res.readings?.length) setLiveReadings(res.readings); }
    });
    const disconnect = connectSSE((evt, data) => {
      if (evt === 'connected') setSseConnected(true);
      if (evt === 'disconnected') setSseConnected(false);
      if (evt === 'newReading') {
        setLiveReadings(prev => prev ? [data, ...prev].slice(0, 5) : [data]);
      }
    });
    return disconnect;
  }, []);
  const aC = l => ({ critical: C.rd, high: C.am, medium: C.cy, low: C.grn }[l] || C.cy);
  const displayReadings = (liveReadings || readings).map(r => ({
    id: r.id, depth: r.depth ? `${r.depth} m` : r.depth, yield: r.yield ? `${Number(r.yield).toLocaleString()} L/h` : r.yield,
    loc: r.location || r.loc, time: r.time || 'just now', status: r.status || 'good', synced: r.synced !== undefined ? r.synced : true,
  }));
  const dd = dashData || {};


  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 14px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 12px' }}>
        <div>
          <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Good Morning</div>
          <div style={{ fontFamily: F.d, fontSize: 19, color: C.tx, letterSpacing: '0.04em', marginTop: 1 }}>Ravi Kumar</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => goTo('alerts')}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.g, border: `0.5px solid ${C.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={15} color={C.txm} />
            </div>
            <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: C.rd, border: `1.5px solid ${C.bg}` }} />
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: C.cy15, border: `0.5px solid ${C.cy3}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }} onClick={() => goTo('profile')}>
            <span style={{ fontFamily: F.b, fontSize: 10, fontWeight: 700, color: C.cy }}>RK</span>
          </div>
        </div>
      </div>

      {/* Sync bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: sseConnected ? C.grn15 : C.am15, border: `0.5px solid ${sseConnected ? C.grn : C.am}25`, borderRadius: 8, padding: '5px 10px', marginBottom: 12 }}>
        {sseConnected ? <Wifi size={12} color={C.grn} /> : <WifiOff size={12} color={C.am} />}
        <span style={{ fontFamily: F.b, fontSize: 10, color: sseConnected ? C.grn : C.am }}>{sseConnected ? 'Real-time sync active — SSE Live' : 'Connecting to server...'}</span>
        <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: sseConnected ? C.grn : C.am, animation: 'pulse 1.8s ease infinite' }} />
      </div>

      {/* Borewell gauge card */}
      <Card style={{ position: 'relative', overflow: 'hidden', marginBottom: 12, animation: anim ? 'fadeUp 0.5s ease 0.05s both' : 'none', padding: '14px 16px' }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, left: '30%',
          backgroundImage: 'url("https://images.unsplash.com/photo-1544408542-a1b73e51d932?auto=format&fit=crop&w=400&q=80")',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.25, mixBlendMode: 'luminosity',
          maskImage: 'linear-gradient(to right, transparent, black)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <Tag label="Your Borewell" color={C.cy} />
            <div style={{ fontFamily: F.b, fontSize: 11, color: C.txd, marginTop: 5 }}>Kolar Village, Karnataka</div>
          </div>
          <Tag label="Active" color={C.grn} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 78, height: 78, flexShrink: 0 }}>
            <svg width="78" height="78" viewBox="0 0 78 78">
              <circle cx="39" cy="39" r="30" fill="none" stroke={C.bd} strokeWidth="5.5" />
              <circle cx="39" cy="39" r="30" fill="none" stroke={C.cy} strokeWidth="5.5"
                strokeDasharray={`${188 * 0.72} 188`} strokeDashoffset="47"
                strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.2s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: F.m, fontSize: 15, fontWeight: 700, color: C.cy }}>72%</div>
              <div style={{ fontFamily: F.b, fontSize: 8, color: C.txd }}>recharge</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
              {[{ l: 'Depth', v: '87m', c: C.tx }, { l: 'Yield', v: '2.4K', c: C.grn }, { l: 'Level', v: '12.4m', c: C.cy }].map(s => (
                <div key={s.l}>
                  <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{s.l}</div>
                  <div style={{ fontFamily: F.m, fontSize: 14, color: s.c, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={11} color={C.grn} />
              <span style={{ fontFamily: F.b, fontSize: 10, color: C.grn }}>+2.1m from last month</span>
            </div>
          </div>
        </div>
        </div>
      </Card>

      {/* Mini chart */}
      <Card style={{ marginBottom: 12, animation: anim ? 'fadeUp 0.5s ease 0.15s both' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: F.b, fontSize: 11, color: C.txm }}>Water Level · 2024</span>
          <Tag label="Live" color={C.grn} />
        </div>
        <ResponsiveContainer width="100%" height={72}>
          <AreaChart data={waterTrend} margin={{ top: 2, right: 0, bottom: 0, left: -32 }}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.cy} stopOpacity={0.38} />
                <stop offset="100%" stopColor={C.cy} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fill: C.txd, fontSize: 8, fontFamily: F.b }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={({ active, payload }) => active && payload?.length ? (
              <div style={{ background: C.s2, border: `0.5px solid ${C.bdm}`, borderRadius: 8, padding: '5px 9px' }}>
                <div style={{ fontFamily: F.m, fontSize: 12, color: C.cy }}>{payload[0].value}m</div>
              </div>
            ) : null} />
            <Area type="monotone" dataKey="lvl" stroke={C.cy} strokeWidth={1.8} fill="url(#cg)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent readings */}
      <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Recent Readings {liveReadings ? '· Live' : ''}</div>
      {displayReadings.map((r, i) => {
        const col = r.status === 'warn' ? C.am : C.grn;
        return (
          <Card key={r.id} accent={col} style={{ marginBottom: 8, animation: anim ? `fadeUp 0.5s ease ${0.25 + i * 0.08}s both` : 'none' }} onClick={() => goTo('history')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${col}15`, border: `0.5px solid ${col}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Droplets size={15} color={col} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: F.b, fontSize: 13, color: C.tx }}>{r.loc}</span>
                  <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{r.time}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                  <span style={{ fontFamily: F.m, fontSize: 10, color: C.txm }}>{r.depth}</span>
                  <span style={{ fontFamily: F.m, fontSize: 10, color: col }}>{r.yield}</span>
                  {r.synced
                    ? <span style={{ fontFamily: F.b, fontSize: 9, color: C.grn, marginLeft: 'auto' }}>✓ synced</span>
                    : <span style={{ fontFamily: F.b, fontSize: 9, color: C.am, marginLeft: 'auto' }}>⟳ pending</span>}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        {[
          { icon: Plus, label: 'Add Reading', color: C.cy, action: 'addreading' },
          { icon: Camera, label: 'Upload Photo', color: C.pu, action: 'media' },
          { icon: Map, label: 'View Heatmap', color: C.grn, action: 'map' },
          { icon: Zap, label: 'AI Forecast', color: C.am, action: 'ai' },
        ].map(({ icon: I, label, color, action }) => (
          <Card key={label} accent={color} onClick={() => action && goTo(action)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, border: `0.5px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <I size={14} color={color} />
            </div>
            <span style={{ fontFamily: F.b, fontSize: 12, color: C.txm }}>{label}</span>
          </Card>
        ))}
      </div>

      {/* Demo FCM trigger */}
      <button onClick={onTriggerNotif} style={{
        width: '100%', marginTop: 12, padding: '9px', borderRadius: 10, cursor: 'pointer',
        background: `${C.am}10`, border: `0.5px solid ${C.am}25`,
        fontFamily: F.b, fontSize: 10, color: C.am, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Bell size={11} color={C.am} /> Simulate FCM Push Notification
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: BOREWELL INPUT (NEW READING)
// ═══════════════════════════════════════════════════════════════
function BorewellInputScreen({ goTo }) {
  const [depth, setDepth] = useState('');
  const [yieldVal, setYieldVal] = useState('');
  const [loc, setLoc] = useState('Kolar Village');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const depthNum = parseFloat(depth);
  const yieldNum = parseFloat(yieldVal);

  const depthOk = depth && depthNum >= 0 && depthNum <= 500;
  const yieldOk = yieldVal && yieldNum >= 0 && yieldNum <= 50000;

  const validate = () => {
    const e = {};
    if (!depth) e.depth = 'Required';
    else if (depthNum < 0 || depthNum > 500) e.depth = 'Must be 0–500 m';
    if (!yieldVal) e.yield = 'Required';
    else if (yieldNum < 0 || yieldNum > 50000) e.yield = 'Must be 0–50,000 L/h';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.submitReading({ depth, yield: yieldVal, location: loc, notes });
    } catch (_) {}
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <WaterBg />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', animation: 'bounceIn 0.6s ease both' }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: C.grn15, border: `1px solid ${C.grn3}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Check size={34} color={C.grn} />
          </div>
          <div style={{ fontFamily: F.d, fontSize: 20, color: C.grn, letterSpacing: '0.05em', marginBottom: 8 }}>Reading Submitted!</div>
          <div style={{ fontFamily: F.b, fontSize: 12, color: C.txd, lineHeight: 1.6, marginBottom: 6 }}>
            Depth: <span style={{ color: C.cy, fontFamily: F.m }}>{depth}m</span> · Yield: <span style={{ color: C.grn, fontFamily: F.m }}>{yieldNum.toLocaleString()} L/h</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 24 }}>
            <Cloud size={11} color={C.cy} />
            <span style={{ fontFamily: F.b, fontSize: 10, color: C.txd }}>Syncing to DynamoDB via Lambda…</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSubmitted(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: C.g, border: `0.5px solid ${C.bd}`, cursor: 'pointer', fontFamily: F.b, fontSize: 12, color: C.txm }}>Add Another</button>
            <button onClick={() => goTo('dashboard')} style={{ flex: 1, padding: '11px', borderRadius: 10, background: C.cy15, border: `0.5px solid ${C.cy3}`, cursor: 'pointer', fontFamily: F.b, fontSize: 12, color: C.cy }}>Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const InputField = ({ label, val, onChange, placeholder, unit, hint, error, type = 'number' }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: F.b, fontSize: 10, color: C.txd, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        {hint && <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{hint}</span>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: error ? C.rd15 : C.g,
        border: `0.5px solid ${error ? C.rd + '40' : (val ? C.bdm : C.bd)}`,
        borderRadius: 12, padding: '12px 14px', transition: 'all 0.18s',
      }}>
        <input
          type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: F.m, fontSize: 16, color: C.tx }}
        />
        {unit && <span style={{ fontFamily: F.b, fontSize: 11, color: C.txd, flexShrink: 0 }}>{unit}</span>}
      </div>
      {error && <div style={{ fontFamily: F.b, fontSize: 10, color: C.rd, marginTop: 4 }}>⚠ {error}</div>}
    </div>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <WaterBg />
      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 16px' }}>
          <button onClick={() => goTo('dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
            <ArrowLeft size={15} color={C.txd} />
          </button>
          <div style={{ fontFamily: F.d, fontSize: 18, color: C.tx, letterSpacing: '0.04em' }}>Log Reading</div>
          <Tag label="Borewell" color={C.cy} />
        </div>

        {/* Location selector */}
        <Card style={{ marginBottom: 14, padding: '10px 14px' }}>
          <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Location</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {['Kolar Village', 'Doddabale Gram', 'Tumkur Road', '+ New'].map(l => (
              <button key={l} onClick={() => setLoc(l)} style={{
                padding: '5px 11px', borderRadius: 16, cursor: 'pointer', whiteSpace: 'nowrap',
                background: loc === l ? C.cy15 : C.g,
                border: `0.5px solid ${loc === l ? C.cy3 : C.bd}`,
                color: loc === l ? C.cy : C.txd,
                fontFamily: F.b, fontSize: 10, transition: 'all 0.15s',
              }}>{l}</button>
            ))}
          </div>
        </Card>

        {/* Depth field */}
        <InputField
          label="Borewell Depth"
          val={depth} onChange={setDepth}
          placeholder="e.g. 87"
          unit="metres" hint="Range: 0–500 m"
          error={errors.depth}
        />

        {/* Depth visual indicator */}
        {depthOk && (
          <div style={{ marginBottom: 14, animation: 'fadeUp 0.3s ease' }}>
            <ProgressBar
              value={depthNum} max={500} color={depthNum > 300 ? C.rd : depthNum > 150 ? C.am : C.cy}
              label={`Depth classification: ${depthNum > 300 ? 'Deep' : depthNum > 150 ? 'Medium' : 'Shallow'}`}
            />
          </div>
        )}

        {/* Yield field */}
        <InputField
          label="Borewell Yield"
          val={yieldVal} onChange={setYieldVal}
          placeholder="e.g. 2400"
          unit="L/h" hint="Range: 0–50,000 L/h"
          error={errors.yield}
        />

        {/* Yield classification */}
        {yieldOk && (
          <div style={{ marginBottom: 14, animation: 'fadeUp 0.3s ease' }}>
            <div style={{ display: 'flex', gap: 7 }}>
              {[['Poor', 0, 500, C.rd], ['Fair', 500, 2000, C.am], ['Good', 2000, 8000, C.cy], ['Excellent', 8000, 50000, C.grn]].map(([lbl, min, max, col]) => (
                <div key={lbl} style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, textAlign: 'center',
                  background: yieldNum >= min && yieldNum < max ? `${col}18` : 'rgba(255,255,255,0.03)',
                  border: `0.5px solid ${yieldNum >= min && yieldNum < max ? col + '35' : C.bd}`,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontFamily: F.b, fontSize: 8, color: yieldNum >= min && yieldNum < max ? col : C.txd }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Notes (optional)</div>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Soil type, casing material, pump specs…"
            rows={3}
            style={{
              width: '100%', background: C.g, border: `0.5px solid ${C.bd}`, borderRadius: 12,
              padding: '11px 14px', fontFamily: F.b, fontSize: 12, color: C.tx, outline: 'none', resize: 'none',
            }}
          />
        </div>

        {/* Offline indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.cy08, border: `0.5px solid ${C.bd}`, borderRadius: 8, padding: '7px 11px', marginBottom: 16 }}>
          <CloudOff size={11} color={C.txd} />
          <span style={{ fontFamily: F.b, fontSize: 10, color: C.txd }}>Offline-first · Saves locally, syncs when online</span>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={submitting}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            cursor: submitting ? 'default' : 'pointer',
            background: submitting ? 'rgba(0,200,240,0.15)' : `linear-gradient(135deg, ${C.cy} 0%, #0098c8 100%)`,
            color: submitting ? C.cy : '#002838',
            fontFamily: F.b, fontWeight: 600, fontSize: 14, letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {submitting ? (
            <>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C.cy}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              Submitting to Lambda…
            </>
          ) : 'Submit Reading →'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: MEDIA & BATCH ENTRY
// ═══════════════════════════════════════════════════════════════
function MediaScreen({ goTo }) {
  const [tab, setTab] = useState('photo');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [batchRows, setBatchRows] = useState([
    { id: 1, loc: 'Kolar Village', depth: '87', yield: '2400', status: 'ready' },
    { id: 2, loc: 'Doddabale Gram', depth: '132', yield: '820', status: 'ready' },
    { id: 3, loc: '', depth: '', yield: '', status: 'empty' },
  ]);

  const simulateUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false); setUploaded(true);
      setAnalysing(true);
      setTimeout(() => {
        setAnalysing(false);
        setAiResult({ condition: 'Good', casing: 'Steel', corrosion: '12%', recommendation: 'Maintenance due in ~6 months. Casing integrity is acceptable.' });
      }, 2000);
    }, 1800);
  };

  const submitBatch = () => {
    setBatchRows(r => r.map(row => row.status === 'ready' ? { ...row, status: 'sent' } : row));
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <WaterBg />
      <div style={{ position: 'relative', zIndex: 1, padding: '0 14px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 14px' }}>
          <button onClick={() => goTo('dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={15} color={C.txd} />
          </button>
          <div style={{ fontFamily: F.d, fontSize: 18, color: C.tx, letterSpacing: '0.04em' }}>Media & Batch</div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16, background: C.g, border: `0.5px solid ${C.bd}`, borderRadius: 12, padding: 4 }}>
          {[{ id: 'photo', label: '📷 Photo Upload', icon: Camera }, { id: 'batch', label: '⚡ Batch Entry', icon: Layers }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', border: 'none', transition: 'all 0.18s',
              background: tab === t.id ? C.cy15 : 'transparent',
              color: tab === t.id ? C.cy : C.txd,
              fontFamily: F.b, fontSize: 11, fontWeight: tab === t.id ? 600 : 400,
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'photo' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Upload zone */}
            <div onClick={!uploading && !uploaded ? simulateUpload : undefined} style={{
              border: `1px dashed ${uploaded ? C.grn + '50' : C.cy3}`,
              borderRadius: 16, padding: '28px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: uploaded ? C.grn15 : C.cy08,
              cursor: uploading || uploaded ? 'default' : 'pointer',
              marginBottom: 14, transition: 'all 0.2s',
            }}>
              {uploading ? (
                <>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C.cy}`, borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
                  <div style={{ fontFamily: F.b, fontSize: 12, color: C.cy }}>Uploading to S3…</div>
                </>
              ) : uploaded ? (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: C.grn15, border: `0.5px solid ${C.grn3}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={22} color={C.grn} />
                  </div>
                  <div style={{ fontFamily: F.b, fontSize: 12, color: C.grn }}>borewell_kolar_2024.jpg uploaded</div>
                </>
              ) : (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: C.cy15, border: `0.5px solid ${C.cy3}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={22} color={C.cy} />
                  </div>
                  <div style={{ fontFamily: F.b, fontSize: 13, color: C.txm }}>Tap to capture or upload</div>
                  <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd }}>JPG, PNG · Max 20MB</div>
                </>
              )}
            </div>

            {/* AI Computer Vision Analysis */}
            {uploaded && (
              <Card accent={C.pu} style={{ marginBottom: 14, animation: 'fadeUp 0.4s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontFamily: F.b, fontSize: 11, fontWeight: 600, color: C.pu }}>AI Computer Vision</div>
                  <Tag label="Gemini Vision" color={C.pu} />
                </div>
                {analysing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Skeleton w="100%" h={10} />
                    <Skeleton w="80%" h={10} />
                    <Skeleton w="90%" h={10} />
                  </div>
                ) : aiResult ? (
                  <div>
                    {[
                      { l: 'Borewell Condition', v: aiResult.condition, c: C.grn },
                      { l: 'Casing Material', v: aiResult.casing, c: C.cy },
                      { l: 'Corrosion Level', v: aiResult.corrosion, c: C.am },
                    ].map(row => (
                      <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontFamily: F.b, fontSize: 11, color: C.txm }}>{row.l}</span>
                        <span style={{ fontFamily: F.m, fontSize: 11, color: row.c }}>{row.v}</span>
                      </div>
                    ))}
                    <Divider />
                    <div style={{ fontFamily: F.b, fontSize: 11, color: C.txd, lineHeight: 1.55, marginTop: 6 }}>
                      💡 {aiResult.recommendation}
                    </div>
                  </div>
                ) : null}
              </Card>
            )}

            {!uploaded && (
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={simulateUpload} style={{
                  flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer',
                  background: C.cy15, border: `0.5px solid ${C.cy3}`,
                  fontFamily: F.b, fontSize: 11, color: C.cy, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  <Camera size={13} color={C.cy} /> Camera
                </button>
                <button onClick={simulateUpload} style={{
                  flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer',
                  background: C.pu15, border: `0.5px solid ${C.pu}28`,
                  fontFamily: F.b, fontSize: 11, color: C.pu, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  <Upload size={13} color={C.pu} /> Gallery
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'batch' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd, marginBottom: 10 }}>
              Submit multiple readings at once. Auto-syncs via WorkManager.
            </div>
            {batchRows.map((row, i) => (
              <Card key={row.id} accent={row.status === 'sent' ? C.grn : row.status === 'ready' ? C.cy : undefined} style={{ marginBottom: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: row.status === 'empty' ? 8 : 4 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: row.status === 'sent' ? C.grn15 : row.status === 'ready' ? C.cy15 : C.g,
                    border: `0.5px solid ${row.status === 'sent' ? C.grn3 : row.status === 'ready' ? C.cy3 : C.bd}`,
                    fontFamily: F.m, fontSize: 9, color: row.status === 'sent' ? C.grn : row.status === 'ready' ? C.cy : C.txd,
                  }}>{row.status === 'sent' ? '✓' : i + 1}</div>
                  <input
                    value={row.loc}
                    onChange={e => setBatchRows(r => r.map((x, j) => j === i ? { ...x, loc: e.target.value, status: x.depth && e.target.value ? 'ready' : 'empty' } : x))}
                    placeholder="Location name"
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: F.b, fontSize: 12, color: C.tx }}
                  />
                  {row.status === 'sent' && <Tag label="Sent" color={C.grn} />}
                </div>
                {row.status !== 'sent' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input
                      value={row.depth}
                      onChange={e => setBatchRows(r => r.map((x, j) => j === i ? { ...x, depth: e.target.value, status: x.loc && e.target.value ? 'ready' : 'empty' } : x))}
                      placeholder="Depth (m)"
                      style={{ background: C.g, border: `0.5px solid ${C.bd}`, borderRadius: 8, padding: '7px 10px', fontFamily: F.m, fontSize: 12, color: C.tx, outline: 'none' }}
                    />
                    <input
                      value={row.yield}
                      onChange={e => setBatchRows(r => r.map((x, j) => j === i ? { ...x, yield: e.target.value } : x))}
                      placeholder="Yield (L/h)"
                      style={{ background: C.g, border: `0.5px solid ${C.bd}`, borderRadius: 8, padding: '7px 10px', fontFamily: F.m, fontSize: 12, color: C.tx, outline: 'none' }}
                    />
                  </div>
                )}
              </Card>
            ))}
            <button onClick={() => setBatchRows(r => [...r, { id: Date.now(), loc: '', depth: '', yield: '', status: 'empty' }])} style={{
              width: '100%', padding: '9px', borderRadius: 10, cursor: 'pointer', marginBottom: 12,
              background: C.g, border: `0.5px dashed ${C.bd}`,
              fontFamily: F.b, fontSize: 11, color: C.txd, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Plus size={11} color={C.txd} /> Add Row
            </button>
            <button onClick={submitBatch} style={{
              width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
              background: `linear-gradient(135deg, ${C.cy} 0%, #0098c8 100%)`,
              border: 'none', fontFamily: F.b, fontWeight: 600, fontSize: 13, color: '#002838',
            }}>Submit {batchRows.filter(r => r.status === 'ready').length} Readings</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: MAP (Interactive Heatmap)
// ═══════════════════════════════════════════════════════════════
function MapScreen() {
  const [selected, setSelected] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const { data: heatmapData, loading } = useHeatmap();

  useEffect(() => {
    const t = setInterval(() => setLastUpdate(s => s + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const grid = heatmapData?.grid || [
    [0.2, 0.4, 0.7, 0.9, 0.6, 0.3, 0.5, 0.4],
    [0.3, 0.8, 1.0, 0.8, 0.5, 0.4, 0.7, 0.6],
    [0.5, 0.9, 0.7, 0.5, 0.4, 0.8, 0.8, 0.5],
    [0.7, 0.6, 0.4, 0.3, 0.8, 0.9, 0.5, 0.4],
    [0.9, 0.4, 0.3, 0.6, 0.7, 0.5, 0.3, 0.3],
    [0.6, 0.3, 0.5, 0.8, 0.5, 0.3, 0.2, 0.4],
    [0.3, 0.4, 0.6, 0.5, 0.3, 0.4, 0.5, 0.6],
  ];
  const heatColor = v => {
    if (v > 0.8) return `rgba(255,50,75,${v * 0.85})`;
    if (v > 0.6) return `rgba(255,175,25,${v * 0.8})`;
    if (v > 0.4) return `rgba(0,210,100,${v * 0.65})`;
    return `rgba(0,185,240,${v * 0.55})`;
  };
  const pins = heatmapData?.pins || [
    { top: '28%', left: '36%', name: 'Kolar', stress: 'critical', wells: 124, avg: 147 },
    { top: '50%', left: '56%', name: 'Tumkur', stress: 'low', wells: 89, avg: 72 },
    { top: '68%', left: '26%', name: 'Anantapur', stress: 'high', wells: 67, avg: 138 },
  ];
  const totalReadings = heatmapData?.totalReadings || 847;
  const stressColor = { critical: C.rd, high: C.am, medium: C.cy, low: C.grn };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', margin: '8px 14px 8px', overflow: 'hidden', borderRadius: 16, border: `0.5px solid ${C.bdm}` }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(150deg, #031828 0%, #041f38 50%, #02111e 100%)` }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.1 }}>
          <line x1="0" y1="42%" x2="100%" y2="38%" stroke="#00c8f0" strokeWidth="1" />
          <line x1="0" y1="66%" x2="100%" y2="72%" stroke="#00c8f0" strokeWidth="0.5" />
          <line x1="32%" y1="0" x2="28%" y2="100%" stroke="#00c8f0" strokeWidth="0.5" />
          <line x1="62%" y1="0" x2="66%" y2="100%" stroke="#00c8f0" strokeWidth="1" />
          <circle cx="38%" cy="30%" r="22" fill="none" stroke="#00c8f0" strokeWidth="0.4" strokeDasharray="3 4" />
          <circle cx="58%" cy="52%" r="15" fill="none" stroke="#00c8f0" strokeWidth="0.4" strokeDasharray="3 4" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateRows: `repeat(${grid.length}, 1fr)`, opacity: 0.7 }}>
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
              {row.map((v, ci) => <div key={ci} style={{ background: heatColor(v) }} />)}
            </div>
          ))}
        </div>
        {pins.map(p => (
          <div key={p.name} onClick={() => setSelected(selected?.name === p.name ? null : p)}
            style={{ position: 'absolute', top: p.top, left: p.left, transform: 'translate(-50%,-100%)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{
              background: selected?.name === p.name ? stressColor[p.stress] : 'rgba(0,0,0,0.7)',
              border: `1px solid ${stressColor[p.stress]}`,
              borderRadius: 4, padding: '3px 7px',
              fontFamily: F.b, fontSize: 9, color: selected?.name === p.name ? '#000' : stressColor[p.stress], fontWeight: 700, whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)', transition: 'all 0.2s',
            }}>{p.name}</div>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: stressColor[p.stress], boxShadow: `0 0 10px ${stressColor[p.stress]}`, animation: 'pulse 2s ease infinite' }} />
          </div>
        ))}
        <div style={{
          position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
          border: `0.5px solid ${C.grn}30`, borderRadius: 8, padding: '4px 9px',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.grn, animation: 'pulse 1.6s ease infinite' }} />
          <span style={{ fontFamily: F.b, fontSize: 9, color: C.grn, letterSpacing: '0.08em' }}>LIVE · 30s</span>
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${C.cy}40, transparent)`,
          animation: 'scanLine 3s linear infinite',
        }} />
      </div>

      {selected && (
        <div style={{ margin: '0 14px 8px', animation: 'fadeUp 0.3s ease' }}>
          <Card accent={stressColor[selected.stress]} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${stressColor[selected.stress]}18`, border: `0.5px solid ${stressColor[selected.stress]}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Droplets size={17} color={stressColor[selected.stress]} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: F.b, fontSize: 14, fontWeight: 600, color: C.tx }}>{selected.name}</span>
                <Tag label={selected.stress} color={stressColor[selected.stress]} />
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                <span style={{ fontFamily: F.m, fontSize: 11, color: C.txm }}>{selected.wells} boreholes</span>
                <span style={{ fontFamily: F.m, fontSize: 11, color: stressColor[selected.stress] }}>avg {selected.avg}m depth</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div style={{ padding: '0 14px 10px' }}>
        <Card accent={C.cy} style={{ position: 'relative', overflow: 'hidden', padding: '10px 13px' }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: '40%',
            backgroundImage: 'url("https://images.unsplash.com/photo-1544408542-a1b73e51d932?auto=format&fit=crop&w=400&q=80")',
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.15, mixBlendMode: 'luminosity',
            maskImage: 'linear-gradient(to right, transparent, black)'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Water Stress Index · {totalReadings} readings</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['Critical', C.rd], ['High', C.am], ['Moderate', C.cy], ['Low', C.grn]].map(([l, c]) => (
                <div key={l} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
                  <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: ALERTS
// ═══════════════════════════════════════════════════════════════
function AlertsScreen() {
  const [filter, setFilter] = useState('all');
  const { alerts, loading } = useAlerts();

  const allAlerts = (alerts?.length ? alerts : ALERTS).map(a => ({
    id: a.id, lvl: a.level || a.lvl, title: a.title, loc: a.location || a.loc,
    msg: a.message || a.msg, time: a.time || 'now', ai: a.ai || null,
  }));
  const aC = l => ({ critical: C.rd, high: C.am, medium: C.cy, low: C.grn }[l] || C.cy);
  const AI = l => l === 'low' ? CheckCircle : l === 'medium' ? Info : AlertTriangle;
  const filtered = filter === 'all' ? allAlerts : allAlerts.filter(a => a.lvl === filter);
  const mCol = { Gemini: '#4285F4', Claude: '#CC785C', 'GPT-4': '#74aa9c' };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 12px' }}>
        <div style={{ fontFamily: F.d, fontSize: 19, color: C.tx, letterSpacing: '0.04em' }}>Alerts</div>
        <Tag label={`${allAlerts.length} Active`} color={C.rd} />
      </div>

      <div style={{ display: 'flex', gap: 5, marginBottom: 14, overflowX: 'auto' }}>
        {['all', 'critical', 'high', 'medium', 'low'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '4px 11px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
            background: filter === f ? `${aC(f)}1e` : C.g,
            border: `0.5px solid ${filter === f ? aC(f) + '3c' : C.bd}`,
            color: filter === f ? aC(f) : C.txd,
            fontFamily: F.b, fontSize: 10, fontWeight: 500, textTransform: 'capitalize', transition: 'all 0.15s',
          }}>{f === 'all' ? `All (${allAlerts.length})` : f}</button>
        ))}
      </div>

      {filtered.map((a, i) => {
        const col = aC(a.lvl);
        const Icon = AI(a.lvl);
        return (
          <Card key={a.id} accent={col} style={{ marginBottom: 10, animation: `fadeUp 0.4s ease ${i * 0.07}s both` }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${col}15`, border: `0.5px solid ${col}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Icon size={15} color={col} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                  <Tag label={a.lvl} color={col} />
                  <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{a.time} ago</span>
                </div>
                <div style={{ fontFamily: F.b, fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 3 }}>{a.title}</div>
                <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd, marginBottom: 6 }}>📍 {a.loc}</div>
                <div style={{ fontFamily: F.b, fontSize: 11, color: C.txm, lineHeight: 1.55 }}>{a.msg}</div>
                {a.ai && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: mCol[a.ai] }} />
                    <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>Detected by {a.ai}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: AI GUIDE
// ═══════════════════════════════════════════════════════════════
function AIGuideScreen() {
  const [messages, setMessages] = useState(CHATS);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [activeModel, setActiveModel] = useState('Claude');
  const [showConsensus, setShowConsensus] = useState(false);
  const [consensusLoading, setConsensusLoading] = useState(false);
  const scrollRef = useRef();
  const mCol = { Gemini: '#4285F4', Claude: '#CC785C', 'GPT-4': '#74aa9c' };
  const suggestions = ['90-day forecast for Kolar', 'Best borewell depth in clay soil', 'Monsoon recharge estimate'];

  const send = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMessages(m => [...m, { id: Date.now(), role: 'user', text: msg }]);
    setInput('');
    setTyping(true);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 100);
    try {
      const res = await api.sendAIMessage(msg, activeModel);
      setTyping(false);
      setMessages(m => [...m, {
        id: Date.now() + 1, role: 'ai', model: res?.model || activeModel,
        text: res?.response || `Analyzing: "${msg.slice(0, 40)}..."\n\nBased on real-time data across 847 Karnataka boreholes.`,
      }]);
    } catch (_) {
      setTyping(false);
      setMessages(m => [...m, {
        id: Date.now() + 1, role: 'ai', model: activeModel,
        text: `I encountered a connectivity issue. Please try again.`,
      }]);
    }
  }, [input, activeModel]);

  const triggerConsensus = () => {
    setShowConsensus(true);
    setConsensusLoading(true);
    setTimeout(() => setConsensusLoading(false), 2400);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `0.5px solid ${C.bd}` }}>
        <div>
          <div style={{ fontFamily: F.d, fontSize: 15, color: C.tx, letterSpacing: '0.04em' }}>AI Guide</div>
          <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd, marginTop: 1 }}>Multi-model groundwater intelligence</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(mCol).map(([model, col]) => (
            <button key={model} onClick={() => setActiveModel(model)} style={{
              background: activeModel === model ? `${col}20` : C.g,
              border: `0.5px solid ${activeModel === model ? col + '40' : C.bd}`,
              borderRadius: 6, padding: '3px 7px', fontFamily: F.b, fontSize: 9, color: activeModel === model ? col : C.txd,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{model}</button>
          ))}
        </div>
      </div>

      {/* Multi-model consensus panel */}
      {showConsensus && (
        <div style={{ margin: '8px 14px 0', animation: 'fadeUp 0.4s ease' }}>
          <Card accent={C.pu} style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontFamily: F.b, fontSize: 10, fontWeight: 600, color: C.pu }}>Multi-Model Consensus · 90-Day</div>
              <button onClick={() => setShowConsensus(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={11} color={C.txd} />
              </button>
            </div>
            {consensusLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['SageMaker XGBoost', 'Gemini 2.0 Flash', 'Claude Sonnet', 'GPT-4o'].map(m => (
                  <div key={m} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd, width: 90, flexShrink: 0 }}>{m}</div>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: `linear-gradient(90deg, ${C.pu}60, ${C.pu})`, borderRadius: 3, animation: 'shimmer 1.6s ease infinite', backgroundSize: '200% 100%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {[
                  { model: 'SageMaker XGBoost', pred: '-4.2m', conf: 83, col: C.cy },
                  { model: 'Gemini 2.0 Flash', pred: '-3.8m', conf: 76, col: '#4285F4' },
                  { model: 'Claude Sonnet', pred: '-4.5m', conf: 81, col: '#CC785C' },
                  { model: 'GPT-4o', pred: '-3.9m', conf: 78, col: '#74aa9c' },
                ].map(row => (
                  <div key={row.model} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: F.b, fontSize: 9, color: C.txm }}>{row.model}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: F.m, fontSize: 9, color: C.rd }}>{row.pred}</span>
                        <span style={{ fontFamily: F.m, fontSize: 9, color: row.col }}>{row.conf}%</span>
                      </div>
                    </div>
                    <ProgressBar value={row.conf} max={100} color={row.col} />
                  </div>
                ))}
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontFamily: F.b, fontSize: 10, color: C.txm }}>Ensemble Prediction</span>
                  <span style={{ fontFamily: F.m, fontSize: 12, color: C.rd, fontWeight: 700 }}>-4.1m</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeUp 0.3s ease' }}>
            {m.role === 'ai' && (
              <div style={{
                width: 24, height: 24, borderRadius: 7, background: `${mCol[m.model] || C.cy}1c`, border: `0.5px solid ${mCol[m.model] || C.cy}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 6, marginTop: 4,
                fontFamily: F.b, fontSize: 8, fontWeight: 700, color: mCol[m.model] || C.cy,
              }}>{m.model?.slice(0, 2)}</div>
            )}
            <div style={{
              maxWidth: '80%',
              background: m.role === 'user' ? C.cy15 : C.g,
              border: `0.5px solid ${m.role === 'user' ? C.cy3 : C.bd}`,
              borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
              padding: '8px 11px',
            }}>
              {m.model && <div style={{ fontFamily: F.b, fontSize: 8, color: mCol[m.model] || C.cy, marginBottom: 4, letterSpacing: '0.08em' }}>{m.model} · AI</div>}
              <div style={{ fontFamily: F.b, fontSize: 12, color: C.txm, lineHeight: 1.65, whiteSpace: 'pre-line' }}>{m.text}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: `${mCol[activeModel]}1c`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.b, fontSize: 8, color: mCol[activeModel] }}>{activeModel.slice(0, 2)}</div>
            <div style={{ background: C.g, border: `0.5px solid ${C.bd}`, borderRadius: '12px 12px 12px 3px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 0.3, 0.6].map(d => <div key={d} style={{ width: 4, height: 4, borderRadius: '50%', background: mCol[activeModel], animation: `pulse 1s ease ${d}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Consensus button */}
      <div style={{ padding: '0 14px 4px' }}>
        <button onClick={triggerConsensus} style={{
          width: '100%', padding: '7px', borderRadius: 9, cursor: 'pointer',
          background: C.pu15, border: `0.5px solid ${C.pu}28`,
          fontFamily: F.b, fontSize: 10, color: C.pu, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          <Activity size={11} color={C.pu} /> Multi-Model 90-Day Consensus
        </button>
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', gap: 5, padding: '4px 14px', overflowX: 'auto', paddingBottom: 6 }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => send(s)} style={{
            background: C.g, border: `0.5px solid ${C.bd}`, borderRadius: 16, padding: '4px 10px',
            fontFamily: F.b, fontSize: 10, color: C.txd, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{s}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '4px 14px 10px', borderTop: `0.5px solid ${C.bd}` }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: C.g, border: `0.5px solid ${C.bdm}`, borderRadius: 12, padding: '8px 8px 8px 13px' }}>
          <input
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about water trends, forecasts..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: F.b, fontSize: 13, color: C.tx }}
          />
          <button onClick={() => send()} style={{
            width: 32, height: 32, borderRadius: 8, background: C.cy15, border: `0.5px solid ${C.cy3}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.cy, flexShrink: 0,
          }}><Send size={13} /></button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: HISTORY / ANALYTICS + 90-DAY FORECAST + EXPORT
// ═══════════════════════════════════════════════════════════════
function HistoryScreen() {
  const [period, setPeriod] = useState('1Y');
  const [showForecast, setShowForecast] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [exportDone, setExportDone] = useState(null);
  const { data: analyticsData } = useAnalytics();
  
  const wTrend = analyticsData?.waterTrend || waterTrend;
  const fData = analyticsData?.forecast || forecastData;
  const kpiData = analyticsData?.kpi || { level: '21.4m', yield: '3.2K' };

  const triggerExport = (fmt) => {
    setExporting(fmt);
    setTimeout(() => { setExporting(null); setExportDone(fmt); setTimeout(() => setExportDone(null), 2500); }, 1600);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 12px' }}>
        <div style={{ fontFamily: F.d, fontSize: 19, color: C.tx, letterSpacing: '0.04em' }}>Analytics</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['3M', '6M', '1Y', '2Y'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: period === p ? C.cy15 : C.g,
              color: period === p ? C.cy : C.txd,
              fontFamily: F.m, fontSize: 9,
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 12 }}>
        {[{ l: 'Avg Level', v: kpiData.level || '21.4m', c: C.cy }, { l: 'Peak Yield', v: kpiData.yield || '3.2K L/h', c: C.grn }, { l: 'Stress Days', v: '47', c: C.am }].map(s => (
          <Card key={s.l} accent={s.c} style={{ textAlign: 'center', padding: '10px 6px', animation: 'countUp 0.5s ease both' }}>
            <div style={{ fontFamily: F.b, fontSize: 8, color: C.txd, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontFamily: F.m, fontSize: 15, color: s.c }}>{s.v}</div>
          </Card>
        ))}
      </div>

      {/* Area chart */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: F.b, fontSize: 11, color: C.txm, marginBottom: 8 }}>Water Level vs Rainfall · 2024</div>
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={wTrend} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <XAxis dataKey="m" tick={{ fill: C.txd, fontSize: 8, fontFamily: F.b }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.txd, fontSize: 8 }} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <div style={{ background: C.s2, border: `0.5px solid ${C.bdm}`, borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd, marginBottom: 3 }}>{label}</div>
                {payload.map(p => <div key={p.dataKey} style={{ fontFamily: F.m, fontSize: 11, color: p.color }}>{p.name}: {p.value}</div>)}
              </div>
            ) : null} />
            <Line type="monotone" dataKey="lvl" stroke={C.cy} strokeWidth={2} dot={false} name="Level (m)" />
            <Line type="monotone" dataKey="rain" stroke={C.grn} strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="Rain (mm)" />
            <Line type="monotone" dataKey="avg" stroke={C.txd} strokeWidth={1} dot={false} strokeDasharray="2 4" name="5yr Avg" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          {[{ c: C.cy, l: 'Water Level', d: false }, { c: C.grn, l: 'Rainfall', d: true }, { c: C.txd, l: '5yr Avg', d: true }].map(({ c, l, d }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 14, height: 2, background: d ? 'transparent' : c, borderRadius: 1, borderTop: d ? `1.5px dashed ${c}` : 'none' }} />
              <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Bar chart */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: F.b, fontSize: 11, color: C.txm, marginBottom: 8 }}>Last 6 Months vs Historical Average</div>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={wTrend.slice(-6)} margin={{ top: 2, right: 4, bottom: 0, left: -28 }}>
            <XAxis dataKey="m" tick={{ fill: C.txd, fontSize: 8, fontFamily: F.b }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.txd, fontSize: 8 }} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload }) => active && payload?.length ? (
              <div style={{ background: C.s2, border: `0.5px solid ${C.bdm}`, borderRadius: 8, padding: '5px 9px' }}>
                <div style={{ fontFamily: F.m, fontSize: 11, color: C.cy }}>{payload[0]?.value}m</div>
              </div>
            ) : null} />
            <Bar dataKey="lvl" fill={C.cy} opacity={0.85} radius={[3, 3, 0, 0]} />
            <Bar dataKey="avg" fill={C.txd} opacity={0.35} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 90-Day ML Forecast toggle */}
      <button onClick={() => setShowForecast(f => !f)} style={{
        width: '100%', padding: '10px 14px', borderRadius: 12, marginBottom: 10, cursor: 'pointer',
        background: showForecast ? C.am15 : C.g,
        border: `0.5px solid ${showForecast ? C.am + '35' : C.bd}`,
        display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: C.am15, border: `0.5px solid ${C.am}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={14} color={C.am} />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontFamily: F.b, fontSize: 12, fontWeight: 600, color: C.am }}>90-Day SageMaker Forecast</div>
          <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>XGBoost · Multi-model ensemble</div>
        </div>
        <ChevronDown size={13} color={C.txd} style={{ transform: showForecast ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {showForecast && (
        <Card accent={C.am} style={{ marginBottom: 12, animation: 'fadeUp 0.35s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: F.b, fontSize: 11, color: C.txm }}>Water Level Forecast (m) · 13 weeks</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['SM', C.cy], ['G', '#4285F4'], ['Cl', '#CC785C'], ['GP', '#74aa9c']].map(([k, c]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
                  <span style={{ fontFamily: F.b, fontSize: 8, color: C.txd }}>{k}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={fData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="d" tick={{ fill: C.txd, fontSize: 7, fontFamily: F.b }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.txd, fontSize: 7 }} axisLine={false} tickLine={false} domain={[8, 38]} />
              <ReferenceLine y={15} stroke={C.rd} strokeDasharray="3 3" strokeWidth={0.8} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div style={{ background: C.s2, border: `0.5px solid ${C.bdm}`, borderRadius: 8, padding: '5px 9px' }}>
                  <div style={{ fontFamily: F.b, fontSize: 8, color: C.txd, marginBottom: 3 }}>{label}</div>
                  {payload.map(p => <div key={p.dataKey} style={{ fontFamily: F.m, fontSize: 10, color: p.stroke }}>{p.value}m</div>)}
                </div>
              ) : null} />
              <Line type="monotone" dataKey="sm" stroke={C.cy} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="g" stroke="#4285F4" strokeWidth={1} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="cl" stroke="#CC785C" strokeWidth={1} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="gpt" stroke="#74aa9c" strokeWidth={1} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8 }}>
            {[{ label: 'SageMaker Confidence', val: 83, col: C.cy }, { label: 'Ensemble Agreement', val: 76, col: C.am }].map(row => (
              <ProgressBar key={row.label} value={row.val} max={100} color={row.col} label={row.label} style={{ marginBottom: 6 }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, background: C.rd15, borderRadius: 7, padding: '5px 9px' }}>
            <AlertTriangle size={11} color={C.rd} />
            <span style={{ fontFamily: F.b, fontSize: 10, color: C.rd }}>Stress threshold (15m) breach likely in W3–W5</span>
          </div>
        </Card>
      )}

      {/* Export options */}
      <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Export Data</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { fmt: 'CSV', icon: FileText, color: C.grn, desc: 'Spreadsheet' },
          { fmt: 'PDF', icon: Download, color: C.cy, desc: 'Report' },
        ].map(({ fmt, icon: Icon, color, desc }) => (
          <button key={fmt} onClick={() => triggerExport(fmt)} style={{
            flex: 1, padding: '11px', borderRadius: 12, cursor: 'pointer',
            background: exportDone === fmt ? `${color}18` : C.g,
            border: `0.5px solid ${exportDone === fmt ? color + '35' : C.bd}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.2s',
          }}>
            {exporting === fmt ? (
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${color}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            ) : exportDone === fmt ? (
              <Check size={18} color={color} />
            ) : (
              <Icon size={18} color={color} />
            )}
            <div style={{ fontFamily: F.b, fontSize: 11, color: exportDone === fmt ? color : C.txm, fontWeight: exportDone === fmt ? 600 : 400 }}>
              {exportDone === fmt ? 'Downloaded!' : `Export ${fmt}`}
            </div>
            <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{desc}</div>
          </button>
        ))}
      </div>

      {/* Submission list */}
      <div style={{ fontFamily: F.b, fontSize: 10, color: C.txd, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Submission History</div>
      {readings.map((r, i) => (
        <Card key={r.id} style={{ marginBottom: 7, animation: `fadeUp 0.4s ease ${i * 0.09}s both` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.status === 'warn' ? C.am : C.grn, animation: 'pulse 2s ease infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.b, fontSize: 12, color: C.tx }}>{r.loc}</div>
              <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd, marginTop: 1 }}>{r.time} ago</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: F.m, fontSize: 10, color: C.txm }}>{r.depth}</div>
                <div style={{ fontFamily: F.m, fontSize: 10, color: r.status === 'warn' ? C.am : C.grn }}>{r.yield}</div>
              </div>
              {r.synced
                ? <Cloud size={11} color={C.grn} />
                : <CloudOff size={11} color={C.am} />}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: COMMUNITY (with DM / thread view)
// ═══════════════════════════════════════════════════════════════
function CommunityScreen() {
  const rCol = { Expert: C.cy, Farmer: C.grn, Geologist: C.am };
  const [liked, setLiked] = useState({});
  const [activeThread, setActiveThread] = useState(null);
  const [threadInput, setThreadInput] = useState('');
  
  // Realtime Data
  const { connected, lastEvent, on: onEvent } = useRealtimeData();
  const { posts: livePosts, loading } = useCommunity({ on: onEvent });
  
  const displayPosts = livePosts?.length ? livePosts : POSTS;

  const [threadReplies, setThreadReplies] = useState({
    1: [{ av: 'YP', user: 'Yash P.', text: 'Which pump brand do you recommend?', time: '1h' }],
    2: [],
    3: [{ av: 'RK', user: 'Ravi Kumar', text: 'Deepening worked for us too — to 178m.', time: '3h' }, { av: 'SR', user: 'Suresh Rao', text: 'Important to get geophysical survey first!', time: '2h' }],
  });

  const sendReply = (postId) => {
    if (!threadInput.trim()) return;
    setThreadReplies(r => ({ ...r, [postId]: [...(r[postId] || []), { av: 'RK', user: 'Ravi Kumar', text: threadInput, time: 'now' }] }));
    setThreadInput('');
  };

  if (activeThread) {
    const post = displayPosts.find(p => p.id === activeThread);
    const col = rCol[post?.role] || C.cy;
    const replies = threadReplies[activeThread] || [];

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px', borderBottom: `0.5px solid ${C.bd}` }}>
          <button onClick={() => setActiveThread(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={15} color={C.txd} />
          </button>
          <div style={{ fontFamily: F.b, fontSize: 14, color: C.tx }}>Thread</div>
          <Tag label={`${replies.length} replies`} color={C.cy} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {/* OP */}
          <Card style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${col}18`, border: `0.5px solid ${col}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: F.b, fontWeight: 700, fontSize: 10, color: col }}>{post.av}</div>
              <div>
                <div style={{ fontFamily: F.b, fontSize: 13, fontWeight: 600, color: C.tx }}>{post.user}</div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}>
                  <Tag label={post.role} color={col} />
                  <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>📍 {post.loc}</span>
                </div>
              </div>
            </div>
            <div style={{ fontFamily: F.b, fontSize: 12, color: C.txm, lineHeight: 1.6 }}>{post.text}</div>
          </Card>

          {/* Replies */}
          <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Replies</div>
          {replies.length === 0 && (
            <div style={{ fontFamily: F.b, fontSize: 11, color: C.txd, textAlign: 'center', padding: '18px 0' }}>Be the first to reply!</div>
          )}
          {replies.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 9, animation: 'fadeUp 0.3s ease' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: C.cy15, border: `0.5px solid ${C.cy3}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: F.b, fontSize: 9, color: C.cy, fontWeight: 700 }}>{r.av}</div>
              <div style={{ flex: 1, background: C.g, border: `0.5px solid ${C.bd}`, borderRadius: '10px 10px 10px 3px', padding: '8px 11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: F.b, fontSize: 11, fontWeight: 600, color: C.tx }}>{r.user}</span>
                  <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{r.time}</span>
                </div>
                <div style={{ fontFamily: F.b, fontSize: 12, color: C.txm, lineHeight: 1.55 }}>{r.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply input */}
        <div style={{ padding: '8px 14px 12px', borderTop: `0.5px solid ${C.bd}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: C.g, border: `0.5px solid ${C.bdm}`, borderRadius: 12, padding: '8px 8px 8px 13px' }}>
            <input
              value={threadInput} onChange={e => setThreadInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendReply(activeThread)}
              placeholder="Write a reply…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: F.b, fontSize: 13, color: C.tx }}
            />
            <button onClick={() => sendReply(activeThread)} style={{
              width: 32, height: 32, borderRadius: 8, background: C.cy15, border: `0.5px solid ${C.cy3}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}><Send size={13} color={C.cy} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 10px' }}>
        <div style={{ fontFamily: F.d, fontSize: 19, color: C.tx, letterSpacing: '0.04em' }}>Community</div>
        <button style={{ background: C.cy15, border: `0.5px solid ${C.cy3}`, borderRadius: 8, padding: '5px 11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={12} color={C.cy} />
          <span style={{ fontFamily: F.b, fontSize: 10, color: C.cy }}>Post</span>
        </button>
      </div>

      {/* Online count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.grn15, border: `0.5px solid ${C.grn}25`, borderRadius: 8, padding: '5px 10px', marginBottom: 12 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.grn, animation: 'pulse 1.8s ease infinite' }} />
        <span style={{ fontFamily: F.b, fontSize: 10, color: C.grn }}>142 farmers online · Karnataka region</span>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12, overflowX: 'auto' }}>
        {['All', 'Expert Q&A', 'Success Stories', 'Alerts', 'Tips'].map((t, i) => (
          <button key={t} style={{
            padding: '4px 11px', borderRadius: 16, cursor: 'pointer', whiteSpace: 'nowrap',
            background: i === 0 ? C.cy15 : C.g, color: i === 0 ? C.cy : C.txd,
            border: `0.5px solid ${i === 0 ? C.cy3 : C.bd}`,
            fontFamily: F.b, fontSize: 10,
          }}>{t}</button>
        ))}
      </div>

      {displayPosts.map((p, i) => {
        const col = rCol[p.role] || C.cy;
        return (
          <Card key={p.id} style={{ marginBottom: 10, animation: `fadeUp 0.4s ease ${i * 0.1}s both` }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${col}18`, border: `0.5px solid ${col}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: F.b, fontWeight: 700, fontSize: 11, color: col }}>{p.av}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: F.b, fontSize: 13, fontWeight: 600, color: C.tx }}>{p.user}</span>
                  <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{p.time}</span>
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 3, alignItems: 'center' }}>
                  <Tag label={p.role} color={col} />
                  <span style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>📍 {p.loc}</span>
                </div>
              </div>
            </div>
            <div style={{ fontFamily: F.b, fontSize: 12, color: C.txm, lineHeight: 1.6, marginBottom: 10 }}>{p.text}</div>
            <Divider />
            <div style={{ display: 'flex', gap: 16, paddingTop: 6 }}>
              <button onClick={() => setLiked(l => ({ ...l, [p.id]: !l[p.id] }))} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <Heart size={13} color={liked[p.id] ? C.rd : C.txd} fill={liked[p.id] ? C.rd : 'none'} />
                <span style={{ fontFamily: F.b, fontSize: 10, color: C.txd }}>{p.likes + (liked[p.id] ? 1 : 0)}</span>
              </button>
              <button onClick={() => setActiveThread(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <MessageCircle size={13} color={C.cy} />
                <span style={{ fontFamily: F.b, fontSize: 10, color: C.cy }}>{p.cmts + (threadReplies[p.id]?.length || 0)}</span>
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 'auto' }}>
                <Share2 size={13} color={C.txd} />
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN: PROFILE
// ═══════════════════════════════════════════════════════════════
function ProfileScreen({ onLogout }) {
  const [notif, setNotif] = useState(true);
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState('English');
  const [alertCritical, setAlertCritical] = useState(true);
  const [alertHigh, setAlertHigh] = useState(true);
  const [alertMedium, setAlertMedium] = useState(false);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 14px 16px' }}>
      {/* Avatar */}
      <div style={{ padding: '22px 0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 86, height: 86, borderRadius: 24,
          backgroundImage: 'url("https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&w=200&q=80")',
          backgroundSize: 'cover', backgroundPosition: 'center',
          border: `2px solid ${C.cy}`, marginBottom: 14,
          boxShadow: `0 0 20px ${C.cy}40`,
          animation: 'pulseGlow 4s ease infinite'
        }} />
        <div style={{ fontFamily: F.d, fontSize: 18, color: C.tx, letterSpacing: '0.04em' }}>Ravi Kumar</div>
        <div style={{ fontFamily: F.b, fontSize: 12, color: C.txd, marginTop: 3 }}>+91 98765 43210 · Kolar, KA</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <Tag label="Farmer" color={C.grn} />
          <Tag label="Karnataka" color={C.cy} />
          <Tag label="✓ Verified" color={C.am} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 16 }}>
        {[{ l: 'Boreholes', v: '3' }, { l: 'Readings', v: '142' }, { l: 'Day Streak', v: '28' }].map(s => (
          <Card key={s.l} style={{ textAlign: 'center', padding: '10px 6px' }}>
            <div style={{ fontFamily: F.m, fontSize: 18, color: C.cy, marginBottom: 2 }}>{s.v}</div>
            <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{s.l}</div>
          </Card>
        ))}
      </div>

      {/* FCM Token display */}
      <Card accent={C.pu} style={{ marginBottom: 14, padding: '10px 13px' }}>
        <div style={{ fontFamily: F.b, fontSize: 9, color: C.pu, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>FCM Device Token</div>
        <div style={{ fontFamily: F.m, fontSize: 9, color: C.txd, lineHeight: 1.6, wordBreak: 'break-all' }}>
          eKq7Xm3R…cF2gHpLZ (tap to copy)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.grn, animation: 'pulse 1.8s ease infinite' }} />
          <span style={{ fontFamily: F.b, fontSize: 9, color: C.grn }}>Registered with FCM · Notifications active</span>
        </div>
      </Card>

      {/* Water alert thresholds */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7, paddingLeft: 3 }}>Water Alert Preferences</div>
        <Card>
          {[
            { label: 'Critical Stress Alerts', sub: 'Water table below 150m', col: C.rd, on: alertCritical, set: setAlertCritical },
            { label: 'High Stress Alerts', sub: 'Yield drop > 30%', col: C.am, on: alertHigh, set: setAlertHigh },
            { label: 'Medium Alerts', sub: 'Seasonal depletion', col: C.cy, on: alertMedium, set: setAlertMedium },
          ].map((item, i) => (
            <div key={item.label}>
              {i > 0 && <Divider />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.col, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.b, fontSize: 12, color: C.tx }}>{item.label}</div>
                  <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd }}>{item.sub}</div>
                </div>
                <Toggle on={item.on} onChange={item.set} color={item.col} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Settings */}
      {[
        {
          title: 'Preferences', items: [
            { icon: Globe, label: 'Language', right: <span style={{ fontFamily: F.b, fontSize: 11, color: C.txd, cursor: 'pointer' }} onClick={() => setLang(l => l === 'English' ? 'ಕನ್ನಡ' : 'English')}>{lang}</span> },
            { icon: Moon, label: 'Dark Mode', right: <Toggle on={dark} onChange={setDark} /> },
            { icon: Volume2, label: 'Notifications', right: <Toggle on={notif} onChange={setNotif} /> },
          ]
        },
        {
          title: 'My Boreholes', items: [
            { icon: Droplets, label: 'Kolar Village · 87m', right: <Tag label="Active" color={C.grn} /> },
            { icon: Droplets, label: 'Doddabale · 132m', right: <Tag label="Warn" color={C.am} /> },
            { icon: Plus, label: 'Register New Borewell', color: C.cy, chevron: true },
          ]
        },
        {
          title: 'Account', items: [
            { icon: RefreshCw, label: 'Sync Preferences', chevron: true },
            { icon: Lock, label: 'Privacy & Security', chevron: true },
            { icon: LogOut, label: 'Sign Out', color: C.rd, onClick: onLogout },
          ]
        },
      ].map(group => (
        <div key={group.title} style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: F.b, fontSize: 9, color: C.txd, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7, paddingLeft: 3 }}>{group.title}</div>
          <Card>
            {group.items.map((item, i) => (
              <div key={item.label}>
                {i > 0 && <Divider />}
                <div onClick={item.onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', cursor: item.onClick || item.chevron ? 'pointer' : 'default' }}>
                  <item.icon size={15} color={item.color || C.txm} />
                  <span style={{ flex: 1, fontFamily: F.b, fontSize: 13, color: item.color || C.tx }}>{item.label}</span>
                  {item.right}
                  {item.chevron && <ChevronRight size={13} color={C.txd} />}
                </div>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOTTOM NAV
// ═══════════════════════════════════════════════════════════════
const NAV = [
  { id: 'dashboard', icon: Home, label: 'Home' },
  { id: 'history', icon: BarChart2, label: 'Analytics' },
  { id: 'addreading', icon: Plus, label: 'Log' },
  { id: 'media', icon: Camera, label: 'Media' },
  { id: 'profile', icon: Users, label: 'Profile' },
];

function BottomNav({ active, onSelect }) {
  return (
    <div style={{ display: 'flex', height: 54, borderTop: `0.5px solid ${C.bd}`, background: 'rgba(3,10,20,0.97)', backdropFilter: 'blur(20px)' }}>
      {NAV.map(({ id, icon: Icon, label, badge }) => {
        const on = active === id;
        return (
          <button key={id} onClick={() => onSelect(id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0, position: 'relative',
          }}>
            {on && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2, borderRadius: '0 0 2px 2px', background: C.cy }} />}
            <div style={{ position: 'relative' }}>
              <Icon size={17} color={on ? C.cy : C.txd} />
              {badge && <div style={{ position: 'absolute', top: -3, right: -4, width: 6, height: 6, borderRadius: '50%', background: C.rd, border: `1px solid rgba(3,10,20,0.97)` }} />}
            </div>
            <span style={{ fontFamily: F.b, fontSize: 8, color: on ? C.cy : C.txd, letterSpacing: '0.04em', transition: 'color 0.15s' }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP ROOT (FULL SCREEN ANDROID APP LAYOUT)
// ═══════════════════════════════════════════════════════════════
const FCM_DEMO_MSGS = [
  { title: 'Critical Water Stress', msg: 'Anantapur: Water table dropped below 150m!', lvl: 'critical' },
  { title: 'Yield Alert', msg: 'Kolar borewell yield dropped 40% in 72h.', lvl: 'high' },
  { title: 'Sync Complete', msg: '3 offline readings uploaded successfully.', lvl: 'low' },
];

export default function AntharJalaWatch() {
  const [appState, setAppState] = useState('splash');
  const [screen, setScreen] = useState('dashboard');
  const [fcmMsg, setFcmMsg] = useState(null);
  const fcmIdx = useRef(0);

  const goTo = useCallback((s) => setScreen(s), []);
  const mainNav = ['dashboard', 'history', 'addreading', 'media', 'profile'];
  const activeTab = mainNav.includes(screen) ? screen : 'dashboard';

  const triggerFCM = useCallback(() => {
    setFcmMsg(FCM_DEMO_MSGS[fcmIdx.current % FCM_DEMO_MSGS.length]);
    fcmIdx.current += 1;
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':  return <DashboardScreen goTo={goTo} onTriggerNotif={triggerFCM} />;
      case 'map':        return <MapScreen />;
      case 'alerts':     return <AlertsScreen />;
      case 'ai':         return <AIGuideScreen />;
      case 'community':  return <CommunityScreen />;
      case 'history':    return <HistoryScreen />;
      case 'profile':    return <ProfileScreen onLogout={() => setAppState('login')} />;
      case 'addreading': return <BorewellInputScreen goTo={goTo} />;
      case 'media':      return <MediaScreen goTo={goTo} />;
      default:           return <DashboardScreen goTo={goTo} onTriggerNotif={triggerFCM} />;
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      height: '100dvh', /* Responsive height for mobile */
      background: C.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: F.b,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* Android Status Bar Simulation (Optional but requested to look like an app) */}
      <div style={{ height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 16, background: 'rgba(3,8,18,0.95)', position: 'relative', zIndex: 10 }}>
        <span style={{ fontFamily: F.m, fontSize: 11, color: C.txm, letterSpacing: '0.04em' }}>10:24</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
          <Wifi size={11} color={C.txm} />
          <span style={{ fontFamily: F.m, fontSize: 9, color: C.txm, letterSpacing: '0.08em' }}>LTE</span>
        </div>
      </div>

      {appState === 'splash' && <SplashScreen onDone={() => setAppState('login')} />}
      {appState === 'login' && <LoginScreen onLogin={() => setAppState('app')} />}
      {appState === 'app' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <WaterBg />
          {/* FCM Toast */}
          {fcmMsg && (
            <FCMToast msg={fcmMsg} onDismiss={() => setFcmMsg(null)} />
          )}
          <div style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {renderScreen()}
          </div>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <BottomNav active={activeTab} onSelect={goTo} />
          </div>
        </div>
      )}
      
      {/* Android Home Indicator */}
      {appState === 'app' && (
        <div style={{ height: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,10,20,0.97)' }}>
          <div style={{ width: 60, height: 4, borderRadius: 2, background: C.txd }} />
        </div>
      )}
    </div>
  );
}
