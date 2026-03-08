/**
 * TrackStats.jsx
 * Báo cáo chi tiết một bài nhạc — radar chart SVG, điểm tiêu chí, danh sách reviewer.
 * API: GET /api/tracks/:id/stats
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { extractErrorMessage } from '../../api/axiosConfig';

// ─── Constants ────────────────────────────────────────────────

const CRITERIA = [
  { key: 'melody',     label: 'Giai điệu',  icon: '🎵' },
  { key: 'lyrics',     label: 'Lời nhạc',   icon: '✍️' },
  { key: 'harmony',    label: 'Hòa âm',     icon: '🎼' },
  { key: 'rhythm',     label: 'Nhịp điệu',  icon: '🥁' },
  { key: 'production', label: 'Sản xuất',   icon: '🎛️' },
];

const STATUS_CONFIG = {
  pending:   { label: 'Chờ review',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
  reviewing: { label: 'Đang review', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  completed: { label: 'Hoàn tất',    color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
};

const SCORE_LABELS = [
  { min: 9,   label: 'Xuất sắc',    color: '#34d399' },
  { min: 7.5, label: 'Tốt',         color: '#6ee7b7' },
  { min: 6,   label: 'Khá',         color: '#e2c97e' },
  { min: 4,   label: 'Trung bình',  color: '#fbbf24' },
  { min: 0,   label: 'Cần cải thiện', color: '#f87171' },
];

const getScoreLabel = (score) =>
  SCORE_LABELS.find(l => score >= l.min) || SCORE_LABELS[SCORE_LABELS.length - 1];

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
};

// ─── CSS ──────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

.ts-root {
  min-height: 100vh;
  background: #0a0a0f;
  font-family: 'DM Sans', sans-serif;
  color: #e2e8f0;
  padding: 2.5rem 2rem 5rem;
}

.ts-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #4b5563;
  text-decoration: none;
  margin-bottom: 2rem;
  transition: color 0.15s;
}
.ts-back:hover { color: #e2c97e; }

/* ── Hero strip ── */
.ts-hero {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  background: #111118;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  animation: tsIn 0.35s cubic-bezier(0.22,1,0.36,1);
}
@keyframes tsIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }

.ts-hero-cover {
  width: 110px; height: 110px;
  border-radius: 14px;
  object-fit: cover;
  flex-shrink: 0;
  background: linear-gradient(135deg,#16161f,#1f1f2e);
  display: flex; align-items: center; justify-content: center;
  font-size: 2.5rem; color: #374151;
  overflow: hidden;
}
.ts-hero-cover img { width:100%; height:100%; object-fit:cover; }

.ts-hero-info { flex: 1; min-width: 0; }
.ts-hero-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.2rem, 2.5vw, 1.7rem);
  color: #e2e8f0;
  margin-bottom: 0.4rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ts-hero-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}
.ts-genre-badge {
  font-size: 0.7rem;
  padding: 0.18rem 0.55rem;
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.ts-date { font-size: 0.72rem; color: #374151; }
.ts-status-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
}

.ts-hero-score {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.ts-hero-score-num {
  font-family: 'Playfair Display', serif;
  font-size: 2.8rem;
  line-height: 1;
  transition: color 0.3s;
}
.ts-hero-score-max { font-size: 1rem; color: #374151; }
.ts-hero-score-label {
  font-size: 0.78rem;
  color: #6b7280;
  margin-left: 0.25rem;
}

/* ── Main grid ── */
.ts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
@media(max-width:768px){ .ts-grid { grid-template-columns:1fr; } }

/* ── Panel ── */
.ts-panel {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  padding: 1.5rem;
  animation: tsIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.ts-panel-title {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4b5563;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.ts-panel-title::after {
  content:'';
  flex:1;
  height:1px;
  background:rgba(255,255,255,0.04);
}

/* ── Radar chart ── */
.ts-radar-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Score bars ── */
.ts-score-list { display: flex; flex-direction: column; gap: 0.85rem; }
.ts-score-row { display: flex; flex-direction: column; gap: 0.3rem; }
.ts-score-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ts-score-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: #9ca3af;
}
.ts-score-icon { font-size: 0.9rem; }
.ts-score-val {
  font-family: 'Playfair Display', serif;
  font-size: 1.05rem;
}
.ts-score-track {
  height: 6px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
}
.ts-score-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 1s cubic-bezier(0.34,1.56,0.64,1);
}

/* ── No reviews placeholder ── */
.ts-no-reviews {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  text-align: center;
}
.ts-no-reviews-icon { font-size: 2.5rem; opacity: 0.2; }
.ts-no-reviews h4 {
  font-family: 'Playfair Display', serif;
  color: #374151;
  font-size: 1rem;
}
.ts-no-reviews p { font-size: 0.82rem; color: #1f2937; max-width: 280px; }

/* ── Progress ring ── */
.ts-ring { transform: rotate(-90deg); }

/* ── Review cards ── */
.ts-reviews-section {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  padding: 1.5rem;
  animation: tsIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
}
.ts-reviews-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.ts-review-card {
  background: #0d0d14;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px;
  padding: 1.2rem;
  transition: border-color 0.2s;
  animation: tsIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
}
.ts-review-card:hover { border-color: rgba(226,201,126,0.1); }

.ts-reviewer-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.ts-reviewer-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid rgba(226,201,126,0.2);
  background: linear-gradient(135deg,#1f1f2e,#2d2d3a);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: #e2c97e;
  letter-spacing: 0.04em;
  flex-shrink: 0;
  overflow: hidden;
}
.ts-reviewer-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
.ts-reviewer-info { flex: 1; min-width: 0; }
.ts-reviewer-name { font-size: 0.875rem; font-weight: 600; color: #d1d5db; }
.ts-reviewer-rep  { font-size: 0.7rem; color: #4b5563; }
.ts-review-overall {
  margin-left: auto;
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
}
.ts-review-date { font-size: 0.7rem; color: #374151; margin-top: 1px; }

/* mini score grid in review card */
.ts-review-scores {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.3rem;
  margin-bottom: 0.85rem;
}
.ts-mini-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}
.ts-mini-score-val {
  font-size: 0.9rem;
  font-weight: 600;
}
.ts-mini-score-lbl {
  font-size: 0.58rem;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* comment */
.ts-review-comment {
  font-size: 0.82rem;
  color: #6b7280;
  line-height: 1.65;
  border-left: 2px solid rgba(226,201,126,0.15);
  padding-left: 0.75rem;
}

/* time markers */
.ts-time-markers {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.85rem;
}
.ts-time-marker {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.77rem;
}
.ts-time-badge {
  flex-shrink: 0;
  padding: 0.12rem 0.45rem;
  border-radius: 6px;
  background: rgba(226,201,126,0.08);
  color: #c8a84b;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
}
.ts-time-note { color: #4b5563; line-height: 1.5; }

/* ── Loading skeleton ── */
.ts-skel-block {
  border-radius: 18px;
  background: linear-gradient(90deg,#16161f 25%,#1f1f2e 50%,#16161f 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* ── Error ── */
.ts-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
  text-align: center;
  color: #4b5563;
}
.ts-error-icon { font-size:3rem; opacity:0.3; }
.ts-error h3 { font-family:'Playfair Display',serif; color:#374151; }
.ts-error p   { font-size:0.85rem; max-width:300px; line-height:1.6; }
.ts-error-retry {
  padding:0.55rem 1.2rem;
  border-radius:10px;
  border:1px solid rgba(226,201,126,0.2);
  background:rgba(226,201,126,0.06);
  color:#e2c97e;
  font-family:'DM Sans',sans-serif;
  font-size:0.85rem;
  cursor:pointer;
  transition:background 0.15s;
}
.ts-error-retry:hover { background:rgba(226,201,126,0.1); }

@media(max-width:640px){
  .ts-root { padding:1.5rem 1rem 3rem; }
  .ts-hero { flex-direction:column; }
  .ts-hero-cover { width:80px; height:80px; }
}
`;

// ─── SVG Radar Chart ──────────────────────────────────────────

function RadarChart({ scores, size = 220 }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.72;
  const n = CRITERIA.length;
  const MAX = 10;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  // Polygon points for a given scale
  const polygonPoints = (scale) =>
    CRITERIA.map((_, i) => {
      const angle = startAngle + i * angleStep;
      const r = radius * scale;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });

  // Axis points
  const axisPoints = CRITERIA.map((_, i) => {
    const angle = startAngle + i * angleStep;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });

  // Score polygon
  const scorePoints = CRITERIA.map(({ key }, i) => {
    const val = scores?.[key] || 0;
    const scale = val / MAX;
    const angle = startAngle + i * angleStep;
    return [cx + radius * scale * Math.cos(angle), cy + radius * scale * Math.sin(angle)];
  });

  const toPath = (pts) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') + ' Z';

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // Label position
  const labelPos = (i, extraRadius = 18) => {
    const angle = startAngle + i * angleStep;
    const r = radius + extraRadius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const hasScores = scores && Object.values(scores).some(v => v > 0);

  return (
    <svg width={size + 60} height={size + 60} viewBox={`-30 -30 ${size+60} ${size+60}`}>
      {/* Grid circles */}
      {gridLevels.map((level, li) => (
        <polygon key={li}
          points={polygonPoints(level).map(p => p.join(',')).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axisPoints.map(([ax, ay], i) => (
        <line key={i}
          x1={cx} y1={cy}
          x2={ax} y2={ay}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Score area */}
      {hasScores && (
        <>
          <path
            d={toPath(scorePoints)}
            fill="rgba(226,201,126,0.12)"
            stroke="#e2c97e"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Score dots */}
          {scorePoints.map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={3}
              fill="#e2c97e" stroke="#0a0a0f" strokeWidth="1.5" />
          ))}
        </>
      )}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.08)" />

      {/* Labels */}
      {CRITERIA.map(({ label }, i) => {
        const [lx, ly] = labelPos(i);
        return (
          <text key={i}
            x={lx} y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#6b7280"
            fontSize="9"
            fontFamily="'DM Sans', sans-serif"
            fontWeight="500"
          >
            {label}
          </text>
        );
      })}

      {/* Score values inside */}
      {hasScores && scorePoints.map(([px, py], i) => {
        const val = scores[CRITERIA[i].key];
        if (!val) return null;
        const angle = startAngle + i * angleStep;
        const tx = px + 10 * Math.cos(angle);
        const ty = py + 10 * Math.sin(angle);
        return (
          <text key={i}
            x={tx} y={ty}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#e2c97e"
            fontSize="8.5"
            fontFamily="'Playfair Display', serif"
            fontWeight="600"
          >
            {val}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Animated score bar ───────────────────────────────────────

function ScoreBar({ criterion, value, delay = 0 }) {
  const [width, setWidth] = useState(0);
  const labelInfo = getScoreLabel(value);

  useEffect(() => {
    const t = setTimeout(() => setWidth((value / 10) * 100), 100 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="ts-score-row">
      <div className="ts-score-header">
        <div className="ts-score-label">
          <span className="ts-score-icon">{criterion.icon}</span>
          {criterion.label}
        </div>
        <span className="ts-score-val" style={{ color: labelInfo.color }}>
          {value ? value.toFixed(1) : '—'}
        </span>
      </div>
      <div className="ts-score-track">
        <div className="ts-score-fill"
          style={{ width: `${width}%`, background: labelInfo.color }} />
      </div>
    </div>
  );
}

// ─── Reviewer card ────────────────────────────────────────────

function ReviewerCard({ review, style }) {
  const [expanded, setExpanded] = useState(false);
  const overallInfo = getScoreLabel(review.overallScore || 0);

  const initials = (name = '') =>
    name.split(' ').map(w => w[0]).filter(Boolean).slice(0,2).join('').toUpperCase();

  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
  };

  return (
    <div className="ts-review-card" style={style}>
      {/* Header */}
      <div className="ts-reviewer-header">
        <div className="ts-reviewer-avatar">
          {review.reviewer?.avatarUrl
            ? <img src={review.reviewer.avatarUrl} alt="" />
            : initials(review.reviewer?.name)}
        </div>
        <div className="ts-reviewer-info">
          <div className="ts-reviewer-name">{review.reviewer?.name || 'Ẩn danh'}</div>
          <div className="ts-reviewer-rep">
            {review.reviewer?.reputationScore || 0} pts ·{' '}
            {review.reviewer?.totalReviews || 0} reviews
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px' }}>
          <span className="ts-review-overall" style={{ color: overallInfo.color }}>
            {(review.overallScore || 0).toFixed(1)}
          </span>
          <span style={{ fontSize:'0.65rem', color:overallInfo.color, opacity:0.7 }}>
            {overallInfo.label}
          </span>
        </div>
      </div>

      {/* Mini scores grid */}
      <div className="ts-review-scores">
        {CRITERIA.map(({ key, label }) => {
          const val = review.scores?.[key];
          const ci = getScoreLabel(val || 0);
          return (
            <div key={key} className="ts-mini-score">
              <span className="ts-mini-score-val" style={{ color: ci.color }}>
                {val ?? '—'}
              </span>
              <span className="ts-mini-score-lbl">{label.slice(0,3)}</span>
            </div>
          );
        })}
      </div>

      {/* Comment */}
      <div className="ts-review-comment">
        {expanded
          ? review.comment
          : review.comment?.slice(0, 180) + (review.comment?.length > 180 ? '…' : '')}
        {review.comment?.length > 180 && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background:'none', border:'none', color:'#e2c97e', cursor:'pointer',
              fontSize:'0.78rem', marginLeft:'0.3rem', padding:0 }}>
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
        )}
      </div>

      {/* Time markers */}
      {review.timeMarkers?.length > 0 && (
        <div className="ts-time-markers">
          {review.timeMarkers.map((tm, i) => (
            <div key={i} className="ts-time-marker">
              <span className="ts-time-badge">⏱ {fmtTime(tm.atSecond)}</span>
              <span className="ts-time-note">{tm.note}</span>
            </div>
          ))}
        </div>
      )}

      {/* Date */}
      <div className="ts-review-date" style={{ marginTop:'0.75rem' }}>
        {fmtDate(review.createdAt)}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export default function TrackStats() {
  const { id } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get(`/tracks/${id}/stats`);
      setData(res);
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể tải thống kê bài nhạc'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="ts-root">
          <Link to="/dashboard/artist" className="ts-back">← Quay lại</Link>
          <div className="ts-skel-block" style={{ height:160, marginBottom:'2rem' }} />
          <div className="ts-grid" style={{ marginBottom:'2rem' }}>
            <div className="ts-skel-block" style={{ height:320 }} />
            <div className="ts-skel-block" style={{ height:320 }} />
          </div>
          <div className="ts-skel-block" style={{ height:200 }} />
        </div>
      </>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <style>{CSS}</style>
        <div className="ts-root">
          <Link to="/dashboard/artist" className="ts-back">← Quay lại</Link>
          <div className="ts-error">
            <div className="ts-error-icon">⚠</div>
            <h3>Không thể tải dữ liệu</h3>
            <p>{error}</p>
            <button className="ts-error-retry" onClick={fetchStats}>Thử lại</button>
          </div>
        </div>
      </>
    );
  }

  const { track, reviews = [], summary } = data || {};
  const st     = STATUS_CONFIG[track?.status] || STATUS_CONFIG.pending;
  const hasSc  = summary?.averageScore > 0;
  const breakdown = summary?.scoreBreakdown || {};
  const overallInfo = hasSc ? getScoreLabel(summary.averageScore) : null;

  // Status progress (3 reviews = completed)
  const progressPct = Math.min(100, ((summary?.reviewCount || 0) / 3) * 100);

  return (
    <>
      <style>{CSS}</style>
      <div className="ts-root">
        <Link to="/dashboard/artist" className="ts-back">← Quay lại kho nhạc</Link>

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="ts-hero">
          <div className="ts-hero-cover">
            {track?.coverUrl
              ? <img src={track.coverUrl} alt={track.title} />
              : '♪'}
          </div>

          <div className="ts-hero-info">
            <div className="ts-hero-title">{track?.title}</div>
            <div className="ts-hero-meta">
              <span className="ts-genre-badge">
                {track?.genre}
              </span>
              <span className="ts-date">{fmtDate(track?.createdAt)}</span>
              <span className="ts-status-badge" style={{ color:st.color, background:st.bg }}>
                {st.label}
              </span>
            </div>

            {/* Progress toward completion */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginTop:'0.25rem' }}>
              <div style={{
                flex:1, height:4,
                background:'rgba(255,255,255,0.06)',
                borderRadius:4, overflow:'hidden',
              }}>
                <div style={{
                  width:`${progressPct}%`, height:'100%',
                  background: track?.status === 'completed'
                    ? '#34d399'
                    : 'linear-gradient(90deg,#e2c97e,#c8a84b)',
                  borderRadius:4,
                  transition:'width 1s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
              <span style={{ fontSize:'0.72rem', color:'#4b5563', whiteSpace:'nowrap' }}>
                {summary?.reviewCount || 0}/3 reviews
              </span>
            </div>
          </div>

          {/* Overall score */}
          {hasSc && (
            <div style={{ flexShrink:0, textAlign:'right' }}>
              <div className="ts-hero-score">
                <span className="ts-hero-score-num"
                  style={{ color: overallInfo.color }}>
                  {summary.averageScore.toFixed(2)}
                </span>
                <span className="ts-hero-score-max">/10</span>
              </div>
              <div className="ts-hero-score-label" style={{ color:overallInfo.color }}>
                {overallInfo.label}
              </div>
            </div>
          )}
        </div>

        {/* ── Two-column grid ────────────────────────────────── */}
        <div className="ts-grid">
          {/* Radar chart */}
          <div className="ts-panel" style={{ animationDelay:'0.05s' }}>
            <div className="ts-panel-title"><span>📡</span> Biểu đồ radar</div>
            {hasSc ? (
              <div className="ts-radar-wrap">
                <RadarChart scores={breakdown} size={220} />
              </div>
            ) : (
              <div className="ts-no-reviews">
                <div className="ts-no-reviews-icon">📡</div>
                <h4>Chưa có điểm</h4>
                <p>Biểu đồ sẽ hiển thị sau khi có review được duyệt.</p>
              </div>
            )}
          </div>

          {/* Score breakdown bars */}
          <div className="ts-panel" style={{ animationDelay:'0.1s' }}>
            <div className="ts-panel-title"><span>📊</span> Điểm từng tiêu chí</div>
            {hasSc ? (
              <div className="ts-score-list">
                {CRITERIA.map((c, i) => (
                  <ScoreBar
                    key={c.key}
                    criterion={c}
                    value={breakdown[c.key] || 0}
                    delay={i * 80}
                  />
                ))}

                {/* Divider + overall */}
                <div style={{
                  marginTop:'0.5rem',
                  paddingTop:'1rem',
                  borderTop:'1px solid rgba(255,255,255,0.05)',
                  display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center',
                }}>
                  <span style={{ fontSize:'0.82rem', color:'#6b7280', fontWeight:600 }}>
                    Điểm trung bình
                  </span>
                  <span style={{
                    fontFamily:"'Playfair Display',serif",
                    fontSize:'1.6rem',
                    color: overallInfo?.color || '#e2c97e',
                  }}>
                    {summary.averageScore.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="ts-no-reviews">
                <div className="ts-no-reviews-icon">📊</div>
                <h4>Đang chờ đánh giá</h4>
                <p>Cần ít nhất 1 review được Admin duyệt để hiển thị điểm.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Reviews section ────────────────────────────────── */}
        <div className="ts-reviews-section" style={{ animationDelay:'0.15s' }}>
          <div className="ts-panel-title" style={{ marginBottom:'1.25rem' }}>
            <span>💬</span> Đánh giá từ reviewer
            <span style={{
              fontSize:'0.75rem',
              color:'#374151',
              fontWeight:400,
              textTransform:'none',
              letterSpacing:0,
              marginLeft:'0.25rem',
            }}>
              ({reviews.length} đã duyệt)
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="ts-no-reviews">
              <div className="ts-no-reviews-icon">💬</div>
              <h4>Chưa có review nào được duyệt</h4>
              <p>
                {track?.status === 'pending'
                  ? 'Bài nhạc đang chờ reviewer. Quá trình này thường mất vài ngày.'
                  : 'Reviewer đang chấm điểm. Admin sẽ duyệt review sớm nhất có thể.'}
              </p>
            </div>
          ) : (
            <div className="ts-reviews-grid">
              {reviews.map((r, i) => (
                <ReviewerCard
                  key={r._id}
                  review={r}
                  style={{ animationDelay:`${i * 0.07}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
