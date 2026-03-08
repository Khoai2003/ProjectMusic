/**
 * AdminDashboard.jsx
 * Bảng điều khiển quản trị — 3 tab: Tổng quan | Duyệt Review | Người dùng
 *
 * API:
 *   GET    /api/admin/stats                 → thống kê dashboard
 *   GET    /api/reviews/pending?page=&limit= → review chờ duyệt
 *   PATCH  /api/reviews/:id/approve         → duyệt review
 *   PATCH  /api/reviews/:id/reject          → từ chối review
 *   GET    /api/admin/users?page=&role=&search= → danh sách user
 *   PATCH  /api/admin/users/:id/toggle      → khoá / mở tài khoản
 *   DELETE /api/admin/tracks/:id            → xoá bài vi phạm
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api, { extractErrorMessage } from '../../api/axiosConfig';

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Tổng quan',    icon: '📊' },
  { id: 'reviews',  label: 'Duyệt Review', icon: '🔍' },
  { id: 'users',    label: 'Người dùng',   icon: '👥' },
];

const ROLE_CONFIG = {
  artist:   { label: 'Artist',   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  reviewer: { label: 'Reviewer', color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  admin:    { label: 'Admin',    color: '#e2c97e', bg: 'rgba(226,201,126,0.1)' },
};

const SCORE_COLOR = (s) => {
  if (s >= 8)   return '#34d399';
  if (s >= 6)   return '#e2c97e';
  if (s >= 4)   return '#fbbf24';
  return '#f87171';
};

const CRITERIA_LABELS = {
  melody:'Giai điệu', lyrics:'Lời', harmony:'Hòa âm',
  rhythm:'Nhịp điệu', production:'Sản xuất',
};

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
  : '—';

const fmtNum = (n) => (n ?? 0).toLocaleString('vi-VN');

const initials = (name = '') =>
  name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

// ─────────────────────────────────────────────────────────────
//  CSS
// ─────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #0a0a0f;
  --s1:       #0f0f18;
  --s2:       #131320;
  --s3:       #18182a;
  --border:   rgba(255,255,255,0.06);
  --border2:  rgba(255,255,255,0.03);
  --gold:     #e2c97e;
  --gold-dim: #c8a84b;
  --green:    #34d399;
  --red:      #f87171;
  --blue:     #60a5fa;
  --text:     #e2e8f0;
  --text-dim: #6b7280;
  --text-soft:#9ca3af;
  --radius:   14px;
}

/* ── Root ── */
.adm-root {
  min-height: calc(100vh - 64px);
  background: var(--bg);
  font-family: 'DM Sans', sans-serif;
  color: var(--text);
}

/* ── Top bar ── */
.adm-topbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem 2rem 0;
  flex-wrap: wrap;
}
.adm-topbar-left h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  color: var(--text);
  margin-bottom: 0.2rem;
}
.adm-topbar-left p { font-size: 0.83rem; color: var(--text-dim); }
.adm-refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--s1);
  color: var(--text-dim);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}
.adm-refresh-btn:hover { border-color: rgba(226,201,126,0.2); color: var(--gold); }
.adm-refresh-btn.spinning svg { animation: adm-spin 0.8s linear infinite; }
@keyframes adm-spin { to { transform: rotate(360deg); } }

/* ── Tab bar ── */
.adm-tabs {
  display: flex;
  gap: 0;
  padding: 1.25rem 2rem 0;
  border-bottom: 1px solid var(--border2);
}
.adm-tab {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.1rem;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-dim);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  margin-bottom: -1px;
}
.adm-tab:hover { color: var(--text-soft); }
.adm-tab.active { color: var(--gold); border-bottom-color: var(--gold); }
.adm-tab-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.45rem;
  border-radius: 10px;
  background: rgba(248,113,113,0.15);
  color: var(--red);
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

/* ── Content area ── */
.adm-content {
  padding: 1.75rem 2rem 4rem;
}

/* ════════════════════════════════════
   OVERVIEW TAB
════════════════════════════════════ */

/* Stat cards */
.adm-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}
.adm-stat-card {
  background: var(--s1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  transition: border-color 0.2s, transform 0.2s;
  animation: adm-fadein 0.4s cubic-bezier(0.22,1,0.36,1) both;
  position: relative;
  overflow: hidden;
}
.adm-stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  opacity: 0.6;
}
.adm-stat-card:hover { border-color: rgba(255,255,255,0.1); transform: translateY(-2px); }
@keyframes adm-fadein {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0); }
}
.adm-stat-icon { font-size: 1.5rem; margin-bottom: 0.25rem; }
.adm-stat-num {
  font-family: 'Playfair Display', serif;
  font-size: 1.9rem;
  color: var(--text);
  line-height: 1;
}
.adm-stat-label { font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.07em; }
.adm-stat-sub   { font-size: 0.75rem; color: #374151; margin-top: 0.25rem; }

/* Distribution panels */
.adm-ov-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
@media(max-width:700px) { .adm-ov-grid { grid-template-columns:1fr; } }

.adm-ov-panel {
  background: var(--s1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.35rem;
  animation: adm-fadein 0.5s cubic-bezier(0.22,1,0.36,1) both;
}
.adm-ov-panel-title {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4b5563;
  margin-bottom: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.adm-ov-panel-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.04);
}
.adm-dist-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}
.adm-dist-item:last-child { margin-bottom: 0; }
.adm-dist-label { font-size: 0.82rem; color: var(--text-soft); width: 90px; flex-shrink: 0; }
.adm-dist-track {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  overflow: hidden;
}
.adm-dist-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 1s cubic-bezier(0.34,1.56,0.64,1);
}
.adm-dist-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: var(--text-dim);
  min-width: 28px;
  text-align: right;
}

/* ════════════════════════════════════
   REVIEWS TAB
════════════════════════════════════ */

.adm-reviews-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.adm-reviews-count {
  font-size: 0.82rem;
  color: var(--text-dim);
}
.adm-reviews-count strong { color: var(--red); }

/* Review card */
.adm-review-card {
  background: var(--s1);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.35rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s;
  animation: adm-fadein 0.3s cubic-bezier(0.22,1,0.36,1) both;
  position: relative;
}
.adm-review-card:hover { border-color: rgba(255,255,255,0.1); }

/* Track strip */
.adm-rv-track-strip {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border2);
}
.adm-rv-cover {
  width: 50px; height: 50px;
  border-radius: 10px;
  object-fit: cover;
  background: var(--s3);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; color: #374151;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--border);
}
.adm-rv-cover img { width:100%; height:100%; object-fit:cover; }
.adm-rv-track-info { flex: 1; min-width: 0; }
.adm-rv-track-title {
  font-family: 'Playfair Display', serif;
  font-size: 0.95rem;
  color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 3px;
}
.adm-rv-track-sub { font-size: 0.72rem; color: #374151; display: flex; gap: 0.5rem; flex-wrap: wrap; }
.adm-rv-track-status {
  font-size: 0.68rem;
  padding: 0.15rem 0.5rem;
  border-radius: 20px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Reviewer strip */
.adm-rv-reviewer {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
}
.adm-rv-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--s3);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--gold);
  border: 1px solid rgba(226,201,126,0.15);
  flex-shrink: 0;
  overflow: hidden;
}
.adm-rv-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
.adm-rv-reviewer-name { font-size: 0.82rem; color: var(--text-soft); }
.adm-rv-reviewer-rep  { font-size: 0.7rem; color: #374151; margin-left: 0.25rem; }
.adm-rv-date          { margin-left: auto; font-size: 0.72rem; color: #374151; }

/* Scores row */
.adm-rv-scores {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.85rem;
}
.adm-rv-score-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 0.35rem 0.6rem;
  background: var(--s2);
  border: 1px solid var(--border2);
  border-radius: 10px;
  min-width: 58px;
}
.adm-rv-score-val {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  line-height: 1;
}
.adm-rv-score-lbl {
  font-size: 0.6rem;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.adm-rv-overall {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.adm-rv-overall-num {
  font-family: 'Playfair Display', serif;
  font-size: 1.6rem;
  line-height: 1;
}
.adm-rv-overall-lbl { font-size: 0.62rem; color: #4b5563; text-transform: uppercase; letter-spacing: 0.06em; }

/* Comment */
.adm-rv-comment {
  font-size: 0.82rem;
  color: #6b7280;
  line-height: 1.65;
  padding: 0.75rem 1rem;
  background: var(--s2);
  border-radius: 10px;
  border-left: 3px solid rgba(255,255,255,0.06);
  margin-bottom: 1rem;
}
.adm-rv-comment.expanded { display: block; }

/* Time markers */
.adm-rv-markers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}
.adm-rv-marker {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  background: rgba(226,201,126,0.05);
  border: 1px solid rgba(226,201,126,0.12);
  border-radius: 6px;
  font-size: 0.72rem;
  color: var(--gold-dim);
}
.adm-rv-marker-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
}

/* Action buttons */
.adm-rv-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.adm-rv-action-reason {
  flex: 1;
  min-width: 200px;
  background: var(--s2);
  border: 1px solid var(--border2);
  border-radius: 10px;
  padding: 0.4rem 0.75rem;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.8rem;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}
.adm-rv-action-reason::placeholder { color: #1f2937; }
.adm-rv-action-reason:focus { border-color: rgba(255,255,255,0.12); }

.adm-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.adm-btn:disabled { opacity:0.4; cursor:not-allowed; }
.adm-btn-approve {
  background: rgba(52,211,153,0.12);
  color: var(--green);
  border: 1px solid rgba(52,211,153,0.25);
}
.adm-btn-approve:hover:not(:disabled) {
  background: rgba(52,211,153,0.2);
  border-color: rgba(52,211,153,0.4);
}
.adm-btn-reject {
  background: rgba(248,113,113,0.08);
  color: var(--red);
  border: 1px solid rgba(248,113,113,0.2);
}
.adm-btn-reject:hover:not(:disabled) {
  background: rgba(248,113,113,0.15);
  border-color: rgba(248,113,113,0.35);
}
.adm-btn-danger {
  background: rgba(248,113,113,0.06);
  color: #f97316;
  border: 1px solid rgba(249,115,22,0.18);
}
.adm-btn-danger:hover:not(:disabled) {
  background: rgba(249,115,22,0.12);
}
.adm-btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
}

/* ════════════════════════════════════
   USERS TAB
════════════════════════════════════ */

.adm-users-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.adm-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 300px;
}
.adm-search-wrap input {
  width: 100%;
  background: var(--s1);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.45rem 0.75rem 0.45rem 2rem;
  font-size: 0.82rem;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: border-color 0.2s;
}
.adm-search-wrap input::placeholder { color: #1f2937; }
.adm-search-wrap input:focus { border-color: rgba(226,201,126,0.25); }
.adm-search-icon {
  position: absolute;
  left: 0.55rem; top: 50%;
  transform: translateY(-50%);
  color: #374151; font-size: 0.75rem;
  pointer-events: none;
}
.adm-role-filter {
  display: flex;
  gap: 0.35rem;
}
.adm-role-pill {
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--s1);
  color: var(--text-dim);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.adm-role-pill:hover { border-color: rgba(226,201,126,0.2); color: var(--text-soft); }
.adm-role-pill.active {
  border-color: var(--gold);
  background: rgba(226,201,126,0.08);
  color: var(--gold);
}

/* Users table */
.adm-users-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 6px;
}
.adm-users-table th {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #374151;
  padding: 0 1rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--border2);
}
.adm-users-table th:last-child { text-align: right; }

.adm-user-row {
  background: var(--s1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  animation: adm-fadein 0.3s cubic-bezier(0.22,1,0.36,1) both;
  transition: border-color 0.2s;
}
.adm-user-row:hover { border-color: rgba(255,255,255,0.1); }
.adm-user-row.locked { opacity: 0.55; }
.adm-user-row td {
  padding: 0.85rem 1rem;
  vertical-align: middle;
  font-size: 0.83rem;
}
.adm-user-row td:first-child { border-radius: var(--radius) 0 0 var(--radius); }
.adm-user-row td:last-child  {
  border-radius: 0 var(--radius) var(--radius) 0;
  text-align: right;
}

/* user cell */
.adm-user-cell {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.adm-user-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: var(--s3);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--gold);
  border: 1.5px solid rgba(226,201,126,0.15);
  flex-shrink: 0;
  overflow: hidden;
}
.adm-user-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
.adm-user-name  { font-weight: 500; color: var(--text-soft); }
.adm-user-email { font-size: 0.72rem; color: #374151; }
.adm-user-locked-badge {
  font-size: 0.62rem;
  padding: 0.1rem 0.4rem;
  background: rgba(248,113,113,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 6px;
  color: var(--red);
  margin-left: 0.4rem;
}

/* role badge */
.adm-role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.6rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.adm-stat-mini {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  color: var(--text-dim);
}

/* Toggle button */
.adm-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.15s;
}
.adm-toggle-btn.unlock {
  color: var(--green);
  border-color: rgba(52,211,153,0.2);
  background: rgba(52,211,153,0.06);
}
.adm-toggle-btn.unlock:hover {
  background: rgba(52,211,153,0.12);
  border-color: rgba(52,211,153,0.35);
}
.adm-toggle-btn.lock {
  color: #f97316;
  border-color: rgba(249,115,22,0.18);
  background: rgba(249,115,22,0.05);
}
.adm-toggle-btn.lock:hover {
  background: rgba(249,115,22,0.1);
  border-color: rgba(249,115,22,0.3);
}
.adm-toggle-btn:disabled { opacity:0.4; cursor:not-allowed; }

/* ════════════════════════════════════
   SHARED: Loading / Empty / Pagination
════════════════════════════════════ */

.adm-skeleton-row {
  background: var(--s1);
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: 0.75rem;
  animation: adm-pulse 1.4s ease infinite;
}
@keyframes adm-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
.adm-skel-line {
  height: 10px;
  border-radius: 5px;
  background: var(--s3);
  margin-bottom: 8px;
}

.adm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
  text-align: center;
}
.adm-empty-icon { font-size: 3rem; opacity: 0.15; }
.adm-empty h3   { font-family:'Playfair Display',serif; color:#374151; font-size:1.1rem; }
.adm-empty p    { font-size:0.82rem; color:#1f2937; max-width:280px; }

.adm-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 1.75rem;
}
.adm-page-btn {
  width: 34px; height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--s1);
  color: var(--text-dim);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.82rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.adm-page-btn:hover:not(:disabled) { border-color:rgba(226,201,126,0.3); color:var(--gold); }
.adm-page-btn.active { border-color:var(--gold); background:rgba(226,201,126,0.1); color:var(--gold); }
.adm-page-btn:disabled { opacity:0.3; cursor:default; }

/* Error banner */
.adm-error {
  padding: 0.75rem 1rem;
  background: rgba(248,113,113,0.06);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 10px;
  font-size: 0.83rem;
  color: #fca5a5;
  display: flex; align-items: center; gap: 0.5rem;
  margin-bottom: 1rem;
}

/* Toast */
.adm-toast {
  position: fixed;
  bottom: 1.75rem; right: 1.75rem;
  z-index: 500;
  padding: 0.8rem 1.2rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex; align-items: center; gap: 0.5rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  animation: adm-toast-in 0.25s cubic-bezier(0.22,1,0.36,1);
  max-width: 360px;
}
@keyframes adm-toast-in {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0); }
}
.adm-toast.success { background:#061410; border:1px solid rgba(52,211,153,0.3); color:var(--green); }
.adm-toast.error   { background:#140606; border:1px solid rgba(248,113,113,0.3); color:var(--red); }
.adm-toast.info    { background:#0a0a16; border:1px solid rgba(226,201,126,0.3); color:var(--gold); }

/* Confirm modal */
.adm-overlay {
  position: fixed; inset:0; z-index:400;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
  animation: adm-fadein 0.15s ease;
}
.adm-modal {
  background: #12121a;
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 18px;
  padding: 2rem;
  width: 100%; max-width: 380px;
  animation: adm-modal-in 0.2s cubic-bezier(0.22,1,0.36,1);
}
@keyframes adm-modal-in {
  from{opacity:0;transform:scale(0.95)translateY(8px);}
  to  {opacity:1;transform:scale(1)translateY(0);}
}
.adm-modal h3 { font-family:'Playfair Display',serif; font-size:1.2rem; color:var(--text); margin-bottom:0.5rem; }
.adm-modal p  { font-size:0.85rem; color:var(--text-dim); margin-bottom:1.5rem; line-height:1.6; }
.adm-modal-actions { display:flex; gap:0.75rem; }
.adm-modal-cancel {
  flex:1; padding:0.65rem;
  border-radius:10px;
  border:1px solid var(--border);
  background:transparent; color:var(--text-soft);
  font-family:'DM Sans',sans-serif; font-size:0.875rem;
  cursor:pointer; transition:all 0.15s;
}
.adm-modal-cancel:hover { background:rgba(255,255,255,0.04); }
.adm-modal-confirm {
  flex:1; padding:0.65rem;
  border-radius:10px; border:none;
  font-family:'DM Sans',sans-serif; font-size:0.875rem;
  font-weight:600; cursor:pointer; transition:all 0.15s;
}
.adm-modal-confirm.red  { background:rgba(248,113,113,0.15); color:var(--red); }
.adm-modal-confirm.red:hover:not(:disabled) { background:rgba(248,113,113,0.25); }
.adm-modal-confirm.gold { background:rgba(226,201,126,0.12); color:var(--gold); }
.adm-modal-confirm.gold:hover:not(:disabled) { background:rgba(226,201,126,0.2); }
.adm-modal-confirm:disabled { opacity:0.4; cursor:not-allowed; }

/* Spinner inline */
.adm-spinner {
  width:13px; height:13px;
  border:2px solid rgba(255,255,255,0.15);
  border-top-color:currentColor;
  border-radius:50%;
  animation:adm-spin .7s linear infinite;
  display:inline-block;
}

@media(max-width:640px){
  .adm-content { padding:1.25rem 1rem 3rem; }
  .adm-topbar  { padding:1.5rem 1rem 0; }
  .adm-tabs    { padding:1rem 1rem 0; overflow-x:auto; }
  .adm-users-table { display:block; overflow-x:auto; }
}
`;

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────

// Animated number
function AnimatedNum({ target }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!target) return;
    const step = Math.ceil(target / 30);
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setDisplay(cur);
      if (cur >= target) clearInterval(t);
    }, 25);
    return () => clearInterval(t);
  }, [target]);
  return <>{fmtNum(display)}</>;
}

// Mini spinner button wrapper
function SpinBtn({ loading, children, ...props }) {
  return (
    <button {...props}>
      {loading ? <span className="adm-spinner" /> : null}
      {!loading && children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB: Overview
// ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, loading }) {
  if (loading) return (
    <div className="adm-stat-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="adm-skeleton-row" style={{ height: 110 }} />
      ))}
    </div>
  );

  if (!stats) return null;

  const { stats: s, usersByRole, tracksByStatus } = stats;

  const STAT_CARDS = [
    { icon:'👥', num: s.totalUsers,           label:'Tổng người dùng',    color:'#a78bfa', sub: `${usersByRole.artist||0} artist · ${usersByRole.reviewer||0} reviewer` },
    { icon:'🎵', num: s.totalTracks,          label:'Tổng bài nhạc',      color:'#60a5fa', sub: `${tracksByStatus.completed||0} đã hoàn tất` },
    { icon:'✅', num: s.totalApprovedReviews, label:'Review đã duyệt',    color:'#34d399', sub: 'Đóng góp vào hệ thống' },
    { icon:'⏳', num: s.pendingReviews,       label:'Review chờ duyệt',   color:'#f87171', sub: 'Cần xử lý' },
    { icon:'🔄', num: tracksByStatus.reviewing||0, label:'Bài đang review', color:'#fbbf24', sub: `${tracksByStatus.pending||0} bài chưa có reviewer` },
    { icon:'🏆', num: tracksByStatus.completed||0, label:'Bài hoàn tất',  color:'#e2c97e', sub: 'Đã đủ 3 review được duyệt' },
  ];

  const totalUsers  = s.totalUsers  || 1;
  const totalTracks = s.totalTracks || 1;

  const USER_DIST = [
    { label: 'Artist',   count: usersByRole.artist   || 0, color: '#a78bfa', total: totalUsers },
    { label: 'Reviewer', count: usersByRole.reviewer || 0, color: '#34d399', total: totalUsers },
    { label: 'Admin',    count: usersByRole.admin    || 0, color: '#e2c97e', total: totalUsers },
  ];

  const TRACK_DIST = [
    { label: 'Chờ review',  count: tracksByStatus.pending   || 0, color: '#fbbf24', total: totalTracks },
    { label: 'Đang review', count: tracksByStatus.reviewing || 0, color: '#60a5fa', total: totalTracks },
    { label: 'Hoàn tất',    count: tracksByStatus.completed || 0, color: '#34d399', total: totalTracks },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div className="adm-stat-grid">
        {STAT_CARDS.map((c, i) => (
          <div key={i} className="adm-stat-card" style={{ animationDelay:`${i * 0.05}s` }}>
            <div style={{
              position:'absolute', top:0, left:0, right:0, height:2,
              background: c.color, opacity:0.5, borderRadius:'2px 2px 0 0',
            }} />
            <div className="adm-stat-icon">{c.icon}</div>
            <div className="adm-stat-num" style={{ color: c.color }}>
              <AnimatedNum target={c.num} />
            </div>
            <div className="adm-stat-label">{c.label}</div>
            <div className="adm-stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Distribution panels */}
      <div className="adm-ov-grid">
        {/* Users by role */}
        <div className="adm-ov-panel" style={{ animationDelay:'0.3s' }}>
          <div className="adm-ov-panel-title"><span>👤</span> Phân bổ người dùng</div>
          {USER_DIST.map(({ label, count, color, total }) => (
            <div key={label} className="adm-dist-item">
              <span className="adm-dist-label">{label}</span>
              <div className="adm-dist-track">
                <div className="adm-dist-fill"
                  style={{ width:`${total ? (count/total)*100 : 0}%`, background: color }} />
              </div>
              <span className="adm-dist-count">{fmtNum(count)}</span>
            </div>
          ))}
        </div>

        {/* Tracks by status */}
        <div className="adm-ov-panel" style={{ animationDelay:'0.35s' }}>
          <div className="adm-ov-panel-title"><span>🎵</span> Trạng thái bài nhạc</div>
          {TRACK_DIST.map(({ label, count, color, total }) => (
            <div key={label} className="adm-dist-item">
              <span className="adm-dist-label">{label}</span>
              <div className="adm-dist-track">
                <div className="adm-dist-fill"
                  style={{ width:`${total ? (count/total)*100 : 0}%`, background: color }} />
              </div>
              <span className="adm-dist-count">{fmtNum(count)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB: Reviews
// ─────────────────────────────────────────────────────────────

function ReviewCard({ review, onApprove, onReject, processingId }) {
  const [expanded,  setExpanded]  = useState(false);
  const [reason,    setReason]    = useState('');
  const [showReject, setShowReject] = useState(false);

  const processing = processingId === review._id;
  const oc = SCORE_COLOR(review.overallScore || 0);
  const critKeys = Object.keys(CRITERIA_LABELS);

  const fmtSec = (s) => { const m = Math.floor(s/60); return `${m}:${(s%60).toString().padStart(2,'0')}`; };

  return (
    <div className="adm-review-card" style={{ animationDelay: '0.05s' }}>
      {/* Track info */}
      <div className="adm-rv-track-strip">
        <div className="adm-rv-cover">
          {review.track?.coverUrl
            ? <img src={review.track.coverUrl} alt="" />
            : '♪'}
        </div>
        <div className="adm-rv-track-info">
          <div className="adm-rv-track-title">{review.track?.title || 'Bài nhạc'}</div>
          <div className="adm-rv-track-sub">
            <span>Genre: {review.track?.genre || '—'}</span>
            <span className="adm-rv-track-status"
              style={{
                color: review.track?.status === 'reviewing' ? '#60a5fa' : '#fbbf24',
                background: review.track?.status === 'reviewing'
                  ? 'rgba(96,165,250,0.1)' : 'rgba(251,191,36,0.1)',
              }}>
              {review.track?.status === 'reviewing' ? 'Đang review' : 'Chờ review'}
            </span>
          </div>
        </div>
        {/* Overall score */}
        <div className="adm-rv-overall">
          <span className="adm-rv-overall-num" style={{ color: oc }}>
            {(review.overallScore || 0).toFixed(1)}
          </span>
          <span className="adm-rv-overall-lbl">Overall</span>
        </div>
      </div>

      {/* Reviewer info */}
      <div className="adm-rv-reviewer">
        <div className="adm-rv-avatar">
          {review.reviewer?.avatarUrl
            ? <img src={review.reviewer.avatarUrl} alt="" />
            : initials(review.reviewer?.name)}
        </div>
        <span className="adm-rv-reviewer-name">{review.reviewer?.name || 'Reviewer'}</span>
        <span className="adm-rv-reviewer-rep">
          · {review.reviewer?.reputationScore || 0} pts
          · {review.reviewer?.totalReviews || 0} reviews
        </span>
        <span className="adm-rv-date">{fmtDate(review.createdAt)}</span>
      </div>

      {/* Score chips */}
      <div className="adm-rv-scores">
        {critKeys.map(k => {
          const val = review.scores?.[k];
          return (
            <div key={k} className="adm-rv-score-chip">
              <span className="adm-rv-score-val" style={{ color: SCORE_COLOR(val || 0) }}>
                {val ?? '—'}
              </span>
              <span className="adm-rv-score-lbl">{CRITERIA_LABELS[k].slice(0,4)}</span>
            </div>
          );
        })}
      </div>

      {/* Comment */}
      <div className="adm-rv-comment">
        {expanded
          ? review.comment
          : (review.comment?.slice(0, 200) + (review.comment?.length > 200 ? '…' : ''))}
        {review.comment?.length > 200 && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer',
              fontSize:'0.78rem', marginLeft:'0.3rem', padding:0, fontFamily:'inherit' }}>
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
        )}
      </div>

      {/* Time markers */}
      {review.timeMarkers?.length > 0 && (
        <div className="adm-rv-markers">
          {review.timeMarkers.map((m, i) => (
            <div key={i} className="adm-rv-marker">
              <span className="adm-rv-marker-time">⏱ {fmtSec(m.atSecond)}</span>
              <span style={{ color:'#4b5563' }}>—</span>
              <span style={{ color:'#6b7280', fontSize:'0.72rem' }}>{m.note}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="adm-rv-actions">
        {showReject && (
          <input
            className="adm-rv-action-reason"
            placeholder="Lý do từ chối (tuỳ chọn)…"
            value={reason}
            maxLength={500}
            onChange={e => setReason(e.target.value)}
          />
        )}

        {!showReject ? (
          <>
            <SpinBtn
              loading={processing}
              className="adm-btn adm-btn-approve"
              onClick={() => onApprove(review._id)}
              disabled={processing}>
              ✓ Duyệt
            </SpinBtn>
            <button
              className="adm-btn adm-btn-reject"
              onClick={() => setShowReject(true)}
              disabled={processing}>
              ✕ Từ chối
            </button>
          </>
        ) : (
          <>
            <button
              className="adm-btn adm-btn-reject"
              onClick={() => { onReject(review._id, reason); setShowReject(false); }}
              disabled={processing}>
              {processing ? <span className="adm-spinner" /> : '✕'} Xác nhận từ chối
            </button>
            <button
              className="adm-btn"
              style={{ background:'rgba(255,255,255,0.04)', color:'var(--text-dim)',
                border:'1px solid var(--border)' }}
              onClick={() => { setShowReject(false); setReason(''); }}
              disabled={processing}>
              Huỷ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewsTab({ pendingCount, showToast }) {
  const [reviews,     setReviews]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const LIMIT = 10;

  const fetchReviews = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get(`/reviews/pending?page=${page}&limit=${LIMIT}`);
      setReviews(data.reviews);
      setPagination(data.pagination);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/reviews/${id}/approve`);
      showToast('Review đã được duyệt, điểm Track đã cập nhật.', 'success');
      setReviews(prev => prev.filter(r => r._id !== id));
      setPagination(prev => prev ? { ...prev, total: prev.total - 1 } : prev);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Duyệt thất bại'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id, reason) => {
    setProcessingId(id);
    try {
      await api.patch(`/reviews/${id}/reject`, { reason });
      showToast('Review đã bị từ chối.', 'info');
      setReviews(prev => prev.filter(r => r._id !== id));
      setPagination(prev => prev ? { ...prev, total: prev.total - 1 } : prev);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Từ chối thất bại'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const pages = pagination ? Math.ceil(pagination.total / LIMIT) : 0;

  return (
    <div>
      <div className="adm-reviews-toolbar">
        <div className="adm-reviews-count">
          Có <strong>{pagination?.total ?? pendingCount ?? '…'}</strong> review đang chờ duyệt
        </div>
        <button className="adm-refresh-btn" onClick={fetchReviews}>
          ↺ Làm mới
        </button>
      </div>

      {error && <div className="adm-error">⚠ {error}</div>}

      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="adm-skeleton-row" style={{ height: 220 }}>
            <div className="adm-skel-line" style={{ width:'60%' }} />
            <div className="adm-skel-line" style={{ width:'40%' }} />
            <div className="adm-skel-line" style={{ width:'80%' }} />
          </div>
        ))
      ) : reviews.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">✅</div>
          <h3>Không có review nào chờ duyệt</h3>
          <p>Tất cả review đã được xử lý. Quay lại sau khi có review mới.</p>
        </div>
      ) : (
        reviews.map(rv => (
          <ReviewCard key={rv._id}
            review={rv}
            onApprove={handleApprove}
            onReject={handleReject}
            processingId={processingId}
          />
        ))
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="adm-pagination">
          <button className="adm-page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
          {Array.from({ length: pages }, (_, i) => i+1).map(p => (
            <button key={p} className={`adm-page-btn ${p===page?'active':''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="adm-page-btn" disabled={page===pages} onClick={() => setPage(p=>p+1)}>›</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB: Users
// ─────────────────────────────────────────────────────────────

function UsersTab({ showToast }) {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState(null);
  const [togglingId,  setTogglingId]  = useState(null);
  const [confirmUser, setConfirmUser] = useState(null); // {user, action}
  const searchTimer = useRef(null);
  const LIMIT = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (roleFilter)       params.set('role',   roleFilter);
      if (search.trim())    params.set('search', search.trim());
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => { setPage(1); }, [roleFilter, search]);

  const handleSearchChange = (v) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(v), 350);
  };

  const initiateToggle = (user) => {
    setConfirmUser({
      user,
      action: user.isActive ? 'lock' : 'unlock',
    });
  };

  const confirmToggle = async () => {
    if (!confirmUser) return;
    const { user } = confirmUser;
    setTogglingId(user.id);
    setConfirmUser(null);
    try {
      const { data } = await api.patch(`/admin/users/${user.id}/toggle`);
      showToast(data.message || 'Đã cập nhật trạng thái tài khoản', 'success');
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, isActive: !u.isActive } : u
      ));
    } catch (err) {
      showToast(extractErrorMessage(err, 'Thao tác thất bại'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const pages = pagination ? Math.ceil(pagination.total / LIMIT) : 0;

  return (
    <div>
      {/* Toolbar */}
      <div className="adm-users-toolbar">
        <div className="adm-search-wrap">
          <span className="adm-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm tên hoặc email…"
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="adm-role-filter">
          {[
            { v:'',         l:'Tất cả' },
            { v:'artist',   l:'Artist' },
            { v:'reviewer', l:'Reviewer' },
            { v:'admin',    l:'Admin' },
          ].map(f => (
            <button key={f.v}
              className={`adm-role-pill ${roleFilter===f.v?'active':''}`}
              onClick={() => setRoleFilter(f.v)}>
              {f.l}
            </button>
          ))}
        </div>
        <span style={{ fontSize:'0.78rem', color:'var(--text-dim)', marginLeft:'auto' }}>
          {pagination?.total ? `${fmtNum(pagination.total)} người dùng` : ''}
        </span>
      </div>

      {error && <div className="adm-error">⚠ {error}</div>}

      {/* Table */}
      {loading ? (
        Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="adm-skeleton-row" style={{ height:60 }}>
            <div className="adm-skel-line" style={{ width:'40%' }} />
          </div>
        ))
      ) : users.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">👥</div>
          <h3>Không tìm thấy người dùng</h3>
          <p>Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
        </div>
      ) : (
        <table className="adm-users-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Vai trò</th>
              <th>Thống kê</th>
              <th>Ngày tham gia</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => {
              const rc   = ROLE_CONFIG[user.role] || ROLE_CONFIG.artist;
              const isToggling = togglingId === user.id;
              return (
                <tr key={user.id}
                  className={`adm-user-row ${!user.isActive ? 'locked' : ''}`}
                  style={{ animationDelay:`${idx * 0.03}s` }}>
                  {/* User cell */}
                  <td>
                    <div className="adm-user-cell">
                      <div className="adm-user-avatar">
                        {user.avatarUrl
                          ? <img src={user.avatarUrl} alt="" />
                          : initials(user.name)}
                      </div>
                      <div>
                        <div className="adm-user-name">
                          {user.name}
                          {!user.isActive && (
                            <span className="adm-user-locked-badge">Đã khoá</span>
                          )}
                        </div>
                        <div className="adm-user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td>
                    <span className="adm-role-badge"
                      style={{ color: rc.color, background: rc.bg }}>
                      {rc.label}
                    </span>
                  </td>
                  {/* Stats */}
                  <td>
                    {user.role === 'reviewer' ? (
                      <span className="adm-stat-mini">
                        {user.totalReviews} rv · {user.reputationScore} pts
                      </span>
                    ) : user.role === 'artist' ? (
                      <span className="adm-stat-mini">—</span>
                    ) : (
                      <span className="adm-stat-mini" style={{ color:'var(--gold)', fontSize:'0.7rem' }}>
                        Admin
                      </span>
                    )}
                  </td>
                  {/* Date */}
                  <td>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.75rem', color:'#374151' }}>
                      {fmtDate(user.createdAt)}
                    </span>
                  </td>
                  {/* Action */}
                  <td>
                    <SpinBtn
                      loading={isToggling}
                      className={`adm-toggle-btn ${user.isActive ? 'lock' : 'unlock'}`}
                      onClick={() => initiateToggle(user)}
                      disabled={isToggling || user.role === 'admin'}>
                      {user.isActive ? '🔒 Khoá' : '🔓 Mở khoá'}
                    </SpinBtn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="adm-pagination">
          <button className="adm-page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const p = pages <= 7 ? i+1
              : page <= 4 ? i+1
              : page >= pages-3 ? pages-6+i
              : page-3+i;
            return (
              <button key={p} className={`adm-page-btn ${p===page?'active':''}`}
                onClick={() => setPage(p)}>{p}</button>
            );
          })}
          <button className="adm-page-btn" disabled={page===pages} onClick={() => setPage(p=>p+1)}>›</button>
        </div>
      )}

      {/* Confirm modal */}
      {confirmUser && (
        <div className="adm-overlay"
          onClick={e => { if(e.target===e.currentTarget) setConfirmUser(null); }}>
          <div className="adm-modal" style={{
            borderColor: confirmUser.action==='lock'
              ? 'rgba(249,115,22,0.25)' : 'rgba(52,211,153,0.25)',
          }}>
            <h3>
              {confirmUser.action === 'lock' ? '🔒 Khoá tài khoản?' : '🔓 Mở khoá tài khoản?'}
            </h3>
            <p>
              {confirmUser.action === 'lock'
                ? <>Tài khoản <strong style={{color:'var(--text)'}}>{confirmUser.user.name}</strong> sẽ bị khoá.
                   Người dùng sẽ không thể đăng nhập cho đến khi được mở khoá.</>
                : <>Tài khoản <strong style={{color:'var(--text)'}}>{confirmUser.user.name}</strong> sẽ được mở khoá
                   và có thể đăng nhập bình thường trở lại.</>
              }
            </p>
            <div className="adm-modal-actions">
              <button className="adm-modal-cancel" onClick={() => setConfirmUser(null)}>Huỷ</button>
              <button
                className={`adm-modal-confirm ${confirmUser.action==='lock' ? 'red' : 'gold'}`}
                onClick={confirmToggle}>
                {confirmUser.action === 'lock' ? 'Khoá tài khoản' : 'Mở khoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab,  setActiveTab]  = useState('overview');
  const [stats,      setStats]      = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast,      setToast]      = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type='success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchStats = useCallback(async (refresh=false) => {
    if (refresh) setRefreshing(true);
    else setStatsLoading(true);
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Không thể tải thống kê'), 'error');
    } finally {
      setStatsLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const pendingCount = stats?.stats?.pendingReviews || 0;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <>
      <style>{CSS}</style>

      <div className="adm-root">
        {/* Top bar */}
        <div className="adm-topbar">
          <div className="adm-topbar-left">
            <h1>{greeting}, Admin 👋</h1>
            <p>
              {now.toLocaleDateString('vi-VN', {
                weekday:'long', day:'numeric', month:'long', year:'numeric'
              })}
            </p>
          </div>
          <button
            className={`adm-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchStats(true)}
            disabled={refreshing}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {refreshing ? 'Đang làm mới…' : 'Làm mới'}
          </button>
        </div>

        {/* Tabs */}
        <div className="adm-tabs">
          {TABS.map(tab => (
            <button key={tab.id}
              className={`adm-tab ${activeTab===tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              <span>{tab.icon}</span>
              {tab.label}
              {tab.id==='reviews' && pendingCount > 0 && (
                <span className="adm-tab-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="adm-content">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} loading={statsLoading} />
          )}
          {activeTab === 'reviews' && (
            <ReviewsTab
              pendingCount={pendingCount}
              showToast={showToast}
            />
          )}
          {activeTab === 'users' && (
            <UsersTab showToast={showToast} />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`adm-toast ${toast.type}`}>
          <span>
            {toast.type==='success' ? '✓' :
             toast.type==='error'   ? '✕' : 'ℹ'}
          </span>
          {toast.msg}
        </div>
      )}
    </>
  );
}
