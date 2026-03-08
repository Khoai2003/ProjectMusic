/**
 * UploadTrack.jsx
 * Form upload bài nhạc — drag-drop audio, preview ảnh bìa, genre, tags.
 * API: POST /api/tracks  (multipart/form-data)
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { extractErrorMessage } from '../../api/axiosConfig';

// ─── Constants ────────────────────────────────────────────────

const GENRES = [
  { value: 'pop',        label: 'Pop'        },
  { value: 'rock',       label: 'Rock'       },
  { value: 'jazz',       label: 'Jazz'       },
  { value: 'classical',  label: 'Classical'  },
  { value: 'hiphop',     label: 'Hip-hop'    },
  { value: 'electronic', label: 'Electronic' },
  { value: 'folk',       label: 'Folk'       },
  { value: 'other',      label: 'Khác'       },
];

const AUDIO_ACCEPT = '.mp3,.wav,.flac,.aac,audio/*';
const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,image/*';
const MAX_AUDIO_MB = 50;
const MAX_IMAGE_MB = 5;

// ─── CSS ──────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

.ut-root {
  min-height: 100vh;
  background: #0a0a0f;
  font-family: 'DM Sans', sans-serif;
  color: #e2e8f0;
  padding: 2.5rem 2rem 5rem;
}

.ut-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #4b5563;
  text-decoration: none;
  margin-bottom: 2rem;
  transition: color 0.15s;
}
.ut-back:hover { color: #e2c97e; }

.ut-header { margin-bottom: 2.5rem; }
.ut-header h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  color: #e2e8f0;
  margin-bottom: 0.25rem;
}
.ut-header p { font-size: 0.85rem; color: #6b7280; }

/* ── Layout ── */
.ut-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 2rem;
  max-width: 1000px;
}
@media(max-width:768px){
  .ut-layout { grid-template-columns: 1fr; }
}

/* ── Section label ── */
.ut-section {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}
.ut-section-title {
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
.ut-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.04);
}

/* ── Drop zone ── */
.ut-dropzone {
  position: relative;
  border: 2px dashed rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 2.5rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #0d0d14;
  overflow: hidden;
}
.ut-dropzone:hover,
.ut-dropzone.drag-over {
  border-color: rgba(226,201,126,0.4);
  background: rgba(226,201,126,0.03);
}
.ut-dropzone input[type=file] {
  position: absolute; inset:0;
  opacity:0; cursor:pointer;
  width:100%; height:100%;
}
.ut-dropzone-icon { font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.5; }
.ut-dropzone-text { font-size: 0.9rem; color: #6b7280; margin-bottom: 0.3rem; }
.ut-dropzone-sub  { font-size: 0.75rem; color: #374151; }
.ut-dropzone strong { color: #e2c97e; }

/* Audio file info */
.ut-audio-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(226,201,126,0.05);
  border: 1px solid rgba(226,201,126,0.15);
  border-radius: 12px;
  animation: fadeUp 0.2s ease;
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(6px); }
  to   { opacity:1; transform:translateY(0); }
}
.ut-audio-icon {
  width: 42px; height: 42px;
  border-radius: 10px;
  background: rgba(226,201,126,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}
.ut-audio-name { font-size: 0.88rem; color: #e2e8f0; font-weight: 500; margin-bottom: 2px; word-break: break-all; }
.ut-audio-size { font-size: 0.72rem; color: #4b5563; }
.ut-audio-remove {
  margin-left: auto;
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.08);
  background: none;
  color: #4b5563;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.ut-audio-remove:hover { border-color: rgba(248,113,113,0.3); color: #f87171; }

/* ── Form fields ── */
.ut-field { margin-bottom: 1rem; }
.ut-field:last-child { margin-bottom: 0; }
.ut-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 0.45rem;
}
.ut-input, .ut-textarea, .ut-select {
  width: 100%;
  background: #0d0d14;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
  color: #e2e8f0;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.ut-input::placeholder, .ut-textarea::placeholder { color: #1f2937; }
.ut-textarea { resize: vertical; min-height: 90px; }
.ut-select { appearance: none; cursor: pointer; }
.ut-select-wrap { position: relative; }
.ut-select-wrap::after {
  content: '▾';
  position: absolute;
  right: 0.9rem; top: 50%;
  transform: translateY(-50%);
  color: #4b5563;
  pointer-events: none;
  font-size: 0.8rem;
}
.ut-input:focus, .ut-textarea:focus, .ut-select:focus {
  border-color: rgba(226,201,126,0.35);
  box-shadow: 0 0 0 3px rgba(226,201,126,0.07);
}
.ut-input.error { border-color: rgba(248,113,113,0.4); }

/* character count */
.ut-char-count {
  text-align: right;
  font-size: 0.7rem;
  color: #1f2937;
  margin-top: 0.3rem;
}
.ut-char-count.warn { color: #fbbf24; }

/* ── Genre grid ── */
.ut-genre-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}
@media(max-width:500px){ .ut-genre-grid { grid-template-columns: repeat(2,1fr); } }

.ut-genre-btn {
  padding: 0.5rem 0.5rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.07);
  background: #0d0d14;
  color: #4b5563;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}
.ut-genre-btn:hover { border-color: rgba(226,201,126,0.2); color: #9ca3af; }
.ut-genre-btn.selected {
  border-color: #e2c97e;
  background: rgba(226,201,126,0.08);
  color: #e2c97e;
  font-weight: 600;
}

/* ── Tags ── */
.ut-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-height: 42px;
  padding: 0.5rem 0.75rem;
  background: #0d0d14;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  cursor: text;
  transition: border-color 0.2s;
  align-items: center;
}
.ut-tags-wrap:focus-within { border-color: rgba(226,201,126,0.35); }
.ut-tag {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  background: rgba(226,201,126,0.1);
  border: 1px solid rgba(226,201,126,0.2);
  font-size: 0.75rem;
  color: #e2c97e;
  animation: tagIn 0.15s ease;
}
@keyframes tagIn { from{opacity:0;transform:scale(0.85);} to{opacity:1;transform:scale(1);} }
.ut-tag-remove {
  background: none; border: none;
  color: #c8a84b; cursor: pointer;
  font-size: 0.75rem; padding: 0;
  line-height: 1;
  display: flex; align-items: center;
}
.ut-tag-remove:hover { color: #f87171; }
.ut-tag-input {
  flex: 1; min-width: 80px;
  background: none; border: none;
  outline: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.82rem;
  color: #e2e8f0;
}
.ut-tag-input::placeholder { color: #1f2937; }
.ut-tags-hint { font-size: 0.7rem; color: #1f2937; margin-top: 0.3rem; }

/* ── Right panel: Cover + Preview ── */
.ut-right-col {}

/* Cover upload */
.ut-cover-drop {
  position: relative;
  border: 2px dashed rgba(255,255,255,0.08);
  border-radius: 14px;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  background: #0d0d14;
  transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.ut-cover-drop:hover,
.ut-cover-drop.drag-over {
  border-color: rgba(226,201,126,0.3);
  background: rgba(226,201,126,0.02);
}
.ut-cover-drop input[type=file] {
  position: absolute; inset:0;
  opacity:0; cursor:pointer;
  width:100%; height:100%;
}
.ut-cover-placeholder {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0.5rem;
  text-align: center;
  padding: 1.5rem;
}
.ut-cover-placeholder-icon { font-size: 2rem; opacity: 0.25; }
.ut-cover-placeholder-text { font-size: 0.8rem; color: #374151; }
.ut-cover-preview {
  position: absolute; inset: 0;
  object-fit: cover;
  width: 100%; height: 100%;
}
.ut-cover-overlay {
  position: absolute; inset: 0;
  background: rgba(10,10,15,0.5);
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.ut-cover-drop:hover .ut-cover-overlay { opacity: 1; }
.ut-cover-overlay-text {
  font-size: 0.78rem;
  color: #e2e8f0;
  background: rgba(10,10,15,0.7);
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
}
.ut-cover-hint { font-size: 0.7rem; color: #374151; text-align: center; margin-top: 0.5rem; }

/* Preview card */
.ut-preview-card {
  background: #0d0d14;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px;
  overflow: hidden;
  margin-top: 1.25rem;
}
.ut-preview-cover {
  height: 140px;
  background: linear-gradient(135deg,#16161f,#1f1f2e);
  display: flex; align-items: center; justify-content: center;
  font-size: 3rem; opacity: 0.2;
  overflow: hidden;
}
.ut-preview-cover img { width:100%; height:100%; object-fit:cover; opacity:1; }
.ut-preview-body { padding: 0.85rem 1rem; }
.ut-preview-title {
  font-family: 'Playfair Display', serif;
  font-size: 0.95rem;
  color: #9ca3af;
  margin-bottom: 0.3rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ut-preview-title.has-val { color: #e2e8f0; }
.ut-preview-meta { display:flex; gap:0.4rem; flex-wrap:wrap; }
.ut-preview-tag {
  font-size: 0.68rem;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  background: rgba(226,201,126,0.08);
  color: #c8a84b;
}

/* ── Progress bar ── */
.ut-progress-wrap {
  margin: 1rem 0;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  overflow: hidden;
  height: 6px;
}
.ut-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #e2c97e, #c8a84b);
  border-radius: 6px;
  transition: width 0.2s ease;
}

/* ── Submit button ── */
.ut-submit {
  width: 100%;
  padding: 0.9rem;
  background: linear-gradient(135deg, #e2c97e, #c8a84b);
  border: none;
  border-radius: 14px;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #0a0a0f;
  cursor: pointer;
  letter-spacing: 0.02em;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(226,201,126,0.2);
  margin-top: 1.25rem;
}
.ut-submit:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(226,201,126,0.3);
}
.ut-submit:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

/* ── Error / Success banner ── */
.ut-banner {
  padding: 0.8rem 1rem;
  border-radius: 12px;
  font-size: 0.83rem;
  display: flex; align-items: flex-start; gap: 0.5rem;
  margin-bottom: 1.25rem;
  animation: fadeUp 0.2s ease;
}
.ut-banner.error   { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); color:#fca5a5; }
.ut-banner.success { background:rgba(52,211,153,0.08);  border:1px solid rgba(52,211,153,0.2);  color:#34d399; }

/* spinner */
.ut-spinner {
  width:16px; height:16px;
  border:2px solid rgba(10,10,15,0.2);
  border-top-color:#0a0a0f;
  border-radius:50%;
  animation:spin .7s linear infinite;
}
@keyframes spin { to{transform:rotate(360deg)} }
`;

// ─── Helper ───────────────────────────────────────────────────

const fmtBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Component ────────────────────────────────────────────────

export default function UploadTrack() {
  const navigate = useNavigate();

  // form state
  const [title,       setTitle]       = useState('');
  const [genre,       setGenre]       = useState('other');
  const [description, setDescription] = useState('');
  const [tagInput,    setTagInput]    = useState('');
  const [tags,        setTags]        = useState([]);

  // file state
  const [audioFile,  setAudioFile]  = useState(null);
  const [coverFile,  setCoverFile]  = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  // ui state
  const [audioDrag,  setAudioDrag]  = useState(false);
  const [coverDrag,  setCoverDrag]  = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // ── File handlers ──────────────────────────────────────────

  const validateAudio = (file) => {
    if (!file) return 'Vui lòng chọn file âm thanh';
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/mp3'];
    const isAudio = allowedTypes.includes(file.type) || file.type.startsWith('audio/');
    if (!isAudio) return 'Chỉ chấp nhận MP3, WAV, FLAC, AAC';
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) return `File quá lớn (tối đa ${MAX_AUDIO_MB}MB)`;
    return null;
  };

  const validateImage = (file) => {
    if (!file.type.startsWith('image/')) return 'Chỉ chấp nhận ảnh JPG, PNG, WEBP';
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `Ảnh quá lớn (tối đa ${MAX_IMAGE_MB}MB)`;
    return null;
  };

  const handleAudioChange = (file) => {
    if (!file) return;
    const err = validateAudio(file);
    if (err) { setError(err); return; }
    setError('');
    setAudioFile(file);
  };

  const handleCoverChange = (file) => {
    if (!file) return;
    const err = validateImage(file);
    if (err) { setError(err); return; }
    setError('');
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeAudio = () => setAudioFile(null);
  const removeCover = () => { setCoverFile(null); setCoverPreview(''); };

  // ── Tag handlers ───────────────────────────────────────────

  const addTag = (val) => {
    const cleaned = val.trim().toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u0400-\u04FF\u00C0-\u017E\u4e00-\u9fa5\u0080-\u00ff -]/gi, '');
    if (!cleaned || tags.includes(cleaned) || tags.length >= 10) return;
    setTags(t => [...t, cleaned]);
  };

  const handleTagKeyDown = (e) => {
    if (['Enter', ',', ' '].includes(e.key)) {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(t => t.slice(0, -1));
    }
  };

  const removeTag = (t) => setTags(prev => prev.filter(x => x !== t));

  // ── Drag & Drop helpers ────────────────────────────────────

  const makeDragProps = (setDragOver, onDrop) => ({
    onDragEnter: (e) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: (e) => { e.preventDefault(); setDragOver(false); },
    onDragOver:  (e) => { e.preventDefault(); },
    onDrop: (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onDrop(file);
    },
  });

  const audioDragProps = makeDragProps(setAudioDrag, handleAudioChange);
  const coverDragProps = makeDragProps(setCoverDrag, handleCoverChange);

  // ── Submit ─────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) return setError('Tên bài nhạc không được để trống');
    if (!audioFile)    return setError('Vui lòng chọn file âm thanh');

    const formData = new FormData();
    formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);
    formData.append('title', title.trim());
    formData.append('genre', genre);
    if (description.trim()) formData.append('description', description.trim());
    if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

    setUploading(true);
    setProgress(0);

    try {
      await api.post('/tracks', formData, {
        onUploadProgress: (ev) => {
          if (ev.total) {
            setProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        },
      });
      setSuccess('Upload thành công! Bài nhạc đang chờ reviewer đánh giá.');
      setTimeout(() => navigate('/dashboard/artist'), 2000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Upload thất bại, vui lòng thử lại'));
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const isValid = title.trim() && audioFile;

  return (
    <>
      <style>{CSS}</style>

      <div className="ut-root">
        <Link to="/dashboard/artist" className="ut-back">← Quay lại kho nhạc</Link>

        <div className="ut-header">
          <h1>Upload bài nhạc</h1>
          <p>Điền thông tin và tải lên file để bắt đầu nhận đánh giá</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ut-layout">
            {/* ── Left column ─────────────────────────────── */}
            <div>
              {/* Error / Success */}
              {error   && <div className="ut-banner error">  <span>⚠</span> {error}</div>}
              {success && <div className="ut-banner success"><span>✓</span> {success}</div>}

              {/* Audio upload */}
              <div className="ut-section">
                <div className="ut-section-title">
                  <span>🎵</span> File âm thanh *
                </div>

                {!audioFile ? (
                  <div
                    className={`ut-dropzone ${audioDrag ? 'drag-over' : ''}`}
                    {...audioDragProps}
                  >
                    <input
                      type="file"
                      accept={AUDIO_ACCEPT}
                      onChange={e => handleAudioChange(e.target.files[0])}
                      tabIndex={-1}
                    />
                    <div className="ut-dropzone-icon">🎧</div>
                    <div className="ut-dropzone-text">
                      Kéo thả file hoặc <strong>nhấn để chọn</strong>
                    </div>
                    <div className="ut-dropzone-sub">
                      MP3, WAV, FLAC, AAC — tối đa {MAX_AUDIO_MB}MB
                    </div>
                  </div>
                ) : (
                  <div className="ut-audio-info">
                    <div className="ut-audio-icon">🎵</div>
                    <div>
                      <div className="ut-audio-name">{audioFile.name}</div>
                      <div className="ut-audio-size">{fmtBytes(audioFile.size)}</div>
                    </div>
                    <button type="button" className="ut-audio-remove" onClick={removeAudio}
                      title="Xóa file">✕</button>
                  </div>
                )}

                {uploading && (
                  <div className="ut-progress-wrap" style={{ marginTop:'0.75rem' }}>
                    <div className="ut-progress-bar" style={{ width:`${progress}%` }} />
                  </div>
                )}
              </div>

              {/* Basic info */}
              <div className="ut-section">
                <div className="ut-section-title">
                  <span>✏️</span> Thông tin bài nhạc
                </div>

                <div className="ut-field">
                  <label className="ut-label">Tên bài nhạc *</label>
                  <input
                    type="text"
                    className={`ut-input ${!title.trim() && error ? 'error' : ''}`}
                    placeholder="VD: Mưa Tháng Sáu"
                    value={title}
                    maxLength={100}
                    onChange={e => setTitle(e.target.value)}
                  />
                  <div className={`ut-char-count ${title.length > 80 ? 'warn' : ''}`}>
                    {title.length}/100
                  </div>
                </div>

                <div className="ut-field">
                  <label className="ut-label">Thể loại</label>
                  <div className="ut-genre-grid">
                    {GENRES.map(g => (
                      <button key={g.value} type="button"
                        className={`ut-genre-btn ${genre === g.value ? 'selected' : ''}`}
                        onClick={() => setGenre(g.value)}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ut-field">
                  <label className="ut-label">Mô tả</label>
                  <textarea
                    className="ut-textarea"
                    placeholder="Chia sẻ về câu chuyện hoặc ý tưởng đằng sau bài nhạc…"
                    value={description}
                    maxLength={500}
                    onChange={e => setDescription(e.target.value)}
                  />
                  <div className={`ut-char-count ${description.length > 420 ? 'warn' : ''}`}>
                    {description.length}/500
                  </div>
                </div>

                <div className="ut-field">
                  <label className="ut-label">Tags</label>
                  <div className="ut-tags-wrap"
                    onClick={() => document.getElementById('tag-input').focus()}>
                    {tags.map(t => (
                      <span key={t} className="ut-tag">
                        #{t}
                        <button type="button" className="ut-tag-remove"
                          onClick={(e) => { e.stopPropagation(); removeTag(t); }}>
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      id="tag-input"
                      className="ut-tag-input"
                      placeholder={tags.length === 0 ? 'acoustic, ballad, guitar… (Enter để thêm)' : ''}
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput(''); } }}
                      disabled={tags.length >= 10}
                    />
                  </div>
                  <div className="ut-tags-hint">
                    {tags.length}/10 tags — nhấn Enter, dấu phẩy hoặc Space để thêm
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right column ─────────────────────────────── */}
            <div className="ut-right-col">
              <div className="ut-section">
                <div className="ut-section-title">
                  <span>🖼</span> Ảnh bìa
                </div>

                <div
                  className={`ut-cover-drop ${coverDrag ? 'drag-over' : ''}`}
                  {...coverDragProps}
                >
                  <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    onChange={e => handleCoverChange(e.target.files[0])}
                  />
                  {coverPreview ? (
                    <>
                      <img src={coverPreview} alt="cover preview" className="ut-cover-preview" />
                      <div className="ut-cover-overlay">
                        <span className="ut-cover-overlay-text">Đổi ảnh</span>
                      </div>
                    </>
                  ) : (
                    <div className="ut-cover-placeholder">
                      <div className="ut-cover-placeholder-icon">🖼</div>
                      <div className="ut-cover-placeholder-text">
                        Kéo thả ảnh<br />hoặc nhấn để chọn
                      </div>
                    </div>
                  )}
                </div>

                {coverFile && (
                  <button type="button"
                    onClick={removeCover}
                    style={{
                      width:'100%', marginTop:'0.5rem',
                      padding:'0.35rem',
                      background:'none',
                      border:'1px solid rgba(255,255,255,0.06)',
                      borderRadius:'8px',
                      color:'#4b5563',
                      fontFamily:"'DM Sans',sans-serif",
                      fontSize:'0.75rem',
                      cursor:'pointer',
                      transition:'all 0.15s',
                    }}
                    onMouseEnter={e => { e.target.style.color='#f87171'; e.target.style.borderColor='rgba(248,113,113,0.2)'; }}
                    onMouseLeave={e => { e.target.style.color='#4b5563'; e.target.style.borderColor='rgba(255,255,255,0.06)'; }}
                  >
                    Xóa ảnh bìa
                  </button>
                )}

                <p className="ut-cover-hint">
                  JPG, PNG, WEBP · Tối đa {MAX_IMAGE_MB}MB<br />
                  Khuyến nghị: 800×800px
                </p>
              </div>

              {/* Preview card */}
              <div style={{ marginTop:'-0.25rem' }}>
                <div style={{ fontSize:'0.7rem', color:'#1f2937', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.6rem' }}>
                  Preview card
                </div>
                <div className="ut-preview-card">
                  <div className="ut-preview-cover">
                    {coverPreview
                      ? <img src={coverPreview} alt="" />
                      : '♪'}
                  </div>
                  <div className="ut-preview-body">
                    <div className={`ut-preview-title ${title ? 'has-val' : ''}`}>
                      {title || 'Tên bài nhạc…'}
                    </div>
                    <div className="ut-preview-meta">
                      <span className="ut-preview-tag">{GENRES.find(g => g.value === genre)?.label}</span>
                      {tags.slice(0,3).map(t => (
                        <span key={t} className="ut-preview-tag">#{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="ut-submit"
                disabled={uploading || !isValid}
              >
                {uploading ? (
                  <>
                    <div className="ut-spinner" />
                    Đang upload {progress > 0 ? `${progress}%` : '…'}
                  </>
                ) : (
                  '☁ Upload bài nhạc'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
