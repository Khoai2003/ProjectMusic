/**
 * MusicPlayer.jsx
 * Trình phát nhạc độc lập — dùng được ở bất kỳ đâu trong app.
 *
 * Props:
 *   audioUrl   {string}           - URL file nhạc (bắt buộc)
 *   title      {string}           - Tên bài nhạc (tuỳ chọn)
 *   artist     {string}           - Tên artist (tuỳ chọn)
 *   coverUrl   {string}           - Ảnh bìa (tuỳ chọn)
 *   compact    {boolean}          - Chế độ thu gọn không có cover (mặc định: false)
 *   autoPlay   {boolean}          - Tự phát khi mount (mặc định: false)
 *   onTimeUpdate {function}       - Callback (currentTime, duration) mỗi tick
 *
 * Ví dụ dùng:
 *   <MusicPlayer audioUrl={track.audioUrl} title={track.title} artist={artist.name} />
 *   <MusicPlayer audioUrl={url} compact />
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

const fmtTime = (sec) => {
  if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// Seeded waveform heights — deterministic từ URL để mỗi bài có dạng sóng riêng
const generateBars = (seed = '', count = 60) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bars = [];
  let prev = 0.5;
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const v = Math.max(0.1, Math.min(1, prev * 0.55 + (h / 0xffffffff) * 0.45));
    bars.push(v);
    prev = v;
  }
  return bars;
};

// ─────────────────────────────────────────────────────────────
//  CSS (scoped via class prefix mp-)
// ─────────────────────────────────────────────────────────────

const CSS = `
.mp-wrap {
  background: #0f0f18;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  overflow: hidden;
  font-family: 'DM Sans', system-ui, sans-serif;
  color: #e2e8f0;
  user-select: none;
  transition: border-color 0.2s;
}
.mp-wrap:hover { border-color: rgba(255,255,255,0.1); }

/* ── Full mode layout ── */
.mp-full { padding: 1.25rem 1.35rem 1.1rem; }
.mp-compact { padding: 0.75rem 1rem; }

/* Cover + info row */
.mp-top {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.1rem;
}
.mp-cover {
  width: 52px; height: 52px;
  border-radius: 10px;
  background: #18182a;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem;
  color: #374151;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
  position: relative;
}
.mp-cover img { width:100%; height:100%; object-fit:cover; border-radius:10px; }
.mp-cover-vinyl {
  position: absolute; inset: 0;
  border-radius: 10px;
  background: repeating-radial-gradient(
    circle at 50% 50%,
    transparent 0px,
    transparent 3px,
    rgba(0,0,0,0.15) 3px,
    rgba(0,0,0,0.15) 4px
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s;
}
.mp-cover-vinyl.spinning { opacity: 1; animation: mp-vinyl 4s linear infinite; }
@keyframes mp-vinyl { to { transform: rotate(360deg); } }

.mp-info { flex:1; min-width:0; }
.mp-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
  color: #e2e8f0;
}
.mp-artist { font-size: 0.75rem; color: #6b7280; }

/* State badge */
.mp-state {
  font-size: 0.65rem;
  padding: 0.12rem 0.5rem;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.mp-state.playing { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
.mp-state.paused  { background: rgba(255,255,255,0.04); color: #4b5563; border: 1px solid rgba(255,255,255,0.06); }
.mp-state.loading { background: rgba(226,201,126,0.08); color: #c8a84b; border: 1px solid rgba(226,201,126,0.15); }

/* ── Waveform ── */
.mp-waveform {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  border-radius: 8px;
  padding: 2px 0;
  margin-bottom: 0.65rem;
  position: relative;
  overflow: visible;
}
.mp-wbar {
  flex: 1;
  border-radius: 2px;
  min-height: 3px;
  transition: background 0.08s;
}
/* Compact: no waveform, just slim progress */

/* ── Slim progress (compact mode) ── */
.mp-progress-track {
  position: relative;
  height: 4px;
  background: rgba(255,255,255,0.07);
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 0.55rem;
  overflow: hidden;
}
.mp-progress-fill {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  border-radius: 4px;
  background: linear-gradient(90deg, #34d399, #059669);
  pointer-events: none;
  transition: width 0.1s linear;
}
.mp-progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px; height: 12px;
  border-radius: 50%;
  background: white;
  border: 2px solid #0a0a0f;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
}
.mp-progress-track:hover .mp-progress-thumb { opacity: 1; }

/* ── Controls row ── */
.mp-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.mp-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem;
  transition: color 0.15s, background 0.15s;
  padding: 0;
  flex-shrink: 0;
}
.mp-btn:hover { color: #9ca3af; background: rgba(255,255,255,0.05); }
.mp-btn:disabled { opacity:0.3; cursor:default; }

.mp-play-btn {
  width: 40px; height: 40px;
  border-radius: 50%;
  font-size: 1rem;
  background: #34d399;
  color: #0a0a0f;
  border: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 18px rgba(52,211,153,0.25);
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  flex-shrink: 0;
  padding: 0;
}
.mp-play-btn:hover:not(:disabled) {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(52,211,153,0.35);
}
.mp-play-btn:disabled { background: rgba(52,211,153,0.25); cursor:not-allowed; transform:none; }
.mp-play-btn.loading { background: rgba(52,211,153,0.3); }

/* Time */
.mp-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  letter-spacing: 0.02em;
}
.mp-time-current { color: #9ca3af; }

/* Spacer */
.mp-spacer { flex: 1; }

/* Volume */
.mp-vol-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.mp-vol-icon {
  font-size: 0.85rem;
  color: #4b5563;
  cursor: pointer;
  transition: color 0.15s;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}
.mp-vol-icon:hover { color: #6b7280; }
.mp-vol-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 64px; height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,0.08);
  outline: none;
  cursor: pointer;
}
.mp-vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 11px; height: 11px;
  border-radius: 50%;
  background: #9ca3af;
  cursor: pointer;
  transition: background 0.15s;
}
.mp-vol-slider:hover::-webkit-slider-thumb { background: #34d399; }

/* Spinner */
.mp-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(10,10,15,0.2);
  border-top-color: #0a0a0f;
  border-radius: 50%;
  animation: mp-spin 0.7s linear infinite;
}
@keyframes mp-spin { to { transform: rotate(360deg); } }

/* Error state */
.mp-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: rgba(248,113,113,0.06);
  border: 1px solid rgba(248,113,113,0.15);
  border-radius: 10px;
  font-size: 0.78rem;
  color: #fca5a5;
  margin-top: 0.75rem;
}

/* No url state */
.mp-no-url {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  text-align: center;
  color: #374151;
  font-size: 0.82rem;
}
.mp-no-url-icon { font-size: 1.75rem; opacity: 0.2; }
`;

// ─────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────

export default function MusicPlayer({
  audioUrl,
  title    = 'Bài nhạc',
  artist   = '',
  coverUrl = '',
  compact  = false,
  autoPlay = false,
  onTimeUpdate,
}) {
  const audioRef   = useRef(null);
  const rafRef     = useRef(null);
  const barsRef    = useRef(generateBars(audioUrl));

  const [playing,  setPlaying]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume,   setVolume]   = useState(0.8);
  const [muted,    setMuted]    = useState(false);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  // ── Build Audio element when URL changes ──────────────────

  useEffect(() => {
    if (!audioUrl) return;

    setPlaying(false);
    setLoading(true);
    setError('');
    setCurrent(0);
    setDuration(0);
    barsRef.current = generateBars(audioUrl);

    cancelAnimationFrame(rafRef.current);

    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = volume;
    audio.preload = 'metadata';

    const onMeta  = () => { setDuration(audio.duration || 0); setLoading(false); };
    const onEnded = () => { setPlaying(false); setCurrent(0); };
    const onError = () => { setLoading(false); setError('Không thể tải file âm thanh.'); };

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('error',          onError);
    audio.src = audioUrl;

    if (autoPlay) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended',          onEnded);
      audio.removeEventListener('error',          onError);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // ── RAF loop for progress ─────────────────────────────────

  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        setCurrent(audio.currentTime);
        onTimeUpdate?.(audio.currentTime, audio.duration || 0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, onTimeUpdate]);

  // ── Controls ──────────────────────────────────────────────

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || loading) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        setLoading(true);
        await audio.play();
        setPlaying(true);
      } catch { setError('Trình duyệt chặn tự động phát.'); }
      finally { setLoading(false); }
    }
  }, [playing, loading]);

  const handleSeek = useCallback((e, trackEl) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = trackEl.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrent(audio.currentTime);
  }, [duration]);

  const skip = useCallback((sec) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + sec));
    setCurrent(audio.currentTime);
  }, [duration]);

  const handleVolume = useCallback((v) => {
    if (audioRef.current) audioRef.current.volume = v;
    setVolume(v);
    setMuted(v === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) { audio.volume = volume || 0.8; setMuted(false); }
    else        { audio.volume = 0;             setMuted(true);  }
  }, [muted, volume]);

  // ── Waveform click-to-seek ────────────────────────────────

  const waveRef = useRef(null);
  const handleWaveClick = useCallback((e) => {
    if (waveRef.current) handleSeek(e, waveRef.current);
  }, [handleSeek]);

  const progressTrackRef = useRef(null);
  const handleProgressClick = useCallback((e) => {
    if (progressTrackRef.current) handleSeek(e, progressTrackRef.current);
  }, [handleSeek]);

  // ── No URL ────────────────────────────────────────────────

  if (!audioUrl) {
    return (
      <>
        <style>{CSS}</style>
        <div className="mp-wrap mp-full">
          <div className="mp-no-url">
            <div className="mp-no-url-icon">🎵</div>
            <span>Chưa có file nhạc</span>
          </div>
        </div>
      </>
    );
  }

  const volIcon = muted || volume === 0 ? '🔇' : volume > 0.5 ? '🔊' : '🔉';
  const stateLabel = loading ? 'loading' : playing ? 'playing' : 'paused';
  const bars = barsRef.current;

  return (
    <>
      <style>{CSS}</style>

      <div className={`mp-wrap ${compact ? 'mp-compact' : 'mp-full'}`}>

        {/* ── Cover + info (full mode only) ── */}
        {!compact && (
          <div className="mp-top">
            <div className="mp-cover">
              {coverUrl
                ? <img src={coverUrl} alt={title} loading="lazy" />
                : '♪'}
              <div className={`mp-cover-vinyl ${playing ? 'spinning' : ''}`} />
            </div>

            <div className="mp-info">
              <div className="mp-title" title={title}>{title}</div>
              {artist && <div className="mp-artist">{artist}</div>}
            </div>

            <span className={`mp-state ${stateLabel}`}>
              {loading ? '···' : playing ? 'Playing' : 'Paused'}
            </span>
          </div>
        )}

        {/* ── Waveform (full mode) ── */}
        {!compact && (
          <div className="mp-waveform" ref={waveRef} onClick={handleWaveClick}>
            {bars.map((h, i) => {
              const played = (i / bars.length) * 100 <= progress;
              return (
                <div key={i} className="mp-wbar" style={{
                  height: `${Math.max(8, h * 40)}px`,
                  background: played
                    ? `rgba(52,211,153,${0.4 + h * 0.6})`
                    : `rgba(255,255,255,${0.04 + h * 0.07})`,
                }} />
              );
            })}
          </div>
        )}

        {/* ── Slim progress bar (compact mode) ── */}
        {compact && (
          <div className="mp-progress-track" ref={progressTrackRef}
            onClick={handleProgressClick}>
            <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
            <div className="mp-progress-thumb" style={{ left: `${progress}%` }} />
          </div>
        )}

        {/* ── Controls ── */}
        <div className="mp-controls">
          {/* Skip back */}
          <button className="mp-btn" onClick={() => skip(-10)}
            disabled={!duration} title="Tua lại 10s"
            aria-label="Tua lại 10 giây">
            ↩
          </button>

          {/* Play / Pause */}
          <button
            className={`mp-play-btn ${loading ? 'loading' : ''}`}
            onClick={togglePlay}
            disabled={loading && !playing}
            aria-label={playing ? 'Dừng' : 'Phát'}>
            {loading && !playing
              ? <div className="mp-spinner" />
              : playing ? '⏸' : '▶'}
          </button>

          {/* Skip forward */}
          <button className="mp-btn" onClick={() => skip(10)}
            disabled={!duration} title="Tua tới 10s"
            aria-label="Tua tới 10 giây">
            ↪
          </button>

          {/* Time */}
          <span className="mp-time">
            <span className="mp-time-current">{fmtTime(current)}</span>
            {' / '}
            {fmtTime(duration)}
          </span>

          <div className="mp-spacer" />

          {/* Volume */}
          <div className="mp-vol-wrap">
            <span className="mp-vol-icon" onClick={toggleMute} role="button"
              aria-label={muted ? 'Bỏ tắt tiếng' : 'Tắt tiếng'}>
              {volIcon}
            </span>
            <input
              type="range" className="mp-vol-slider"
              min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={e => handleVolume(Number(e.target.value))}
              aria-label="Âm lượng"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mp-error" role="alert">
            <span>⚠</span> {error}
          </div>
        )}
      </div>
    </>
  );
}
