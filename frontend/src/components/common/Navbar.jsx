/**
 * Navbar.jsx
 * Thanh điều hướng chính — hiển thị theo role, có avatar, badge uy tín và nút đăng xuất.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ────────────────────────────────────────────────

const ROLE_CONFIG = {
  artist:   { label: 'Artist',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  reviewer: { label: 'Reviewer', color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  admin:    { label: 'Admin',    color: '#e2c97e', bg: 'rgba(226,201,126,0.12)' },
};

const NAV_LINKS = {
  artist:   [{ to: '/dashboard/artist',   label: 'Kho nhạc' },
             { to: '/dashboard/upload',   label: 'Upload' }],
  reviewer: [{ to: '/dashboard/reviewer', label: 'Workspace' }],
  admin:    [{ to: '/dashboard/admin',    label: 'Dashboard' }],
};

// Lấy chữ cái đầu để làm avatar placeholder
const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

// ─── Component ────────────────────────────────────────────────

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const role       = user?.role || 'artist';
  const roleConf   = ROLE_CONFIG[role];
  const navLinks   = NAV_LINKS[role] || [];

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (to) => location.pathname === to ||
    (to !== '/dashboard' && location.pathname.startsWith(to));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .sj-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          background: rgba(10, 10, 15, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(226,201,126,0.1);
          font-family: 'DM Sans', sans-serif;
          box-sizing: border-box;
        }

        /* Logo */
        .sj-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          flex-shrink: 0;
        }
        .sj-logo-icon {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #e2c97e, #c8a84b);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .sj-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.2rem;
          color: #e2c97e;
          letter-spacing: 0.02em;
        }

        /* Nav links */
        .sj-nav-links {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .sj-nav-link {
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          transition: color 0.2s, background 0.2s;
          position: relative;
          white-space: nowrap;
        }
        .sj-nav-link:hover   { color: #e2e8f0; background: rgba(255,255,255,0.05); }
        .sj-nav-link.active  { color: #e2c97e; background: rgba(226,201,126,0.08); }

        /* Right side */
        .sj-nav-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        /* Role badge */
        .sj-role-badge {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
        }

        /* Reputation (reviewer only) */
        .sj-rep {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
          color: #6b7280;
        }
        .sj-rep-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #34d399;
          animation: pulse-green 2s ease-in-out infinite;
        }
        @keyframes pulse-green {
          0%,100% { opacity: 1; } 50% { opacity: 0.4; }
        }

        /* Avatar dropdown */
        .sj-avatar-wrap {
          position: relative;
        }
        .sj-avatar-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.3rem 0.5rem;
          border-radius: 10px;
          transition: background 0.2s;
        }
        .sj-avatar-btn:hover { background: rgba(255,255,255,0.06); }

        .sj-avatar {
          width: 34px; height: 34px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid rgba(226,201,126,0.3);
        }
        .sj-avatar-placeholder {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2d2d3a, #1f1f2e);
          border: 1.5px solid rgba(226,201,126,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem;
          font-weight: 600;
          color: #e2c97e;
          letter-spacing: 0.05em;
        }
        .sj-avatar-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: #d1d5db;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sj-avatar-chevron {
          color: #4b5563;
          font-size: 0.65rem;
          transition: transform 0.2s;
        }
        .sj-avatar-chevron.open { transform: rotate(180deg); }

        /* Dropdown menu */
        .sj-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 220px;
          background: #12121a;
          border: 1px solid rgba(226,201,126,0.12);
          border-radius: 14px;
          padding: 0.5rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7);
          animation: fadeDown 0.15s ease;
          overflow: hidden;
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sj-dropdown-header {
          padding: 0.6rem 0.75rem 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 0.4rem;
        }
        .sj-dropdown-user {
          font-size: 0.875rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sj-dropdown-email {
          font-size: 0.73rem;
          color: #4b5563;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sj-dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.55rem 0.75rem;
          font-size: 0.83rem;
          color: #9ca3af;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .sj-dropdown-item:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }
        .sj-dropdown-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 0.3rem 0;
        }
        .sj-dropdown-item.logout { color: #f87171; }
        .sj-dropdown-item.logout:hover { background: rgba(248,113,113,0.08); color: #fca5a5; }

        /* Mobile hamburger */
        .sj-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
        }
        .sj-hamburger span {
          display: block;
          width: 22px; height: 2px;
          background: #9ca3af;
          border-radius: 2px;
          transition: all 0.2s;
        }

        @media (max-width: 640px) {
          .sj-nav-links { display: none; }
          .sj-hamburger { display: flex; }
          .sj-avatar-name { display: none; }
          .sj-rep { display: none; }
        }
      `}</style>

      <nav className="sj-nav">
        {/* Logo */}
        <Link to="/dashboard" className="sj-logo">
          <div className="sj-logo-icon">♪</div>
          <span className="sj-logo-text">SoundJudge</span>
        </Link>

        {/* Nav links */}
        <ul className="sj-nav-links">
          {navLinks.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className={`sj-nav-link ${isActive(to) ? 'active' : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right section */}
        <div className="sj-nav-right">
          {/* Reputation score cho reviewer */}
          {role === 'reviewer' && user?.reputationScore !== undefined && (
            <div className="sj-rep">
              <div className="sj-rep-dot" />
              <span>{user.reputationScore} pts</span>
            </div>
          )}

          {/* Role badge */}
          <span
            className="sj-role-badge"
            style={{ color: roleConf.color, background: roleConf.bg }}
          >
            {roleConf.label}
          </span>

          {/* Avatar + dropdown */}
          <div className="sj-avatar-wrap" ref={menuRef}>
            <button
              className="sj-avatar-btn"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu tài khoản"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="sj-avatar" />
              ) : (
                <div className="sj-avatar-placeholder">{getInitials(user?.name)}</div>
              )}
              <span className="sj-avatar-name">{user?.name}</span>
              <span className={`sj-avatar-chevron ${menuOpen ? 'open' : ''}`}>▼</span>
            </button>

            {menuOpen && (
              <div className="sj-dropdown">
                <div className="sj-dropdown-header">
                  <div className="sj-dropdown-user">{user?.name}</div>
                  <div className="sj-dropdown-email">{user?.email}</div>
                </div>

                {navLinks.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="sj-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>→</span> {label}
                  </Link>
                ))}

                <div className="sj-dropdown-divider" />

                <button className="sj-dropdown-item logout" onClick={handleLogout}>
                  <span>↩</span> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
