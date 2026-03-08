/**
 * ArtistDashboard.jsx
 * Kho nhạc của Artist — grid cards với badge trạng thái, mini player và xóa bài.
 * API: GET /api/tracks   DELETE /api/tracks/:id
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { extractErrorMessage } from '../../api/axiosConfig';

// ─── Constants ────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: 'Chờ review',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  dot: '#fbbf24' },
  reviewing: { label: 'Đang review', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  dot: '#60a5fa' },
  completed: { label: 'Hoàn tất',    color: '#34d399', bg: 'rgba(52,211,153,0.1)',  dot: '#34d399' },
};

const GENRE_LABELS = {
  pop: 'Pop', rock: 'Rock', jazz: 'Jazz', classical: 'Classical',
  hiphop: 'Hip-hop', electronic: 'Electronic', folk: 'Folk', other: 'Khác',
};

const FILTERS = [
  { value: '',          label: 'Tất cả' },
  { value: 'pending',   label: 'Chờ review' },
  { value: 'reviewing', label: 'Đang review' },
  { value: 'completed', label: 'Hoàn tất' },
];

// ─── Helpers ──────────────────────────────────────────────────

const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const scoreColor = (s) => {
  if (s >= 8)   return '#34d399';
  if (s >= 6)   return '#e2c97e';
  if (s >= 4)   return '#fbbf24';
  return '#f87171';
};

// ─── CSS ──────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

.ad-root {
  min-height: 100vh;
  background: #0a0a0f;
  font-family: 'DM Sans', sans-serif;
  color: #e2e8f0;
  padding: 2.5rem 2rem 4rem;
}

/* ── Header ── */
.ad-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
}
.ad-header-left h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  color: #e2e8f0;
  margin-bottom: 0.25rem;
}
.ad-header-left p { font-size: 0.85rem; color: #6b7280; }

.ad-upload-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #e2c97e, #c8a84b);
  color: #0a0a0f;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 16px rgba(226,201,126,0.2);
  white-space: nowrap;
  flex-shrink: 0;
}
.ad-upload-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(226,201,126,0.3);
}

/* ── Summary bar ── */
.ad-summary {
  display: flex;
  gap: 1px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(226,201,126,0.1);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 2rem;
}
.ad-summary-item {
  flex: 1;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  background: #111118;
  transition: background 0.15s;
}
.ad-summary-item:hover { background: #13131c; }
.ad-summary-item + .ad-summary-item { border-left: 1px solid rgba(255,255,255,0.04); }
.ad-summary-num {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  color: #e2c97e;
}
.ad-summary-label { font-size: 0.72rem; color: #4b5563; text-transform: uppercase; letter-spacing: 0.07em; }

/* ── Filter bar ── */
.ad-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
}
.ad-filter-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.07);
  background: #111118;
  color: #6b7280;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.ad-filter-btn:hover { border-color: rgba(226,201,126,0.2); color: #9ca3af; }
.ad-filter-btn.active {
  border-color: #e2c97e;
  background: rgba(226,201,126,0.08);
  color: #e2c97e;
}
.ad-search {
  margin-left: auto;
  position: relative;
}
.ad-search input {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 0.4rem 0.9rem 0.4rem 2.2rem;
  font-size: 0.82rem;
  color: #e2e8f0;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  width: 220px;
  transition: border-color 0.2s;
}
.ad-search input::placeholder { color: #374151; }
.ad-search input:focus { border-color: rgba(226,201,126,0.3); }
.ad-search-icon {
  position: absolute;
  left: 0.65rem; top: 50%;
  transform: translateY(-50%);
  color: #374151;
  font-size: 0.8rem;
  pointer-events: none;
}

/* ── Grid ── */
.ad-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}

/* ── Track Card ── */
.ad-card {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  animation: cardIn 0.35s cubic-bezier(0.22,1,0.36,1) both;
  display: flex;
  flex-direction: column;
}
.ad-card:hover {
  border-color: rgba(226,201,126,0.15);
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* cover */
.ad-card-cover {
  position: relative;
  height: 160px;
  background: #16161f;
  overflow: hidden;
  flex-shrink: 0;
}
.ad-card-cover img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 0.4s;
}
.ad-card:hover .ad-card-cover img { transform: scale(1.04); }
.ad-card-cover-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #16161f 0%, #1f1f2e 100%);
  font-size: 2.5rem;
  opacity: 0.4;
}
.ad-card-cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(10,10,15,0.8) 0%, transparent 50%);
}

/* status badge on cover */
.ad-card-status {
  position: absolute;
  top: 0.65rem; left: 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
}
.ad-card-status-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  animation: pulse-status 2s ease-in-out infinite;
}
@keyframes pulse-status {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(0.8); }
}

/* score chip on cover */
.ad-card-score {
  position: absolute;
  top: 0.65rem; right: 0.65rem;
  padding: 0.25rem 0.65rem;
  border-radius: 20px;
  font-family: 'Playfair Display', serif;
  font-size: 0.85rem;
  font-weight: 700;
  backdrop-filter: blur(8px);
  background: rgba(10,10,15,0.6);
}

/* body */
.ad-card-body {
  padding: 1rem 1.1rem 0.9rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.ad-card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ad-card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ad-card-genre {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.ad-card-date { font-size: 0.72rem; color: #374151; margin-left: auto; }

/* score breakdown mini bar */
.ad-card-mini-scores {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 28px;
}
.ad-mini-bar {
  flex: 1;
  border-radius: 3px 3px 0 0;
  transition: height 0.3s;
  min-height: 3px;
}
.ad-card-review-count {
  font-size: 0.72rem;
  color: #4b5563;
}

/* footer actions */
.ad-card-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.1rem;
  border-top: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0;
}
.ad-card-action {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: none;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  color: #6b7280;
}
.ad-card-action:hover { background: rgba(255,255,255,0.05); color: #9ca3af; }
.ad-card-action.stats { color: #e2c97e; }
.ad-card-action.stats:hover { background: rgba(226,201,126,0.08); }
.ad-card-action.delete { color: #4b5563; margin-left: auto; }
.ad-card-action.delete:hover { background: rgba(248,113,113,0.08); color: #f87171; }

/* ── Mini audio player ── */
.ad-mini-player {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: rgba(226,201,126,0.05);
  border-top: 1px solid rgba(226,201,126,0.08);
  border-radius: 0 0 0 0;
}
.ad-play-btn {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(226,201,126,0.3);
  background: rgba(226,201,126,0.08);
  color: #e2c97e;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: 0.75rem;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.ad-play-btn:hover { background: rgba(226,201,126,0.15); border-color: #e2c97e; }
.ad-progress-wrap {
  flex: 1;
  position: relative;
  height: 3px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
}
.ad-progress-fill {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  background: #e2c97e;
  border-radius: 2px;
  transition: width 0.1s linear;
}
.ad-time {
  font-size: 0.65rem;
  color: #4b5563;
  min-width: 32px;
  text-align: right;
}

/* ── Empty state ── */
.ad-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 5rem 2rem;
  text-align: center;
}
.ad-empty-icon { font-size: 3.5rem; opacity: 0.2; }
.ad-empty h3 { font-family: 'Playfair Display', serif; color: #374151; font-size: 1.2rem; }
.ad-empty p { font-size: 0.85rem; color: #1f2937; max-width: 320px; }

/* ── Loading skeleton ── */
.ad-skeleton {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 16px;
  overflow: hidden;
  height: 280px;
}
.ad-skel-pulse {
  background: linear-gradient(90deg, #16161f 25%, #1f1f2e 50%, #16161f 75%);
  background-size: 200% 100%;
  animation: skelShimmer 1.4s ease-in-out infinite;
  height: 100%;
}
@keyframes skelShimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Pagination ── */
.ad-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2.5rem;
}
.ad-page-btn {
  width: 36px; height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.07);
  background: #111118;
  color: #6b7280;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.83rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.ad-page-btn:hover:not(:disabled) { border-color: rgba(226,201,126,0.3); color: #e2c97e; }
.ad-page-btn.active { border-color: #e2c97e; background: rgba(226,201,126,0.1); color: #e2c97e; }
.ad-page-btn:disabled { opacity: 0.3; cursor: default; }

/* ── Delete confirm modal ── */
.ad-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
.ad-modal {
  background: #12121a;
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 18px;
  padding: 2rem;
  width: 100%; max-width: 380px;
  animation: modalIn 0.2s cubic-bezier(0.22,1,0.36,1);
}
@keyframes modalIn {
  from { opacity:0; transform:scale(0.95) translateY(8px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
.ad-modal h3 { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: #e2e8f0; margin-bottom: 0.5rem; }
.ad-modal p  { font-size: 0.85rem; color: #6b7280; margin-bottom: 1.5rem; line-height: 1.6; }
.ad-modal-actions { display: flex; gap: 0.75rem; }
.ad-modal-cancel {
  flex:1; padding: 0.65rem; border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent; color: #9ca3af;
  font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
  cursor: pointer; transition: all 0.15s;
}
.ad-modal-cancel:hover { background: rgba(255,255,255,0.05); }
.ad-modal-confirm {
  flex:1; padding: 0.65rem; border-radius: 10px;
  border: none; background: rgba(248,113,113,0.15);
  color: #f87171; font-family: 'DM Sans', sans-serif;
  font-size: 0.875rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
}
.ad-modal-confirm:hover:not(:disabled) { background: rgba(248,113,113,0.25); }
.ad-modal-confirm:disabled { opacity:0.5; cursor:default; }

/* ── Toast ── */
.ad-toast {
  position: fixed;
  bottom: 2rem; right: 2rem;
  z-index: 300;
  padding: 0.8rem 1.2rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex; align-items: center; gap: 0.6rem;
  animation: toastIn 0.25s cubic-bezier(0.22,1,0.36,1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  max-width: 340px;
}
@keyframes toastIn {
  from { opacity:0; transform:translateY(12px); }
  to   { opacity:1; transform:translateY(0); }
}
.ad-toast.success { background:#0d2218; border:1px solid rgba(52,211,153,0.3); color:#34d399; }
.ad-toast.error   { background:#1f0d0d; border:1px solid rgba(248,113,113,0.3); color:#f87171; }

@media(max-width:640px){
  .ad-root { padding:1.5rem 1rem 3rem; }
  .ad-summary { flex-direction:column; gap:0; }
  .ad-summary-item+.ad-summary-item { border-left:none; border-top:1px solid rgba(255,255,255,0.04); }
  .ad-search input { width:160px; }
}
`;

// ─── Mini Audio Player hook ────────────────────────────────────

function useMiniPlayer(audioUrl) {
  const audioRef = useRef(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const toggle = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener('timeupdate', () => {
        const c = audioRef.current.currentTime;
        const d = audioRef.current.duration || 1;
        setCurrentTime(c);
        setProgress((c / d) * 100);
      });
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current.duration);
      });
      audioRef.current.addEventListener('ended', () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }, [audioUrl, playing]);

  const seek = useCallback((pct) => {
    if (audioRef.current && duration) {
      audioRef.current.currentTime = (pct / 100) * duration;
    }
  }, [duration]);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  return { playing, progress, duration, currentTime, fmtTime, toggle, seek };
}

// ─── Track Card ───────────────────────────────────────────────

function TrackCard({ track, onDelete, style }) {
  const { playing, progress, currentTime, duration, fmtTime, toggle, seek } = useMiniPlayer(track.audioUrl);
  const st = STATUS_CONFIG[track.status] || STATUS_CONFIG.pending;
  const bd = track.scoreBreakdown;
  const hasBd = bd && Object.values(bd).some(v => v > 0);
  const navigate = useNavigate();

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = ((e.clientX - rect.left) / rect.width) * 100;
    seek(pct);
  };

  const CRITERIA = ['melody','lyrics','harmony','rhythm','production'];
  const MAX = 10;

  return (
    <div className="ad-card" style={style}>
      {/* Cover */}
      <div className="ad-card-cover">
        {track.coverUrl
          ? <img src={track.coverUrl} alt={track.title} loading="lazy" />
          : <div className="ad-card-cover-placeholder">♪</div>
        }
        <div className="ad-card-cover-overlay" />

        {/* Status */}
        <div className="ad-card-status"
          style={{ color: st.color, background: st.bg }}>
          <div className="ad-card-status-dot" style={{ background: st.dot }} />
          {st.label}
        </div>

        {/* Score */}
        {track.averageScore > 0 && (
          <div className="ad-card-score" style={{ color: scoreColor(track.averageScore) }}>
            {track.averageScore.toFixed(1)}
          </div>
        )}
      </div>

      {/* Mini player */}
      <div className="ad-mini-player">
        <button className="ad-play-btn" onClick={toggle} aria-label={playing ? 'Dừng' : 'Phát'}>
          {playing ? '⏸' : '▶'}
        </button>
        <div className="ad-progress-wrap" onClick={handleSeek}>
          <div className="ad-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="ad-time">
          {playing ? fmtTime(currentTime) : (duration > 0 ? fmtTime(duration) : '--:--')}
        </span>
      </div>

      {/* Body */}
      <div className="ad-card-body">
        <div className="ad-card-title" title={track.title}>{track.title}</div>
        <div className="ad-card-meta">
          <span className="ad-card-genre">{GENRE_LABELS[track.genre] || track.genre}</span>
          <span className="ad-card-date">{fmtDate(track.createdAt)}</span>
        </div>

        {/* Score breakdown mini bars */}
        {hasBd ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
            <div className="ad-card-mini-scores">
              {CRITERIA.map((k) => {
                const val = bd[k] || 0;
                const h   = Math.max(3, (val / MAX) * 28);
                const c   = scoreColor(val);
                return (
                  <div key={k} className="ad-mini-bar"
                    title={`${k}: ${val}`}
                    style={{ height: h, background: c, opacity: 0.7 }} />
                );
              })}
            </div>
            <div className="ad-card-review-count">
              {track.reviewCount} review · điểm TB {track.averageScore.toFixed(1)}
            </div>
          </div>
        ) : (
          <div className="ad-card-review-count">
            {track.reviewCount > 0
              ? `${track.reviewCount} review đang xử lý`
              : 'Chờ reviewer đánh giá'}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="ad-card-footer">
        {track.status === 'completed' ? (
          <Link to={`/dashboard/artist/track/${track._id}`} className="ad-card-action stats">
            📊 Xem báo cáo
          </Link>
        ) : (
          <button className="ad-card-action"
            onClick={() => navigate(`/dashboard/artist/track/${track._id}`)}>
            🔍 Chi tiết
          </button>
        )}
        <button className="ad-card-action delete" onClick={() => onDelete(track)}>
          🗑
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export default function ArtistDashboard() {
  const [tracks, setTracks]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast]       = useState(null);

  const LIMIT = 9;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const { data } = await api.get(`/tracks?${params}`);
      setTracks(data.tracks);
      setPagination(data.pagination);
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể tải danh sách bài nhạc'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Reset page khi đổi filter/search
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/tracks/${deleteTarget._id}`);
      setDeleteTarget(null);
      showToast(`Đã xóa "${deleteTarget.title}"`, 'success');
      fetchTracks();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Xóa thất bại'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Summary counts
  const summary = {
    total:     pagination?.total || tracks.length,
    completed: tracks.filter(t => t.status === 'completed').length,
    reviewing: tracks.filter(t => t.status === 'reviewing').length,
    pending:   tracks.filter(t => t.status === 'pending').length,
  };

  const pages = pagination ? Array.from({ length: pagination.pages }, (_, i) => i + 1) : [];

  return (
    <>
      <style>{CSS}</style>

      <div className="ad-root">
        {/* Header */}
        <div className="ad-header">
          <div className="ad-header-left">
            <h1>Kho nhạc của tôi</h1>
            <p>Quản lý và theo dõi toàn bộ bài nhạc đã đăng</p>
          </div>
          <Link to="/dashboard/upload" className="ad-upload-btn">
            <span>+</span> Upload bài mới
          </Link>
        </div>

        {/* Summary bar */}
        {!loading && (
          <div className="ad-summary">
            {[
              { num: summary.total,     label: 'Tổng số bài' },
              { num: summary.completed, label: 'Hoàn tất' },
              { num: summary.reviewing, label: 'Đang review' },
              { num: summary.pending,   label: 'Chờ review' },
            ].map(({ num, label }) => (
              <div key={label} className="ad-summary-item">
                <span className="ad-summary-num">{num}</span>
                <span className="ad-summary-label">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="ad-filters">
          {FILTERS.map(f => (
            <button key={f.value}
              className={`ad-filter-btn ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}>
              {f.label}
            </button>
          ))}
          <div className="ad-search">
            <span className="ad-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm bài nhạc…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding:'1rem 1.2rem',
            background:'rgba(248,113,113,0.08)',
            border:'1px solid rgba(248,113,113,0.2)',
            borderRadius:'12px',
            color:'#fca5a5',
            fontSize:'0.85rem',
            marginBottom:'1rem',
          }}>
            ⚠ {error} —{' '}
            <button onClick={fetchTracks}
              style={{ background:'none', border:'none', color:'#e2c97e', cursor:'pointer', fontSize:'0.85rem' }}>
              Thử lại
            </button>
          </div>
        )}

        {/* Grid */}
        <div className="ad-grid">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ad-skeleton">
                <div className="ad-skel-pulse" />
              </div>
            ))
          ) : tracks.length === 0 ? (
            <div className="ad-empty">
              <div className="ad-empty-icon">🎵</div>
              <h3>{search || statusFilter ? 'Không tìm thấy kết quả' : 'Chưa có bài nhạc nào'}</h3>
              <p>
                {search || statusFilter
                  ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                  : 'Hãy upload bài nhạc đầu tiên để bắt đầu nhận đánh giá từ reviewer.'}
              </p>
              {!search && !statusFilter && (
                <Link to="/dashboard/upload" className="ad-upload-btn">
                  + Upload bài nhạc
                </Link>
              )}
            </div>
          ) : (
            tracks.map((track, idx) => (
              <TrackCard
                key={track._id}
                track={track}
                onDelete={setDeleteTarget}
                style={{ animationDelay: `${idx * 0.05}s` }}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pages.length > 1 && (
          <div className="ad-pagination">
            <button className="ad-page-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}>
              ‹
            </button>
            {pages.map(p => (
              <button key={p}
                className={`ad-page-btn ${p === page ? 'active' : ''}`}
                onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button className="ad-page-btn"
              disabled={page === pages.length}
              onClick={() => setPage(p => p + 1)}>
              ›
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="ad-overlay" onClick={e => { if(e.target===e.currentTarget) setDeleteTarget(null); }}>
          <div className="ad-modal">
            <h3>Xóa bài nhạc?</h3>
            <p>
              Bạn sắp xóa <strong style={{ color:'#e2e8f0' }}>"{deleteTarget.title}"</strong>.
              Thao tác này sẽ xóa cả file âm thanh trên Cloudinary và tất cả review liên quan.
              Không thể hoàn tác.
            </p>
            <div className="ad-modal-actions">
              <button className="ad-modal-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}>
                Hủy
              </button>
              <button className="ad-modal-confirm"
                onClick={handleDelete}
                disabled={deleting}>
                {deleting ? 'Đang xóa…' : 'Xóa bài nhạc'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`ad-toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}
    </>
  );
}
