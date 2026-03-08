/**
 * ProtectedRoute.jsx
 * Bọc các route cần xác thực và/hoặc kiểm tra role.
 *
 * Props:
 *   children  {ReactNode}   - Component con cần bảo vệ
 *   roles     {string[]}    - Danh sách role được phép, bỏ trống = cho mọi role đã đăng nhập
 *   redirect  {string}      - Đường dẫn khi không có quyền (mặc định '/login')
 *
 * Hành vi:
 *   - Đang loading + chưa có cache user  → Spinner toàn màn hình
 *   - Chưa đăng nhập                     → Navigate tới /login (lưu redirectAfterLogin)
 *   - Sai role                           → Navigate tới dashboard đúng role
 *   - Đủ điều kiện                       → Render children
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Map role → trang dashboard tương ứng
const ROLE_HOME = {
  artist:   '/dashboard/artist',
  reviewer: '/dashboard/reviewer',
  admin:    '/dashboard/admin',
};

export default function ProtectedRoute({ children, roles = [], redirect = '/login' }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // ── 1. Đang xác minh token, chưa có cache ────────────────
  if (loading && !user) {
    return <LoadingScreen />;
  }

  // ── 2. Chưa đăng nhập ─────────────────────────────────────
  if (!isAuthenticated && !loading) {
    // Lưu lại trang định truy cập để redirect sau khi login
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to={redirect} replace />;
  }

  // ── 3. Chờ loading nhưng đã có user cache → cho qua tạm thời
  //    (AuthContext sẽ xác minh ngầm và redirect nếu cần)
  if (!user) {
    return <LoadingScreen />;
  }

  // ── 4. Kiểm tra role ──────────────────────────────────────
  if (roles.length > 0 && !roles.includes(user.role)) {
    const home = ROLE_HOME[user.role] || '/dashboard';
    return <Navigate to={home} replace />;
  }

  // ── 5. Đủ điều kiện → render nội dung ────────────────────
  return children;
}

// ─── Loading screen nội bộ ────────────────────────────────────

function LoadingScreen() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400&display=swap');

        .pr-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #0a0a0f;
          gap: 1.25rem;
          font-family: 'DM Sans', sans-serif;
        }

        .pr-spinner {
          position: relative;
          width: 44px;
          height: 44px;
        }
        .pr-spinner::before,
        .pr-spinner::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2.5px solid transparent;
        }
        .pr-spinner::before {
          border-top-color: #e2c97e;
          animation: pr-spin 0.9s linear infinite;
        }
        .pr-spinner::after {
          border-bottom-color: rgba(226,201,126,0.2);
          animation: pr-spin 0.9s linear infinite reverse;
          inset: 6px;
        }
        @keyframes pr-spin {
          to { transform: rotate(360deg); }
        }

        .pr-loading-text {
          font-size: 0.8rem;
          color: #374151;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          animation: pr-fade 1.5s ease-in-out infinite;
        }
        @keyframes pr-fade {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
      `}</style>

      <div className="pr-loading">
        <div className="pr-spinner" />
        <span className="pr-loading-text">Đang xác thực…</span>
      </div>
    </>
  );
}
