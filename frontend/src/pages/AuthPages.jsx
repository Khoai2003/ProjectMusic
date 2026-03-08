/**
 * AuthPages.jsx
 * Trang Đăng nhập và Đăng ký — dark luxury aesthetic.
 *
 * Export:
 *   LoginPage    — POST /api/auth/login
 *   RegisterPage — POST /api/auth/register
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Shared CSS ───────────────────────────────────────────────

const SHARED_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --gold:        #e2c97e;
  --gold-dim:    #c8a84b;
  --gold-glow:   rgba(226,201,126,0.15);
  --bg:          #0a0a0f;
  --surface:     #111118;
  --surface2:    #16161f;
  --border:      rgba(226,201,126,0.1);
  --border-soft: rgba(255,255,255,0.06);
  --text:        #e2e8f0;
  --text-dim:    #6b7280;
  --text-soft:   #9ca3af;
  --error:       #f87171;
  --success:     #34d399;
  --radius:      14px;
}

.auth-root {
  min-height: 100vh;
  background: var(--bg);
  font-family: 'DM Sans', sans-serif;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

/* ── Left decorative panel ──────────────────────── */
.auth-panel {
  position: relative;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3rem;
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.auth-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 30% 40%, rgba(226,201,126,0.06) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 70% 70%, rgba(167,139,250,0.04) 0%, transparent 60%);
}

.auth-panel-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  position: relative;
  z-index: 1;
}
.auth-panel-icon {
  width: 38px; height: 38px;
  background: linear-gradient(135deg, var(--gold), var(--gold-dim));
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 20px rgba(226,201,126,0.25);
}
.auth-panel-brand {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  color: var(--gold);
}

.auth-panel-body {
  position: relative;
  z-index: 1;
}
.auth-panel-heading {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 3vw, 2.8rem);
  color: var(--text);
  line-height: 1.2;
  margin-bottom: 1.25rem;
}
.auth-panel-heading em {
  font-style: italic;
  color: var(--gold);
}
.auth-panel-desc {
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.7;
  max-width: 340px;
}

.auth-panel-stats {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 2rem;
}
.auth-panel-stat-num {
  font-family: 'Playfair Display', serif;
  font-size: 1.6rem;
  color: var(--gold);
  display: block;
}
.auth-panel-stat-label {
  font-size: 0.72rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: block;
  margin-top: 2px;
}

/* Decorative lines */
.auth-panel-lines {
  position: absolute;
  bottom: 0; right: 0;
  width: 280px; height: 280px;
  opacity: 0.06;
  pointer-events: none;
}

/* ── Right form section ─────────────────────────── */
.auth-form-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2.5rem;
  overflow-y: auto;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  animation: authCardIn 0.4s cubic-bezier(0.22,1,0.36,1);
}
@keyframes authCardIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.auth-card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  color: var(--text);
  margin-bottom: 0.4rem;
}
.auth-card-sub {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-bottom: 2rem;
}
.auth-card-sub a {
  color: var(--gold);
  text-decoration: none;
  font-weight: 500;
}
.auth-card-sub a:hover { text-decoration: underline; }

/* ── Form ───────────────────────────────────────── */
.auth-form { display: flex; flex-direction: column; gap: 1rem; }

.auth-field { display: flex; flex-direction: column; gap: 0.4rem; }

.auth-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-soft);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.auth-input-wrap { position: relative; }

.auth-input {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.auth-input::placeholder { color: #374151; }
.auth-input:focus {
  border-color: rgba(226,201,126,0.4);
  box-shadow: 0 0 0 3px rgba(226,201,126,0.08);
}
.auth-input.has-error {
  border-color: rgba(248,113,113,0.4);
  box-shadow: 0 0 0 3px rgba(248,113,113,0.06);
}

.auth-input-toggle {
  position: absolute;
  right: 0.85rem; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  cursor: pointer;
  color: var(--text-dim);
  font-size: 1rem;
  line-height: 1;
  padding: 4px;
  transition: color 0.15s;
}
.auth-input-toggle:hover { color: var(--text); }

/* Role selector */
.auth-role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-top: 0.1rem;
}
.auth-role-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.8rem 1rem;
  background: var(--surface2);
  border: 1.5px solid var(--border-soft);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'DM Sans', sans-serif;
  text-align: left;
}
.auth-role-btn:hover { border-color: rgba(226,201,126,0.2); }
.auth-role-btn.selected {
  border-color: var(--gold);
  background: var(--gold-glow);
}
.auth-role-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-soft);
  transition: color 0.15s;
}
.auth-role-btn.selected .auth-role-name { color: var(--gold); }
.auth-role-desc {
  font-size: 0.72rem;
  color: var(--text-dim);
  line-height: 1.4;
}

/* Error banner */
.auth-error-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.7rem 0.9rem;
  background: rgba(248,113,113,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 10px;
  font-size: 0.82rem;
  color: #fca5a5;
  animation: errorIn 0.2s ease;
}
@keyframes errorIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Submit button */
.auth-submit {
  margin-top: 0.5rem;
  width: 100%;
  padding: 0.85rem 1rem;
  background: linear-gradient(135deg, var(--gold), var(--gold-dim));
  border: none;
  border-radius: var(--radius);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0a0a0f;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(226,201,126,0.2);
  position: relative;
  overflow: hidden;
}
.auth-submit:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(226,201,126,0.3);
}
.auth-submit:active:not(:disabled) { transform: translateY(0); }
.auth-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.auth-submit-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Mini spinner inside button */
.auth-btn-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(10,10,15,0.2);
  border-top-color: #0a0a0f;
  border-radius: 50%;
  animation: pr-spin 0.7s linear infinite;
}
@keyframes pr-spin { to { transform: rotate(360deg); } }

/* Divider */
.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.25rem 0;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-soft);
}
.auth-divider-text {
  font-size: 0.72rem;
  color: var(--text-dim);
  white-space: nowrap;
}

/* Responsive */
@media (max-width: 768px) {
  .auth-root { grid-template-columns: 1fr; }
  .auth-panel { display: none; }
  .auth-form-section { padding: 2rem 1.5rem; min-height: 100vh; }
}
`;

// ─── Shared auth layout ────────────────────────────────────────

function AuthLayout({ children }) {
  return (
    <>
      <style>{SHARED_CSS}</style>
      <div className="auth-root">
        {/* Left decorative panel */}
        <div className="auth-panel">
          <div className="auth-panel-logo">
            <div className="auth-panel-icon">♪</div>
            <span className="auth-panel-brand">SoundJudge</span>
          </div>

          <div className="auth-panel-body">
            <h1 className="auth-panel-heading">
              Nền tảng<br />
              <em>thẩm định</em><br />
              âm nhạc
            </h1>
            <p className="auth-panel-desc">
              Kết nối Artist với những Reviewer chuyên nghiệp.
              Đánh giá định lượng theo 5 tiêu chí: Giai điệu,
              Lời, Hòa âm, Nhịp điệu, Sản xuất.
            </p>
          </div>

          <div className="auth-panel-stats">
            <div>
              <span className="auth-panel-stat-num">5</span>
              <span className="auth-panel-stat-label">Tiêu chí</span>
            </div>
            <div>
              <span className="auth-panel-stat-num">3</span>
              <span className="auth-panel-stat-label">Vai trò</span>
            </div>
            <div>
              <span className="auth-panel-stat-num">API</span>
              <span className="auth-panel-stat-label">First</span>
            </div>
          </div>

          {/* Decorative SVG */}
          <svg className="auth-panel-lines" viewBox="0 0 280 280" fill="none">
            <circle cx="200" cy="200" r="120" stroke="#e2c97e" strokeWidth="1"/>
            <circle cx="200" cy="200" r="80"  stroke="#e2c97e" strokeWidth="1"/>
            <circle cx="200" cy="200" r="40"  stroke="#e2c97e" strokeWidth="1"/>
            <line x1="80" y1="200" x2="320" y2="200" stroke="#e2c97e" strokeWidth="1"/>
            <line x1="200" y1="80" x2="200" y2="320" stroke="#e2c97e" strokeWidth="1"/>
          </svg>
        </div>

        {/* Right form area */}
        <div className="auth-form-section">
          {children}
        </div>
      </div>
    </>
  );
}

// ─── Input component ───────────────────────────────────────────

function AuthInput({ label, type = 'text', id, value, onChange, placeholder, error, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <input
          id={id}
          type={inputType}
          className={`auth-input ${error ? 'has-error' : ''}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-input-toggle"
            onClick={() => setShow(s => !s)}
            tabIndex={-1}
            aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {show ? '🙈' : '👁'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ────────────────────────────────────────────────

export function LoginPage() {
  const { login, authError, clearAuthError, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  // Nếu đã đăng nhập → redirect về dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role;
      const redirect = sessionStorage.getItem('redirectAfterLogin');
      sessionStorage.removeItem('redirectAfterLogin');
      if (redirect && redirect !== '/login' && redirect !== '/register') {
        navigate(redirect, { replace: true });
      } else {
        navigate(`/dashboard/${role}`, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Xoá lỗi khi gõ
  const handleChange = (setter) => (e) => {
    clearAuthError();
    setter(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      const redirect = sessionStorage.getItem('redirectAfterLogin');
      sessionStorage.removeItem('redirectAfterLogin');
      if (redirect && redirect !== '/login') {
        navigate(redirect, { replace: true });
      } else {
        navigate(`/dashboard/${loggedUser.role}`, { replace: true });
      }
    } catch {
      // authError đã được set bởi AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2 className="auth-card-title">Đăng nhập</h2>
        <p className="auth-card-sub">
          Chưa có tài khoản?{' '}
          <Link to="/register">Đăng ký ngay</Link>
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {authError && (
            <div className="auth-error-banner">
              <span>⚠</span>
              <span>{authError}</span>
            </div>
          )}

          <AuthInput
            label="Email"
            type="email"
            id="login-email"
            value={email}
            onChange={handleChange(setEmail)}
            placeholder="ten@example.com"
            autoComplete="email"
          />

          <AuthInput
            label="Mật khẩu"
            type="password"
            id="login-password"
            value={password}
            onChange={handleChange(setPassword)}
            placeholder="Ít nhất 6 ký tự"
            autoComplete="current-password"
          />

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !email.trim() || !password}
          >
            <span className="auth-submit-inner">
              {loading ? (
                <><div className="auth-btn-spinner" /> Đang đăng nhập…</>
              ) : (
                'Đăng nhập'
              )}
            </span>
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

// ─── REGISTER PAGE ─────────────────────────────────────────────

const ROLE_OPTIONS = [
  {
    value: 'artist',
    name: '🎵 Artist',
    desc: 'Upload nhạc và nhận phản hồi chuyên sâu từ reviewer.',
  },
  {
    value: 'reviewer',
    name: '🎧 Reviewer',
    desc: 'Đánh giá bài nhạc và xây dựng điểm uy tín.',
  },
];

export function RegisterPage() {
  const { register, authError, clearAuthError, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [role,     setRole]     = useState('artist');
  const [loading,  setLoading]  = useState(false);
  const [localError, setLocalError] = useState('');

  // Nếu đã đăng nhập → redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/dashboard/${user.role}`, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const clearErrors = () => {
    clearAuthError();
    setLocalError('');
  };

  const handleChange = (setter) => (e) => {
    clearErrors();
    setter(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    // Client-side validation
    if (!name.trim() || name.trim().length < 2) {
      return setLocalError('Tên phải có ít nhất 2 ký tự');
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return setLocalError('Email không đúng định dạng');
    }
    if (password.length < 6) {
      return setLocalError('Mật khẩu phải có ít nhất 6 ký tự');
    }
    if (password !== confirm) {
      return setLocalError('Mật khẩu xác nhận không khớp');
    }

    setLoading(true);
    try {
      const newUser = await register(name.trim(), email, password, role);
      navigate(`/dashboard/${newUser.role}`, { replace: true });
    } catch {
      // authError đã được set bởi AuthContext
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;
  const isValid = name.trim().length >= 2 && email && password.length >= 6 && confirm;

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2 className="auth-card-title">Tạo tài khoản</h2>
        <p className="auth-card-sub">
          Đã có tài khoản?{' '}
          <Link to="/login">Đăng nhập</Link>
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {displayError && (
            <div className="auth-error-banner">
              <span>⚠</span>
              <span>{displayError}</span>
            </div>
          )}

          <AuthInput
            label="Họ và tên"
            type="text"
            id="reg-name"
            value={name}
            onChange={handleChange(setName)}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
          />

          <AuthInput
            label="Email"
            type="email"
            id="reg-email"
            value={email}
            onChange={handleChange(setEmail)}
            placeholder="ten@example.com"
            autoComplete="email"
          />

          <AuthInput
            label="Mật khẩu"
            type="password"
            id="reg-password"
            value={password}
            onChange={handleChange(setPassword)}
            placeholder="Ít nhất 6 ký tự"
            autoComplete="new-password"
          />

          <AuthInput
            label="Xác nhận mật khẩu"
            type="password"
            id="reg-confirm"
            value={confirm}
            onChange={handleChange(setConfirm)}
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            error={confirm && password !== confirm}
          />

          {/* Role selector */}
          <div className="auth-field">
            <span className="auth-label">Vai trò của bạn</span>
            <div className="auth-role-grid">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`auth-role-btn ${role === opt.value ? 'selected' : ''}`}
                  onClick={() => { clearErrors(); setRole(opt.value); }}
                >
                  <span className="auth-role-name">{opt.name}</span>
                  <span className="auth-role-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !isValid}
          >
            <span className="auth-submit-inner">
              {loading ? (
                <><div className="auth-btn-spinner" /> Đang đăng ký…</>
              ) : (
                'Tạo tài khoản'
              )}
            </span>
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
