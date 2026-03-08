/**
 * RatingForm.jsx
 * Form chấm điểm 5 tiêu chí dành cho Reviewer — component độc lập.
 *
 * Props:
 *   trackId    {string}    - ID bài nhạc cần đánh giá (bắt buộc)
 *   onSubmit   {function}  - async (payload) => void — gọi API từ component cha
 *                            payload: { trackId, scores, comment, timeMarkers }
 *   onCancel   {function}  - Gọi khi nhấn huỷ (tuỳ chọn)
 *   disabled   {boolean}   - Khoá toàn bộ form (tuỳ chọn)
 *
 * Ví dụ dùng:
 *   <RatingForm
 *     trackId={track._id}
 *     onSubmit={async (payload) => {
 *       await api.post('/reviews', payload);
 *     }}
 *   />
 */

import { useState, useCallback, useId } from 'react';

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────

const CRITERIA = [
  {
    key:   'melody',
    label: 'Giai điệu',
    icon:  '🎵',
    desc:  'Sức hút và sự đáng nhớ của melody chính',
    color: '#a78bfa',
  },
  {
    key:   'lyrics',
    label: 'Lời nhạc',
    icon:  '✍️',
    desc:  'Chất lượng ca từ, ý nghĩa và cách dùng ngôn ngữ',
    color: '#60a5fa',
  },
  {
    key:   'harmony',
    label: 'Hòa âm',
    icon:  '🎼',
    desc:  'Độ phong phú và sự hài hòa của các hợp âm',
    color: '#34d399',
  },
  {
    key:   'rhythm',
    label: 'Nhịp điệu',
    icon:  '🥁',
    desc:  'Tính nhất quán, groove và cảm giác nhịp',
    color: '#fbbf24',
  },
  {
    key:   'production',
    label: 'Sản xuất',
    icon:  '🎛️',
    desc:  'Chất lượng âm thanh tổng thể: mix, master, arrangement',
    color: '#f97316',
  },
];

const SCORE_LABEL = [
  '', 'Rất kém', 'Kém', 'Dưới TB', 'Yếu', 'Trung bình',
  'Khá', 'Tốt', 'Rất tốt', 'Xuất sắc', 'Hoàn hảo',
];

const overallColor = (s) => {
  if (!s)   return '#374151';
  if (s >= 8) return '#34d399';
  if (s >= 6) return '#e2c97e';
  if (s >= 4) return '#fbbf24';
  return '#f87171';
};

// ─────────────────────────────────────────────────────────────
//  CSS
// ─────────────────────────────────────────────────────────────

const CSS = `
.rf-wrap {
  font-family: 'DM Sans', system-ui, sans-serif;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Section card ── */
.rf-card {
  background: #0f0f18;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  padding: 1.4rem 1.5rem;
  transition: border-color 0.2s;
}

/* ── Section heading ── */
.rf-section-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4b5563;
  margin-bottom: 1.25rem;
}
.rf-section-head::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.04);
}

/* ── Criteria grid ── */
.rf-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 580px) {
  .rf-grid { grid-template-columns: 1fr; }
}

/* ── Single criterion ── */
.rf-crit {
  background: #131320;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 14px;
  padding: 1.1rem;
  transition: border-color 0.2s;
}
.rf-crit.touched { border-color: rgba(255,255,255,0.09); }

.rf-crit-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.85rem;
  gap: 0.5rem;
}
.rf-crit-label-group { display: flex; align-items: center; gap: 0.45rem; }
.rf-crit-icon  { font-size: 1rem; line-height: 1; }
.rf-crit-label { font-size: 0.88rem; font-weight: 600; color: #9ca3af; }
.rf-crit-desc  { font-size: 0.68rem; color: #374151; margin-top: 3px; line-height: 1.4; }

/* Score display */
.rf-score-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
}
.rf-score-num {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  line-height: 1;
  font-weight: 600;
  transition: color 0.2s;
}
.rf-score-lbl {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: color 0.2s;
  text-align: right;
}

/* Slider */
.rf-slider-area { position: relative; padding-bottom: 1.3rem; }
.rf-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  display: block;
}
.rf-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: 2.5px solid #0a0a0f;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
  transition: transform 0.12s, box-shadow 0.12s;
}
.rf-slider:hover::-webkit-slider-thumb,
.rf-slider:focus::-webkit-slider-thumb {
  transform: scale(1.15);
  box-shadow: 0 3px 14px rgba(0,0,0,0.6);
}
.rf-slider:disabled { opacity: 0.4; cursor: not-allowed; }
.rf-slider:disabled::-webkit-slider-thumb { cursor: not-allowed; }

/* Tick row */
.rf-ticks {
  position: absolute;
  bottom: 0;
  left: 0; right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 1px;
}
.rf-tick {
  font-size: 0.58rem;
  font-family: 'JetBrains Mono', monospace;
  color: #1f2937;
  width: 14px;
  text-align: center;
  transition: color 0.15s;
  user-select: none;
}
.rf-tick.lit { color: #4b5563; }

/* ── Overall bar ── */
.rf-overall {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.1rem;
  background: #131320;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 12px;
  margin-top: 1rem;
}
.rf-overall-label { font-size: 0.75rem; color: #6b7280; font-weight: 600; white-space: nowrap; }
.rf-overall-track {
  flex: 1;
  height: 5px;
  background: rgba(255,255,255,0.06);
  border-radius: 3px;
  overflow: hidden;
}
.rf-overall-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.34,1.56,0.64,1), background 0.3s;
}
.rf-overall-num {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.35rem;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
  transition: color 0.3s;
}

/* ── Comment ── */
.rf-comment-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4b5563;
}
.rf-comment-count { letter-spacing: 0; text-transform: none; }
.rf-comment-count.warn { color: #c8a84b; }

.rf-textarea {
  width: 100%;
  background: #131320;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 0.875rem;
  line-height: 1.65;
  color: #e2e8f0;
  outline: none;
  resize: vertical;
  min-height: 120px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.rf-textarea::placeholder { color: #1f2937; }
.rf-textarea:focus {
  border-color: rgba(52,211,153,0.3);
  box-shadow: 0 0 0 3px rgba(52,211,153,0.06);
}
.rf-textarea.invalid { border-color: rgba(248,113,113,0.35); }
.rf-textarea:disabled { opacity:0.5; cursor:not-allowed; resize:none; }

/* ── Validation hints ── */
.rf-hints {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.2rem;
}
.rf-hint {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.74rem;
}
.rf-hint-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.2s;
}
.rf-hint-dot.ok      { background: #34d399; }
.rf-hint-dot.pending { background: rgba(255,255,255,0.1); }
.rf-hint-text { transition: color 0.2s; }
.rf-hint-text.ok      { color: #6b7280; }
.rf-hint-text.pending { color: #374151; }

/* ── Error banner ── */
.rf-error {
  padding: 0.65rem 0.9rem;
  background: rgba(248,113,113,0.07);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 10px;
  font-size: 0.8rem;
  color: #fca5a5;
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}

/* ── Submit row ── */
.rf-submit-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.rf-cancel-btn {
  padding: 0.6rem 1.1rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  color: #6b7280;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}
.rf-cancel-btn:hover { background: rgba(255,255,255,0.04); color: #9ca3af; }
.rf-cancel-btn:disabled { opacity:0.4; cursor:not-allowed; }

.rf-submit-btn {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.7rem 1.5rem;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #34d399, #059669);
  color: #0a0a0f;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(52,211,153,0.22);
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  white-space: nowrap;
}
.rf-submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(52,211,153,0.32);
}
.rf-submit-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none;
}

/* Spinner inside button */
.rf-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(10,10,15,0.25);
  border-top-color: #0a0a0f;
  border-radius: 50%;
  animation: rf-spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes rf-spin { to { transform: rotate(360deg); } }

/* Success state */
.rf-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 2.5rem 2rem;
  text-align: center;
  animation: rf-fadein 0.35s cubic-bezier(0.22,1,0.36,1);
}
@keyframes rf-fadein {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
.rf-success-check {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(52,211,153,0.12);
  border: 2px solid rgba(52,211,153,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem;
}
.rf-success h3 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.15rem;
  color: #e2e8f0;
}
.rf-success p  { font-size: 0.82rem; color: #6b7280; max-width: 280px; line-height: 1.6; }
`;

// ─────────────────────────────────────────────────────────────
//  Sub-component: single criterion slider
// ─────────────────────────────────────────────────────────────

function CriterionSlider({ crit, value, onChange, disabled }) {
  const { key, label, icon, desc, color } = crit;
  const touched = value > 0;
  const pct = touched ? ((value - 1) / 9) * 100 : 0;

  const trackBg = touched
    ? `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.06) ${pct}%, rgba(255,255,255,0.06) 100%)`
    : 'rgba(255,255,255,0.06)';

  return (
    <div className={`rf-crit ${touched ? 'touched' : ''}`}
      style={{ borderColor: touched ? `${color}18` : undefined }}>
      <div className="rf-crit-top">
        <div>
          <div className="rf-crit-label-group">
            <span className="rf-crit-icon" aria-hidden>{icon}</span>
            <span className="rf-crit-label">{label}</span>
          </div>
          <div className="rf-crit-desc">{desc}</div>
        </div>
        <div className="rf-score-display">
          <span className="rf-score-num" style={{ color: touched ? color : '#374151' }}>
            {touched ? value : '—'}
          </span>
          <span className="rf-score-lbl" style={{ color: touched ? color : '#1f2937' }}>
            {touched ? SCORE_LABEL[value] : 'Chưa chấm'}
          </span>
        </div>
      </div>

      <div className="rf-slider-area">
        <input
          type="range"
          className="rf-slider"
          min={1} max={10} step={1}
          value={touched ? value : 1}
          onChange={e => onChange(key, Number(e.target.value))}
          onMouseDown={() => { if (!touched) onChange(key, 5); }}
          onTouchStart={() => { if (!touched) onChange(key, 5); }}
          disabled={disabled}
          aria-label={`${label} — ${touched ? value : 'chưa chấm'}`}
          style={{ background: trackBg }}
        />
        <div className="rf-ticks" aria-hidden>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <span key={n} className={`rf-tick ${n <= (touched ? value : 0) ? 'lit' : ''}`}>
              {n}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────

export default function RatingForm({ trackId, onSubmit, onCancel, disabled = false }) {
  const uid = useId();

  const [scores, setScores] = useState({
    melody: 0, lyrics: 0, harmony: 0, rhythm: 0, production: 0,
  });
  const [comment,    setComment]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [submitted,  setSubmitted]  = useState(false);

  // Computed
  const allScored = CRITERIA.every(c => scores[c.key] > 0);
  const commentOk = comment.trim().length >= 20;
  const overall   = allScored
    ? CRITERIA.reduce((s, c) => s + scores[c.key], 0) / 5
    : 0;

  const canSubmit = allScored && commentOk && !submitting && !disabled;

  const handleScore = useCallback((key, val) => {
    setScores(prev => ({ ...prev, [key]: val }));
    setError('');
  }, []);

  const handleSubmit = async () => {
    setError('');

    if (!allScored) { setError('Vui lòng chấm điểm đầy đủ 5 tiêu chí.'); return; }
    if (!commentOk) { setError('Nhận xét cần có ít nhất 20 ký tự.'); return; }
    if (!trackId)   { setError('Thiếu trackId — kiểm tra lại props.'); return; }

    setSubmitting(true);
    try {
      await onSubmit?.({
        trackId,
        scores: {
          melody:     scores.melody,
          lyrics:     scores.lyrics,
          harmony:    scores.harmony,
          rhythm:     scores.rhythm,
          production: scores.production,
        },
        comment: comment.trim(),
        timeMarkers: [], // RatingForm không quản lý time markers — dùng ReviewerWorkspace
      });
      setSubmitted(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gửi đánh giá thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────

  if (submitted) {
    return (
      <>
        <style>{CSS}</style>
        <div className="rf-wrap">
          <div className="rf-card">
            <div className="rf-success">
              <div className="rf-success-check">✓</div>
              <h3>Đánh giá đã được gửi!</h3>
              <p>
                Review của bạn đang chờ Admin duyệt.
                Sau khi được duyệt, điểm của bài nhạc sẽ được cập nhật
                và bạn nhận được +5 điểm uy tín.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Form ──────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>

      <div className="rf-wrap" role="form" aria-label="Form chấm điểm bài nhạc">

        {/* ── Criteria section ── */}
        <div className="rf-card">
          <div className="rf-section-head">
            <span aria-hidden>⭐</span> Chấm điểm 5 tiêu chí
          </div>

          <div className="rf-grid">
            {CRITERIA.map(c => (
              <CriterionSlider
                key={c.key}
                crit={c}
                value={scores[c.key]}
                onChange={handleScore}
                disabled={submitting || disabled}
              />
            ))}
          </div>

          {/* Overall */}
          <div className="rf-overall" aria-live="polite">
            <span className="rf-overall-label">Điểm trung bình</span>
            <div className="rf-overall-track" role="progressbar"
              aria-valuenow={overall} aria-valuemin={0} aria-valuemax={10}>
              <div className="rf-overall-fill" style={{
                width:      allScored ? `${(overall / 10) * 100}%` : '0%',
                background: overallColor(overall),
              }} />
            </div>
            <span className="rf-overall-num" style={{ color: overallColor(overall) }}>
              {allScored ? overall.toFixed(1) : '—'}
            </span>
          </div>
        </div>

        {/* ── Comment section ── */}
        <div className="rf-card">
          <div className="rf-comment-meta">
            <label htmlFor={`${uid}-comment`}>
              <span aria-hidden>💬</span>{' '}Nhận xét tổng thể
            </label>
            <span className={`rf-comment-count ${comment.length > 1800 ? 'warn' : ''}`}>
              {comment.length} / 2000
            </span>
          </div>

          <textarea
            id={`${uid}-comment`}
            className={`rf-textarea ${error && !commentOk ? 'invalid' : ''}`}
            placeholder="Chia sẻ nhận xét chi tiết — điểm mạnh, điểm cần cải thiện, cảm nhận tổng thể về bài nhạc… (tối thiểu 20 ký tự)"
            value={comment}
            maxLength={2000}
            onChange={e => { setComment(e.target.value); setError(''); }}
            disabled={submitting || disabled}
            aria-required="true"
            aria-describedby={`${uid}-hints`}
          />

          {/* Checklist hints */}
          <div id={`${uid}-hints`} className="rf-hints" style={{ marginTop: '0.75rem' }}>
            {[
              { ok: allScored, text: 'Đã chấm đủ 5 tiêu chí' },
              { ok: commentOk, text: `Nhận xét ≥ 20 ký tự (hiện tại: ${comment.trim().length})` },
            ].map(({ ok, text }) => (
              <div key={text} className="rf-hint">
                <div className={`rf-hint-dot ${ok ? 'ok' : 'pending'}`} aria-hidden />
                <span className={`rf-hint-text ${ok ? 'ok' : 'pending'}`}>{text}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="rf-error" role="alert" style={{ marginTop: '0.75rem' }}>
              <span aria-hidden>⚠</span> {error}
            </div>
          )}
        </div>

        {/* ── Submit ── */}
        <div className="rf-submit-row">
          {onCancel && (
            <button
              type="button"
              className="rf-cancel-btn"
              onClick={onCancel}
              disabled={submitting}>
              Huỷ
            </button>
          )}
          <button
            type="button"
            className="rf-submit-btn"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-busy={submitting}>
            {submitting
              ? <><div className="rf-spinner" aria-hidden /> Đang gửi…</>
              : '✓ Gửi đánh giá'}
          </button>
        </div>
      </div>
    </>
  );
}
