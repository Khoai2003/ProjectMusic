/**
 * ReviewerWorkspace.jsx
 * Không gian làm việc của Reviewer — sidebar danh sách bài,
 * audio player đầy đủ tính năng, form chấm điểm 5 tiêu chí + time markers.
 *
 * API:
 *   GET  /api/tracks?status=pending&limit=20   → danh sách bài chờ
 *   GET  /api/tracks?status=reviewing&limit=20 → bài đang trong quá trình
 *   POST /api/reviews                          → gửi đánh giá
 */

import {
  useState, useEffect, useRef, useCallback, useReducer,
} from 'react';
import api, { extractErrorMessage } from '../../api/axiosConfig';

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────

const CRITERIA = [
  {
    key: 'melody',
    label: 'Giai điệu',
    desc: 'Sức hút và sự đáng nhớ của melody chính',
    icon: '🎵',
    color: '#a78bfa',
  },
  {
    key: 'lyrics',
    label: 'Lời nhạc',
    desc: 'Chất lượng ca từ, ý nghĩa và cách dùng ngôn ngữ',
    icon: '✍️',
    color: '#60a5fa',
  },
  {
    key: 'harmony',
    label: 'Hòa âm',
    desc: 'Độ phong phú và sự hài hòa của các hợp âm',
    icon: '🎼',
    color: '#34d399',
  },
  {
    key: 'rhythm',
    label: 'Nhịp điệu',
    desc: 'Tính nhất quán, groove và cảm giác nhịp',
    icon: '🥁',
    color: '#fbbf24',
  },
  {
    key: 'production',
    label: 'Sản xuất',
    desc: 'Chất lượng âm thanh tổng thể: mix, master, arrangement',
    icon: '🎛️',
    color: '#f97316',
  },
];

const SCORE_LABELS = {
  1:  'Rất kém',     2: 'Kém',
  3:  'Dưới TB',     4: 'Dưới TB',
  5:  'Trung bình',  6: 'Khá',
  7:  'Tốt',         8: 'Rất tốt',
  9:  'Xuất sắc',    10: 'Hoàn hảo',
};

const GENRE_LABELS = {
  pop:'Pop', rock:'Rock', jazz:'Jazz', classical:'Classical',
  hiphop:'Hip-hop', electronic:'Electronic', folk:'Folk', other:'Khác',
};

const INITIAL_SCORES = { melody:0, lyrics:0, harmony:0, rhythm:0, production:0 };

// ─────────────────────────────────────────────────────────────
//  CSS
// ─────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #0a0a0f;
  --s1:        #0f0f18;
  --s2:        #131320;
  --s3:        #18182a;
  --border:    rgba(255,255,255,0.06);
  --border2:   rgba(255,255,255,0.03);
  --gold:      #e2c97e;
  --gold-dim:  #c8a84b;
  --green:     #34d399;
  --green-dim: #059669;
  --text:      #e2e8f0;
  --text-dim:  #6b7280;
  --text-soft: #9ca3af;
  --error:     #f87171;
  --radius:    14px;
}

/* ── Root layout ─────────────────────────────────── */
.rw-root {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 1fr;
  height: calc(100vh - 64px);
  background: var(--bg);
  font-family: 'DM Sans', sans-serif;
  color: var(--text);
  overflow: hidden;
}

/* ── Sidebar ─────────────────────────────────────── */
.rw-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--s1);
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.rw-sidebar-head {
  padding: 1.25rem 1rem 0.75rem;
  border-bottom: 1px solid var(--border2);
  flex-shrink: 0;
}
.rw-sidebar-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.05rem;
  color: var(--text);
  margin-bottom: 0.75rem;
}
.rw-sidebar-filters {
  display: flex;
  gap: 0.4rem;
}
.rw-filter-pill {
  flex: 1;
  padding: 0.35rem 0.5rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--s2);
  color: var(--text-dim);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.73rem;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.rw-filter-pill:hover   { border-color: rgba(52,211,153,0.25); color: var(--text-soft); }
.rw-filter-pill.active  { border-color: var(--green); background: rgba(52,211,153,0.08); color: var(--green); }

.rw-search-wrap {
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--border2);
  flex-shrink: 0;
}
.rw-search {
  position: relative;
}
.rw-search input {
  width: 100%;
  background: var(--s2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.4rem 0.75rem 0.4rem 2rem;
  font-size: 0.8rem;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: border-color 0.2s;
}
.rw-search input::placeholder { color: #1f2937; }
.rw-search input:focus { border-color: rgba(52,211,153,0.3); }
.rw-search-icon {
  position: absolute;
  left: 0.55rem; top: 50%;
  transform: translateY(-50%);
  color: #374151; font-size: 0.75rem;
  pointer-events: none;
}

/* Track list */
.rw-tracklist {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  scrollbar-width: thin;
  scrollbar-color: #1f1f2e transparent;
}
.rw-tracklist::-webkit-scrollbar { width: 4px; }
.rw-tracklist::-webkit-scrollbar-track { background: transparent; }
.rw-tracklist::-webkit-scrollbar-thumb { background: #1f1f2e; border-radius: 2px; }

.rw-track-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 2px solid transparent;
  position: relative;
}
.rw-track-item:hover  { background: rgba(255,255,255,0.03); }
.rw-track-item.active {
  background: rgba(52,211,153,0.06);
  border-left-color: var(--green);
}

.rw-track-cover {
  width: 42px; height: 42px;
  border-radius: 8px;
  object-fit: cover;
  background: var(--s3);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; color: #374151;
  flex-shrink: 0;
  overflow: hidden;
}
.rw-track-cover img { width:100%; height:100%; object-fit:cover; border-radius:8px; }

.rw-track-meta { flex: 1; min-width: 0; }
.rw-track-name {
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--text-soft);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 2px;
}
.rw-track-item.active .rw-track-name { color: var(--text); }
.rw-track-sub {
  font-size: 0.68rem;
  color: #374151;
  display: flex; align-items: center; gap: 0.3rem;
}
.rw-track-status-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rw-track-reviewed-badge {
  font-size: 0.62rem;
  padding: 0.12rem 0.4rem;
  border-radius: 10px;
  background: rgba(52,211,153,0.1);
  color: var(--green);
  border: 1px solid rgba(52,211,153,0.2);
  white-space: nowrap;
  flex-shrink: 0;
}

/* skeleton items */
.rw-skel-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 1rem;
}
.rw-skel-cover {
  width: 42px; height: 42px;
  border-radius: 8px;
  background: var(--s3);
  animation: rw-shimmer 1.4s ease infinite;
}
.rw-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.rw-skel-line {
  height: 8px;
  border-radius: 4px;
  background: var(--s3);
  animation: rw-shimmer 1.4s ease infinite;
}
@keyframes rw-shimmer {
  0%   { opacity: 0.6; }
  50%  { opacity: 1; }
  100% { opacity: 0.6; }
}

/* Empty sidebar */
.rw-sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 0.6rem;
  text-align: center;
  padding: 2rem;
}
.rw-sidebar-empty-icon { font-size: 2rem; opacity: 0.15; }
.rw-sidebar-empty p { font-size: 0.78rem; color: #1f2937; }

/* ── Main area ────────────────────────────────────── */
.rw-main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Empty state */
.rw-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 1rem;
  text-align: center;
  padding: 3rem;
}
.rw-empty-state-icon { font-size: 4rem; opacity: 0.1; }
.rw-empty-state h2 {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  color: #374151;
}
.rw-empty-state p { font-size: 0.85rem; color: #1f2937; max-width: 280px; }

/* ── Player area ──────────────────────────────────── */
.rw-player-area {
  background: var(--s1);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  padding: 1.25rem 1.5rem 1rem;
}

/* track info row */
.rw-track-info-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.1rem;
}
.rw-player-cover {
  width: 56px; height: 56px;
  border-radius: 10px;
  object-fit: cover;
  background: var(--s3);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; color: #374151;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--border);
}
.rw-player-cover img { width:100%; height:100%; object-fit:cover; }

.rw-player-track-meta { flex: 1; min-width: 0; }
.rw-player-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 0.25rem;
}
.rw-player-sub {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.75rem; color: var(--text-dim);
}
.rw-player-genre {
  padding: 0.12rem 0.45rem;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #4b5563;
}

/* Waveform area */
.rw-waveform-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 0.85rem;
}

/* Animated waveform bars */
.rw-waveform {
  flex: 1;
  height: 52px;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255,255,255,0.02);
}
.rw-waveform-bars {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 100%;
  height: 100%;
  padding: 4px 8px;
}
.rw-wbar {
  flex: 1;
  border-radius: 2px;
  min-height: 3px;
  transition: background 0.15s;
}
.rw-waveform-cursor {
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: var(--green);
  box-shadow: 0 0 8px rgba(52,211,153,0.5);
  pointer-events: none;
  transition: left 0.1s linear;
}
/* Time markers on waveform */
.rw-waveform-marker {
  position: absolute;
  top: 0; bottom: 0;
  width: 1px;
  background: rgba(226,201,126,0.5);
  pointer-events: none;
}
.rw-waveform-marker::after {
  content: attr(data-label);
  position: absolute;
  top: 2px; left: 3px;
  font-size: 9px;
  color: var(--gold-dim);
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}

/* Controls */
.rw-controls {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.rw-ctrl-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-dim);
  font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  border-radius: 8px;
  transition: color 0.15s, background 0.15s;
  padding: 0;
  flex-shrink: 0;
}
.rw-ctrl-btn:hover { color: var(--text); background: rgba(255,255,255,0.06); }
.rw-ctrl-btn.play-btn {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--green);
  color: #0a0a0f;
  font-size: 1.1rem;
  box-shadow: 0 4px 20px rgba(52,211,153,0.25);
  transition: transform 0.15s, box-shadow 0.15s;
}
.rw-ctrl-btn.play-btn:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 28px rgba(52,211,153,0.35);
}
.rw-ctrl-btn.play-btn.loading {
  background: rgba(52,211,153,0.3);
  cursor: wait;
}

/* Time display */
.rw-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  color: var(--text-dim);
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.rw-time-current { color: var(--text); }

/* Volume */
.rw-volume-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
  flex-shrink: 0;
}
.rw-vol-icon { font-size: 0.9rem; color: var(--text-dim); cursor: pointer; }
.rw-vol-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 72px; height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,0.1);
  outline: none;
  cursor: pointer;
}
.rw-vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--text-soft);
  cursor: pointer;
  transition: background 0.15s;
}
.rw-vol-slider:hover::-webkit-slider-thumb { background: var(--green); }

/* Marker button */
.rw-marker-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(226,201,126,0.2);
  background: rgba(226,201,126,0.04);
  color: var(--gold-dim);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.rw-marker-btn:hover {
  border-color: rgba(226,201,126,0.4);
  background: rgba(226,201,126,0.08);
  color: var(--gold);
}
.rw-marker-btn:disabled { opacity:0.3; cursor:default; }

/* ── Scrollable content below player ── */
.rw-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  scrollbar-width: thin;
  scrollbar-color: #1f1f2e transparent;
}
.rw-scroll-area::-webkit-scrollbar { width: 5px; }
.rw-scroll-area::-webkit-scrollbar-track { background: transparent; }
.rw-scroll-area::-webkit-scrollbar-thumb { background: #1f1f2e; border-radius: 3px; }

/* ── Already reviewed banner ── */
.rw-reviewed-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.2rem;
  background: rgba(52,211,153,0.06);
  border: 1px solid rgba(52,211,153,0.2);
  border-radius: var(--radius);
  font-size: 0.85rem;
  color: var(--green);
}
.rw-reviewed-banner-icon { font-size: 1.4rem; flex-shrink: 0; }
.rw-reviewed-banner strong { color: #6ee7b7; display: block; margin-bottom: 2px; }

/* ── Scoring form ─────────────────────────────────── */
.rw-form-card {
  background: var(--s1);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 1.5rem;
}
.rw-form-section-title {
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
.rw-form-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.04);
}

/* Score criteria */
.rw-criteria-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem;
  margin-bottom: 0.5rem;
}
@media(max-width:900px) { .rw-criteria-grid { grid-template-columns:1fr; } }

.rw-criterion {
  background: var(--s2);
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  padding: 1.1rem;
  transition: border-color 0.2s;
}
.rw-criterion:hover { border-color: rgba(255,255,255,0.08); }
.rw-criterion.scored { border-color: rgba(255,255,255,0.1); }

.rw-crit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.rw-crit-label-wrap { display: flex; align-items: center; gap: 0.45rem; }
.rw-crit-icon { font-size: 1rem; }
.rw-crit-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-soft);
}
.rw-crit-desc {
  font-size: 0.68rem;
  color: #374151;
  line-height: 1.5;
  margin-top: 2px;
}
.rw-crit-score-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
}
.rw-crit-score-num {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  line-height: 1;
  transition: color 0.2s;
}
.rw-crit-score-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
}

/* Slider */
.rw-slider-wrap {
  position: relative;
  padding-bottom: 1.5rem;
}
.rw-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  position: relative;
  z-index: 1;
}
.rw-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: 2.5px solid var(--bg);
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  transition: transform 0.15s, box-shadow 0.15s;
}
.rw-slider:hover::-webkit-slider-thumb,
.rw-slider:active::-webkit-slider-thumb {
  transform: scale(1.2);
  box-shadow: 0 3px 12px rgba(0,0,0,0.5);
}
/* tick marks below slider */
.rw-slider-ticks {
  position: absolute;
  bottom: 0;
  left: 0; right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
}
.rw-slider-tick {
  font-size: 0.6rem;
  color: #1f2937;
  font-family: 'JetBrains Mono', monospace;
  width: 16px;
  text-align: center;
  transition: color 0.2s;
}
.rw-slider-tick.active { color: var(--text-dim); }

/* Overall score bar */
.rw-overall-bar {
  background: var(--s2);
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  padding: 1.1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-top: 0.5rem;
}
.rw-overall-label { font-size: 0.78rem; color: var(--text-dim); font-weight: 600; }
.rw-overall-track {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
}
.rw-overall-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1);
}
.rw-overall-num {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  min-width: 40px;
  text-align: right;
  transition: color 0.3s;
}

/* ── Time markers section ─────────────────────────── */
.rw-markers-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.rw-marker-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: var(--s2);
  border: 1px solid var(--border2);
  border-radius: 10px;
  animation: markerIn 0.2s cubic-bezier(0.22,1,0.36,1);
}
@keyframes markerIn {
  from { opacity:0; transform:translateY(-4px); }
  to   { opacity:1; transform:translateY(0); }
}
.rw-marker-time {
  flex-shrink: 0;
  padding: 0.15rem 0.5rem;
  background: rgba(226,201,126,0.08);
  border: 1px solid rgba(226,201,126,0.15);
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: var(--gold-dim);
  cursor: pointer;
  transition: background 0.15s;
}
.rw-marker-time:hover { background: rgba(226,201,126,0.14); }
.rw-marker-note-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.8rem;
  color: var(--text-soft);
  placeholder-color: #374151;
}
.rw-marker-note-input::placeholder { color: #374151; }
.rw-marker-remove {
  flex-shrink: 0;
  background: none; border: none;
  color: #374151;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px;
  transition: color 0.15s;
  display: flex; align-items: center;
}
.rw-marker-remove:hover { color: var(--error); }
.rw-no-markers {
  font-size: 0.78rem;
  color: #1f2937;
  padding: 0.4rem 0;
}

/* ── Comment textarea ────────────────────────────── */
.rw-comment-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4b5563;
  margin-bottom: 0.6rem;
}
.rw-comment-count { letter-spacing: 0; text-transform: none; }
.rw-comment-count.warn { color: var(--gold-dim); }
.rw-textarea {
  width: 100%;
  background: var(--s2);
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.875rem;
  color: var(--text);
  outline: none;
  resize: vertical;
  min-height: 110px;
  transition: border-color 0.2s, box-shadow 0.2s;
  line-height: 1.6;
}
.rw-textarea::placeholder { color: #1f2937; }
.rw-textarea:focus {
  border-color: rgba(52,211,153,0.3);
  box-shadow: 0 0 0 3px rgba(52,211,153,0.06);
}
.rw-textarea.error { border-color: rgba(248,113,113,0.3); }

/* ── Submit zone ─────────────────────────────────── */
.rw-submit-zone {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 0.25rem;
  flex-wrap: wrap;
}
.rw-submit-checklist {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 180px;
}
.rw-check-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
}
.rw-check-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.2s;
}
.rw-check-dot.done { background: var(--green); }
.rw-check-dot.pending { background: rgba(255,255,255,0.1); }
.rw-check-text { transition: color 0.2s; }
.rw-check-text.done { color: var(--text-dim); }
.rw-check-text.pending { color: #374151; }

.rw-submit-btn {
  padding: 0.85rem 1.75rem;
  background: linear-gradient(135deg, var(--green), var(--green-dim));
  border: none;
  border-radius: var(--radius);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #0a0a0f;
  cursor: pointer;
  letter-spacing: 0.02em;
  display: flex; align-items: center; gap: 0.5rem;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(52,211,153,0.2);
  white-space: nowrap;
}
.rw-submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(52,211,153,0.3);
}
.rw-submit-btn:disabled { opacity:0.35; cursor:not-allowed; transform:none; }

/* Error / success banner */
.rw-banner {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.83rem;
  display: flex; align-items: flex-start; gap: 0.5rem;
}
.rw-banner.error   { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); color:#fca5a5; }
.rw-banner.success { background:rgba(52,211,153,0.08);  border:1px solid rgba(52,211,153,0.2);  color:var(--green); }

/* Spinner */
.rw-spinner {
  width:16px; height:16px;
  border:2px solid rgba(10,10,15,0.2);
  border-top-color:#0a0a0f;
  border-radius:50%;
  animation:rw-spin .7s linear infinite;
}
@keyframes rw-spin { to{transform:rotate(360deg)} }

/* Toast */
.rw-toast {
  position: fixed;
  bottom: 1.5rem; right: 1.5rem;
  z-index: 300;
  padding: 0.8rem 1.2rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex; align-items: center; gap: 0.5rem;
  animation: rw-toast-in 0.25s cubic-bezier(0.22,1,0.36,1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
@keyframes rw-toast-in {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0); }
}
.rw-toast.success { background:#0a1f16; border:1px solid rgba(52,211,153,0.3); color:var(--green); }
.rw-toast.error   { background:#1a0a0a; border:1px solid rgba(248,113,113,0.3); color:var(--error); }

/* Responsive */
@media(max-width:820px){
  .rw-root { grid-template-columns:1fr; grid-template-rows:auto 1fr; }
  .rw-sidebar {
    height: auto;
    max-height: 220px;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .rw-tracklist { flex-direction:row; display:flex; overflow-x:auto; overflow-y:hidden; padding:0.5rem 0.5rem; }
  .rw-track-item { flex-direction:column; min-width:100px; border-left:none; border-bottom:2px solid transparent; }
  .rw-track-item.active { border-bottom-color:var(--green); border-left:none; background:rgba(52,211,153,0.06); }
  .rw-track-meta { display:none; }
}
`;

// ─────────────────────────────────────────────────────────────
//  Audio Player Hook
// ─────────────────────────────────────────────────────────────

function useAudioPlayer(url) {
  const audioRef   = useRef(null);
  const rafRef     = useRef(null);
  const [state, dispatch] = useReducer((s, a) => ({ ...s, ...a }), {
    playing:  false,
    loading:  false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    volume:   0.8,
    muted:    false,
  });

  // Build / tear down audio element when url changes
  useEffect(() => {
    if (!url) return;
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = state.volume;

    dispatch({ loading: true, playing: false, progress: 0, currentTime: 0, duration: 0 });

    const onLoaded = () => dispatch({ loading: false, duration: audio.duration || 0 });
    const onEnded  = () => dispatch({ playing: false, progress: 0, currentTime: 0 });
    const onError  = () => dispatch({ loading: false });

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audio.src = url;
    audio.load();

    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // rAF loop for smooth progress
  useEffect(() => {
    if (!state.playing) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        const cur  = audio.currentTime;
        const dur  = audio.duration || 1;
        dispatch({ currentTime: cur, progress: (cur / dur) * 100 });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.playing]);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || state.loading) return;
    if (state.playing) {
      audio.pause();
      dispatch({ playing: false });
    } else {
      try {
        await audio.play();
        dispatch({ playing: true });
      } catch { /* autoplay blocked etc */ }
    }
  }, [state.playing, state.loading]);

  const seek = useCallback((pct) => {
    const audio = audioRef.current;
    if (!audio || !state.duration) return;
    audio.currentTime = (pct / 100) * state.duration;
    dispatch({ progress: pct, currentTime: audio.currentTime });
  }, [state.duration]);

  const seekToSecond = useCallback((sec) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = sec;
    dispatch({ currentTime: sec, progress: state.duration ? (sec / state.duration) * 100 : 0 });
  }, [state.duration]);

  const setVolume = useCallback((v) => {
    if (audioRef.current) audioRef.current.volume = v;
    dispatch({ volume: v, muted: v === 0 });
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (state.muted) {
      audio.volume = state.volume || 0.8;
      dispatch({ muted: false });
    } else {
      audio.volume = 0;
      dispatch({ muted: true });
    }
  }, [state.muted, state.volume]);

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  return { ...state, toggle, seek, seekToSecond, setVolume, toggleMute, fmtTime };
}

// ─────────────────────────────────────────────────────────────
//  Waveform visualization
// ─────────────────────────────────────────────────────────────

// Generate deterministic-ish waveform heights from track id
function generateBars(trackId, count = 80) {
  let seed = 0;
  for (let i = 0; i < (trackId?.length || 0); i++) seed += trackId.charCodeAt(i);
  const bars = [];
  let prev = 0.5;
  for (let i = 0; i < count; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const raw = ((seed >>> 0) / 0xffffffff);
    // Smooth with prev for natural waveform look
    const h = Math.max(0.08, Math.min(1, prev * 0.6 + raw * 0.4));
    bars.push(h);
    prev = h;
  }
  return bars;
}

function Waveform({ trackId, progress, onSeek, markers }) {
  const bars    = generateBars(trackId);
  const wrapRef = useRef(null);

  const handleClick = (e) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const pct  = ((e.clientX - rect.left) / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, pct)));
  };

  return (
    <div className="rw-waveform" ref={wrapRef} onClick={handleClick}>
      <div className="rw-waveform-bars">
        {bars.map((h, i) => {
          const barPct  = (i / bars.length) * 100;
          const played  = barPct <= progress;
          const height  = `${Math.max(8, h * 44)}px`;
          return (
            <div
              key={i}
              className="rw-wbar"
              style={{
                height,
                background: played
                  ? `rgba(52,211,153,${0.5 + h * 0.5})`
                  : `rgba(255,255,255,${0.05 + h * 0.08})`,
              }}
            />
          );
        })}
      </div>
      {/* Playhead */}
      <div className="rw-waveform-cursor" style={{ left: `${progress}%` }} />
      {/* Time markers */}
      {markers.map((m, i) => {
        if (!m.atSecond && m.atSecond !== 0) return null;
        return (
          <div key={i}
            className="rw-waveform-marker"
            data-label={`M${i + 1}`}
            style={{ left: `${m._pct || 0}%` }}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Score criterion slider
// ─────────────────────────────────────────────────────────────

function CriterionSlider({ criterion, value, onChange, disabled }) {
  const { key, label, desc, icon, color } = criterion;

  const scoreInfo = value > 0
    ? { text: SCORE_LABELS[value], color }
    : { text: 'Chưa chấm', color: '#374151' };

  // Background gradient for slider
  const pct = ((value - 1) / 9) * 100;
  const trackStyle = {
    background: value > 0
      ? `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.06) ${pct}%, rgba(255,255,255,0.06) 100%)`
      : 'rgba(255,255,255,0.06)',
  };

  return (
    <div className={`rw-criterion ${value > 0 ? 'scored' : ''}`}
      style={{ borderColor: value > 0 ? `${color}20` : '' }}>
      <div className="rw-crit-header">
        <div>
          <div className="rw-crit-label-wrap">
            <span className="rw-crit-icon">{icon}</span>
            <span className="rw-crit-label">{label}</span>
          </div>
          <div className="rw-crit-desc">{desc}</div>
        </div>
        <div className="rw-crit-score-display">
          <span className="rw-crit-score-num" style={{ color: scoreInfo.color }}>
            {value || '—'}
          </span>
          <span className="rw-crit-score-label" style={{ color: scoreInfo.color }}>
            {scoreInfo.text}
          </span>
        </div>
      </div>

      <div className="rw-slider-wrap">
        <input
          type="range"
          className="rw-slider"
          min={1} max={10} step={1}
          value={value || 1}
          onChange={e => onChange(key, Number(e.target.value))}
          disabled={disabled}
          style={trackStyle}
        />
        <div className="rw-slider-ticks">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <span key={n}
              className={`rw-slider-tick ${n <= (value || 0) ? 'active' : ''}`}>
              {n}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Score color helper
// ─────────────────────────────────────────────────────────────

const scoreColor = (s) => {
  if (s >= 8)   return '#34d399';
  if (s >= 6)   return '#e2c97e';
  if (s >= 4)   return '#fbbf24';
  return '#f87171';
};

// ─────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────

export default function ReviewerWorkspace() {
  // Track list
  const [tracks,        setTracks]        = useState([]);
  const [loadingList,   setLoadingList]   = useState(true);
  const [listFilter,    setListFilter]    = useState('all');   // all | pending | reviewing
  const [search,        setSearch]        = useState('');

  // Selected track
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  // Form state
  const [scores,      setScores]      = useState({ ...INITIAL_SCORES });
  const [comment,     setComment]     = useState('');
  const [markers,     setMarkers]     = useState([]);  // [{atSecond, note, _pct}]
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState('');
  const [toast,       setToast]       = useState(null);

  // Audio player
  const player = useAudioPlayer(selectedTrack?.audioUrl);

  // ── Fetch track list ────────────────────────────────────────

  const fetchTracks = useCallback(async () => {
    setLoadingList(true);
    try {
      const statuses = listFilter === 'all'
        ? ['pending', 'reviewing']
        : [listFilter];

      const results = await Promise.all(
        statuses.map(s =>
          api.get(`/tracks?status=${s}&limit=50`).then(r => r.data.tracks)
        )
      );

      const all = results.flat();
      // De-duplicate by _id
      const unique = all.filter((t, i, arr) => arr.findIndex(x => x._id === t._id) === i);
      setTracks(unique);
    } catch {
      setTracks([]);
    } finally {
      setLoadingList(false);
    }
  }, [listFilter]);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  // ── Select track ────────────────────────────────────────────

  const selectTrack = useCallback(async (track) => {
    setSelectedTrack(track);
    setScores({ ...INITIAL_SCORES });
    setComment('');
    setMarkers([]);
    setFormError('');
    setAlreadyReviewed(false);

    // Check if already reviewed — try to get reviews for this track
    try {
      const { data } = await api.get(`/reviews/track/${track._id}`);
      // If we got reviews back and the reviewer's name matches current user,
      // we can't easily tell from client alone without user context,
      // but the backend will return 400 if we try to double-review.
      // We'll mark as "possibly reviewed" based on optimistic check below.
    } catch { /* ignore */ }
  }, []);

  // ── Add time marker ────────────────────────────────────────

  const addMarker = useCallback(() => {
    if (!selectedTrack || !player.duration) return;
    const sec = Math.floor(player.currentTime);
    const pct = (player.currentTime / player.duration) * 100;
    setMarkers(prev => [...prev, { atSecond: sec, note: '', _pct: pct }]);
  }, [selectedTrack, player.currentTime, player.duration]);

  const updateMarkerNote = (idx, note) => {
    setMarkers(prev => prev.map((m, i) => i === idx ? { ...m, note } : m));
  };

  const removeMarker = (idx) => {
    setMarkers(prev => prev.filter((_, i) => i !== idx));
  };

  const seekToMarker = (sec) => {
    player.seekToSecond(sec);
  };

  // ── Score update ────────────────────────────────────────────

  const handleScore = (key, val) => {
    setScores(prev => ({ ...prev, [key]: val }));
    setFormError('');
  };

  const allScored = CRITERIA.every(c => scores[c.key] > 0);
  const overallScore = allScored
    ? CRITERIA.reduce((sum, c) => sum + scores[c.key], 0) / 5
    : 0;

  // ── Submit ──────────────────────────────────────────────────

  const handleSubmit = async () => {
    setFormError('');

    if (!selectedTrack) return;
    if (!allScored) {
      setFormError('Vui lòng chấm đầy đủ 5 tiêu chí trước khi gửi.');
      return;
    }
    if (comment.trim().length < 20) {
      setFormError('Nhận xét phải có ít nhất 20 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reviews', {
        trackId:     selectedTrack._id,
        scores:      { melody: scores.melody, lyrics: scores.lyrics,
                       harmony: scores.harmony, rhythm: scores.rhythm,
                       production: scores.production },
        comment:     comment.trim(),
        timeMarkers: markers
          .filter(m => m.atSecond >= 0 && m.note.trim())
          .map(({ atSecond, note }) => ({ atSecond, note: note.trim() })),
      });

      showToast('Đánh giá đã gửi thành công, đang chờ Admin duyệt!', 'success');
      setAlreadyReviewed(true);
      setScores({ ...INITIAL_SCORES });
      setComment('');
      setMarkers([]);

      // Refresh list (track may now be 'reviewing')
      fetchTracks();

    } catch (err) {
      const msg = extractErrorMessage(err, 'Gửi đánh giá thất bại');
      if (msg.includes('đã gửi') || msg.includes('reviewed')) {
        setAlreadyReviewed(true);
        setFormError('Bạn đã đánh giá bài nhạc này rồi.');
      } else {
        setFormError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toast ───────────────────────────────────────────────────

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Filtered list ────────────────────────────────────────────

  const filteredTracks = tracks.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.title.toLowerCase().includes(q) ||
           (t.artist?.name || '').toLowerCase().includes(q);
  });

  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60);
    return `${m}:${Math.floor(sec % 60).toString().padStart(2,'0')}`;
  };

  // ─────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>

      <div className="rw-root">

        {/* ════════════════════════════════════════════════════
            SIDEBAR — Track list
        ════════════════════════════════════════════════════ */}
        <div className="rw-sidebar">
          {/* Header */}
          <div className="rw-sidebar-head">
            <div className="rw-sidebar-title">Bài chờ đánh giá</div>
            <div className="rw-sidebar-filters">
              {[
                { v:'all',       l:'Tất cả'    },
                { v:'pending',   l:'Mới'       },
                { v:'reviewing', l:'Đang review'},
              ].map(f => (
                <button key={f.v}
                  className={`rw-filter-pill ${listFilter === f.v ? 'active' : ''}`}
                  onClick={() => setListFilter(f.v)}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="rw-search-wrap">
            <div className="rw-search">
              <span className="rw-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Tìm bài nhạc…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          {loadingList ? (
            <div className="rw-tracklist">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rw-skel-item">
                  <div className="rw-skel-cover" />
                  <div className="rw-skel-lines">
                    <div className="rw-skel-line" style={{ width: '80%' }} />
                    <div className="rw-skel-line" style={{ width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="rw-sidebar-empty">
              <div className="rw-sidebar-empty-icon">🎵</div>
              <p>{search ? 'Không tìm thấy kết quả' : 'Không có bài nào cần review'}</p>
            </div>
          ) : (
            <div className="rw-tracklist">
              {filteredTracks.map(track => {
                const statusDot = track.status === 'reviewing' ? '#60a5fa' : '#fbbf24';
                return (
                  <div key={track._id}
                    className={`rw-track-item ${selectedTrack?._id === track._id ? 'active' : ''}`}
                    onClick={() => selectTrack(track)}>
                    <div className="rw-track-cover">
                      {track.coverUrl
                        ? <img src={track.coverUrl} alt="" loading="lazy" />
                        : '♪'}
                    </div>
                    <div className="rw-track-meta">
                      <div className="rw-track-name" title={track.title}>
                        {track.title}
                      </div>
                      <div className="rw-track-sub">
                        <span className="rw-track-status-dot"
                          style={{ background: statusDot }} />
                        {track.artist?.name || 'Artist'}
                        {track.genre && (
                          <span>· {GENRE_LABELS[track.genre] || track.genre}</span>
                        )}
                      </div>
                    </div>
                    {track.reviewCount > 0 && (
                      <span className="rw-track-reviewed-badge">
                        {track.reviewCount} rv
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            MAIN — Player + Scoring form
        ════════════════════════════════════════════════════ */}
        <div className="rw-main">

          {/* Empty state */}
          {!selectedTrack ? (
            <div className="rw-empty-state">
              <div className="rw-empty-state-icon">🎧</div>
              <h2>Chọn một bài nhạc</h2>
              <p>Nhấn vào bài nhạc ở sidebar để bắt đầu nghe và chấm điểm.</p>
            </div>
          ) : (
            <>
              {/* ── Audio Player ───────────────────────────── */}
              <div className="rw-player-area">
                {/* Track info */}
                <div className="rw-track-info-row">
                  <div className="rw-player-cover">
                    {selectedTrack.coverUrl
                      ? <img src={selectedTrack.coverUrl} alt="" />
                      : '♪'}
                  </div>
                  <div className="rw-player-track-meta">
                    <div className="rw-player-title">{selectedTrack.title}</div>
                    <div className="rw-player-sub">
                      <span>{selectedTrack.artist?.name || 'Artist'}</span>
                      <span className="rw-player-genre">
                        {GENRE_LABELS[selectedTrack.genre] || selectedTrack.genre}
                      </span>
                      {selectedTrack.description && (
                        <span style={{
                          color:'#1f2937', fontSize:'0.72rem',
                          maxWidth:'260px', overflow:'hidden',
                          textOverflow:'ellipsis', whiteSpace:'nowrap',
                        }}>
                          {selectedTrack.description}
                        </span>
                      )}
                    </div>
                    {/* Tags */}
                    {selectedTrack.tags?.length > 0 && (
                      <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap', marginTop:'0.35rem' }}>
                        {selectedTrack.tags.slice(0, 5).map(t => (
                          <span key={t} style={{
                            fontSize:'0.65rem', padding:'0.1rem 0.4rem',
                            borderRadius:'6px', background:'rgba(255,255,255,0.04)',
                            color:'#374151',
                          }}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Waveform + seek */}
                <div className="rw-waveform-row">
                  <Waveform
                    trackId={selectedTrack._id}
                    progress={player.progress}
                    onSeek={player.seek}
                    markers={markers}
                  />
                </div>

                {/* Controls */}
                <div className="rw-controls">
                  {/* Skip back 10s */}
                  <button className="rw-ctrl-btn"
                    onClick={() => player.seek(
                      Math.max(0, ((player.currentTime - 10) / (player.duration || 1)) * 100)
                    )}
                    title="Tua lại 10s" disabled={!player.duration}>
                    ↩
                  </button>

                  {/* Play / Pause */}
                  <button
                    className={`rw-ctrl-btn play-btn ${player.loading ? 'loading' : ''}`}
                    onClick={player.toggle}
                    disabled={player.loading}
                    aria-label={player.playing ? 'Dừng' : 'Phát'}
                  >
                    {player.loading ? <div className="rw-spinner" style={{borderTopColor:'rgba(10,10,15,0.4)'}} /> :
                     player.playing ? '⏸' : '▶'}
                  </button>

                  {/* Skip forward 10s */}
                  <button className="rw-ctrl-btn"
                    onClick={() => player.seek(
                      Math.min(100, ((player.currentTime + 10) / (player.duration || 1)) * 100)
                    )}
                    title="Tua tới 10s" disabled={!player.duration}>
                    ↪
                  </button>

                  {/* Time */}
                  <span className="rw-time">
                    <span className="rw-time-current">{player.fmtTime(player.currentTime)}</span>
                    {' / '}
                    {player.fmtTime(player.duration)}
                  </span>

                  {/* Add marker */}
                  <button className="rw-marker-btn"
                    onClick={addMarker}
                    disabled={!player.duration || alreadyReviewed}
                    title="Đánh dấu vị trí hiện tại">
                    ⚑ Đánh dấu {player.duration ? fmtTime(player.currentTime) : ''}
                  </button>

                  {/* Volume */}
                  <div className="rw-volume-wrap">
                    <span className="rw-vol-icon" onClick={player.toggleMute}>
                      {player.muted ? '🔇' : player.volume > 0.5 ? '🔊' : '🔉'}
                    </span>
                    <input
                      type="range"
                      className="rw-vol-slider"
                      min={0} max={1} step={0.05}
                      value={player.muted ? 0 : player.volume}
                      onChange={e => player.setVolume(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* ── Scrollable form area ───────────────────── */}
              <div className="rw-scroll-area">

                {/* Already reviewed banner */}
                {alreadyReviewed && (
                  <div className="rw-reviewed-banner">
                    <span className="rw-reviewed-banner-icon">✅</span>
                    <div>
                      <strong>Bạn đã đánh giá bài nhạc này</strong>
                      Đánh giá đã được gửi đi và đang chờ Admin duyệt.
                      Chọn bài khác từ danh sách để tiếp tục.
                    </div>
                  </div>
                )}

                {/* Scoring form — hidden if already reviewed */}
                {!alreadyReviewed && (
                  <>
                    {/* ── 5 Criteria ─────────────────────── */}
                    <div className="rw-form-card">
                      <div className="rw-form-section-title">
                        <span>⭐</span> Chấm điểm 5 tiêu chí
                      </div>

                      <div className="rw-criteria-grid">
                        {CRITERIA.map(c => (
                          <CriterionSlider
                            key={c.key}
                            criterion={c}
                            value={scores[c.key]}
                            onChange={handleScore}
                            disabled={submitting}
                          />
                        ))}
                      </div>

                      {/* Overall score bar */}
                      <div className="rw-overall-bar">
                        <span className="rw-overall-label">Điểm trung bình</span>
                        <div className="rw-overall-track">
                          <div className="rw-overall-fill"
                            style={{
                              width: allScored ? `${(overallScore / 10) * 100}%` : '0%',
                              background: allScored ? scoreColor(overallScore) : 'transparent',
                            }} />
                        </div>
                        <span className="rw-overall-num"
                          style={{ color: allScored ? scoreColor(overallScore) : '#374151' }}>
                          {allScored ? overallScore.toFixed(1) : '—'}
                        </span>
                      </div>
                    </div>

                    {/* ── Time markers ───────────────────── */}
                    <div className="rw-form-card">
                      <div className="rw-form-section-title">
                        <span>⏱</span> Ghi chú theo mốc thời gian
                        <span style={{ fontSize:'0.72rem', color:'#1f2937', textTransform:'none',
                          letterSpacing:0, fontWeight:400, marginLeft:'0.2rem' }}>
                          (tuỳ chọn)
                        </span>
                      </div>

                      <div className="rw-markers-wrap">
                        {markers.length === 0 ? (
                          <div className="rw-no-markers">
                            Nhấn nút <strong style={{ color:'#c8a84b' }}>⚑ Đánh dấu</strong> trong
                            lúc nghe để ghim ghi chú vào một thời điểm cụ thể.
                          </div>
                        ) : (
                          markers.map((m, idx) => (
                            <div key={idx} className="rw-marker-item">
                              <span
                                className="rw-marker-time"
                                onClick={() => seekToMarker(m.atSecond)}
                                title="Nhấn để tua đến đây">
                                {fmtTime(m.atSecond)}
                              </span>
                              <input
                                className="rw-marker-note-input"
                                type="text"
                                placeholder="Ghi chú tại đây… (tối đa 200 ký tự)"
                                value={m.note}
                                maxLength={200}
                                onChange={e => updateMarkerNote(idx, e.target.value)}
                                disabled={submitting}
                              />
                              <button className="rw-marker-remove"
                                onClick={() => removeMarker(idx)}
                                disabled={submitting}
                                title="Xoá mốc">
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* ── Comment ─────────────────────────── */}
                    <div className="rw-form-card">
                      <div className="rw-comment-label">
                        <span>💬 Nhận xét tổng thể</span>
                        <span className={`rw-comment-count ${comment.length > 1800 ? 'warn' : ''}`}>
                          {comment.length}/2000
                        </span>
                      </div>
                      <textarea
                        className={`rw-textarea ${formError && comment.trim().length < 20 ? 'error' : ''}`}
                        placeholder="Chia sẻ nhận xét chi tiết về bài nhạc — điểm mạnh, điểm cần cải thiện, cảm nhận chung… (tối thiểu 20 ký tự)"
                        value={comment}
                        maxLength={2000}
                        onChange={e => { setComment(e.target.value); setFormError(''); }}
                        disabled={submitting}
                      />

                      {/* Error */}
                      {formError && (
                        <div className="rw-banner error" style={{ marginTop:'0.75rem' }}>
                          <span>⚠</span> {formError}
                        </div>
                      )}

                      {/* Submit zone */}
                      <div className="rw-submit-zone" style={{ marginTop:'1.1rem' }}>
                        {/* Checklist */}
                        <div className="rw-submit-checklist">
                          {[
                            { done: allScored,               text: '5 tiêu chí đã chấm điểm' },
                            { done: comment.trim().length >= 20, text: 'Nhận xét ≥ 20 ký tự' },
                            { done: true,                    text: 'Có thể thêm mốc thời gian' },
                          ].map(({ done, text }) => (
                            <div key={text} className="rw-check-item">
                              <div className={`rw-check-dot ${done ? 'done' : 'pending'}`} />
                              <span className={`rw-check-text ${done ? 'done' : 'pending'}`}>
                                {text}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Submit */}
                        <button
                          className="rw-submit-btn"
                          onClick={handleSubmit}
                          disabled={submitting || !allScored || comment.trim().length < 20}>
                          {submitting ? (
                            <><div className="rw-spinner" /> Đang gửi…</>
                          ) : (
                            '✓ Gửi đánh giá'
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rw-toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}
    </>
  );
}
