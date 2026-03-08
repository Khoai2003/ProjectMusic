/**
 * axiosConfig.js
 * ─────────────────────────────────────────────────────────────
 * Instance Axios dùng chung toàn bộ frontend SoundJudge.
 *
 * Chức năng chính:
 *   1. baseURL '/api'  →  Vite proxy tự chuyển sang http://localhost:5000/api
 *   2. Request interceptor  → tự động đính Bearer token vào mọi request
 *   3. Response interceptor → xử lý lỗi tập trung (401, 403, 500...)
 *   4. Hàm tiện ích setAuthToken / clearAuthToken để AuthContext gọi
 *
 * Cách dùng trong các component / hook khác:
 *   import api from '../api/axiosConfig';
 *   const { data } = await api.get('/tracks');
 *   const { data } = await api.post('/auth/login', { email, password });
 * ─────────────────────────────────────────────────────────────
 */

import axios from 'axios';

// ─────────────────────────────────────────────────────────────
//  HẰNG SỐ
// ─────────────────────────────────────────────────────────────

/** Key lưu JWT trong localStorage */
export const TOKEN_KEY = 'soundjudge_token';

/** Key lưu thông tin user (cache, tránh gọi /auth/me mỗi lần reload) */
export const USER_KEY = 'soundjudge_user';

/**
 * Thời gian timeout mỗi request.
 * Upload file nhạc (50MB) cần timeout dài hơn các request thông thường.
 */
const DEFAULT_TIMEOUT = 15_000;   // 15 giây — API thông thường
const UPLOAD_TIMEOUT  = 120_000;  // 2 phút  — upload audio/ảnh lên Cloudinary


// ─────────────────────────────────────────────────────────────
//  TẠO AXIOS INSTANCE
// ─────────────────────────────────────────────────────────────

const api = axios.create({
  /**
   * baseURL = '/api'
   * Vite dev server (vite.config.js) đã cấu hình proxy:
   *   '/api' → 'http://localhost:5000'
   * Khi build production, cần đặt biến môi trường VITE_API_URL
   * hoặc cấu hình reverse proxy (Nginx...) tương tự.
   */
  baseURL: '/api',

  /** Mọi request JSON đều cần header này */
  headers: {
    'Content-Type': 'application/json',
  },

  timeout: DEFAULT_TIMEOUT,

  /**
   * withCredentials: false — dự án dùng JWT trong header, không dùng cookie
   * Nếu sau này chuyển sang httpOnly cookie thì đổi thành true
   */
  withCredentials: false,
});


// ─────────────────────────────────────────────────────────────
//  HÀM TIỆN ÍCH QUẢN LÝ TOKEN
// ─────────────────────────────────────────────────────────────

/**
 * getStoredToken()
 * Đọc JWT từ localStorage.
 * Trả về null nếu không có.
 */
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

/**
 * setAuthToken(token)
 * Lưu JWT vào localStorage VÀ đặt luôn vào default headers của instance.
 * AuthContext gọi hàm này ngay sau khi đăng nhập / đăng ký thành công.
 *
 * @param {string} token - JWT nhận được từ backend
 */
export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

/**
 * clearAuthToken()
 * Xoá JWT khỏi localStorage VÀ xoá khỏi default headers.
 * AuthContext gọi hàm này khi đăng xuất hoặc token hết hạn.
 */
export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  delete api.defaults.headers.common['Authorization'];
};

/**
 * Khởi tạo: nếu đã có token trong localStorage (user reload trang)
 * → đặt lại vào default headers ngay khi file này được import lần đầu.
 * Nhờ đó, mọi request được gửi đi trước khi AuthContext useEffect chạy
 * xong cũng đã mang token (tránh race condition khi render lần đầu).
 */
const existingToken = getStoredToken();
if (existingToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
}


// ─────────────────────────────────────────────────────────────
//  REQUEST INTERCEPTOR
// ─────────────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    /**
     * Đảm bảo token luôn mới nhất cho mỗi request.
     * Trường hợp cần thiết: nếu có tab khác đăng nhập lại và ghi token mới
     * vào localStorage, interceptor này sẽ lấy đúng token đó thay vì
     * dùng token cũ đã gán lúc app khởi động.
     */
    const token = getStoredToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    /**
     * Upload file (multipart/form-data):
     * - Xoá Content-Type để browser/axios tự thêm boundary đúng chuẩn.
     *   Nếu để 'application/json' thì server sẽ không parse được form-data.
     * - Tăng timeout lên 2 phút vì upload audio 50MB có thể mất nhiều thời gian.
     */
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      config.timeout = UPLOAD_TIMEOUT;
    }

    return config;
  },
  (error) => {
    // Lỗi xảy ra trước khi request được gửi đi (vd: network không khả dụng)
    console.error('[Axios] Request setup error:', error);
    return Promise.reject(error);
  }
);


// ─────────────────────────────────────────────────────────────
//  RESPONSE INTERCEPTOR
// ─────────────────────────────────────────────────────────────

/**
 * Flag chống vòng lặp redirect:
 * Nếu đang xử lý logout do 401, không trigger thêm redirect nào nữa.
 */
let isHandling401 = false;

api.interceptors.response.use(
  /**
   * Xử lý RESPONSE THÀNH CÔNG (status 2xx)
   * Trả về response nguyên vẹn để các component tự destructure theo ý muốn.
   */
  (response) => response,

  /**
   * Xử lý RESPONSE LỖI (status 4xx, 5xx hoặc network error)
   */
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message;

    // ── 401 Unauthorized ──────────────────────────────────
    // Token hết hạn, bị đổi mật khẩu, hoặc không hợp lệ
    if (status === 401 && !isHandling401) {
      isHandling401 = true;

      clearAuthToken();

      /**
       * Không dùng navigate() của React Router ở đây vì interceptor
       * nằm ngoài component tree. Dùng window.location để đảm bảo
       * state của app được reset hoàn toàn (tương đương hard redirect).
       *
       * Lưu lại URL hiện tại để sau khi đăng nhập lại có thể quay về.
       */
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        // Lưu trang đang xem để redirect lại sau khi login
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        window.location.href = '/login';
      }

      // Reset flag sau 3 giây đề phòng user quay lại trang
      setTimeout(() => { isHandling401 = false; }, 3000);
    }

    // ── 403 Forbidden ─────────────────────────────────────
    // User đã đăng nhập nhưng không có quyền (vd: artist vào trang admin)
    if (status === 403) {
      console.warn('[Axios] 403 Forbidden:', message || error.config?.url);
      // Không redirect — để component hiện thị thông báo lỗi phù hợp
    }

    // ── 500+ Server Error ──────────────────────────────────
    if (status >= 500) {
      console.error('[Axios] Server error:', status, message || error.config?.url);
    }

    // ── Network Error (mất kết nối, CORS, server tắt...) ──
    if (!error.response) {
      console.error('[Axios] Network error — backend có thể đang tắt:', error.message);

      /**
       * Gắn thêm message tiếng Việt vào error để component hiển thị
       * mà không cần tự kiểm tra error.response
       */
      error.userMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
    }

    return Promise.reject(error);
  }
);


// ─────────────────────────────────────────────────────────────
//  HÀM TIỆN ÍCH HELPER (dùng trong các component / custom hook)
// ─────────────────────────────────────────────────────────────

/**
 * extractErrorMessage(error)
 * Trích xuất thông báo lỗi từ Axios error object theo thứ tự ưu tiên:
 *   1. Message từ backend (error.response.data.message)
 *   2. Message lỗi mạng đã dịch (error.userMessage)
 *   3. Message mặc định
 *
 * Dùng trong catch block của các component:
 *   } catch (err) {
 *     setError(extractErrorMessage(err));
 *   }
 *
 * @param   {Error}  error    - Axios error object
 * @param   {string} fallback - Thông báo mặc định nếu không trích xuất được
 * @returns {string}
 */
export const extractErrorMessage = (
  error,
  fallback = 'Đã xảy ra lỗi, vui lòng thử lại'
) => {
  return (
    error?.response?.data?.message ||
    error?.userMessage              ||
    error?.message                  ||
    fallback
  );
};

/**
 * isAuthError(error)
 * Kiểm tra nhanh xem lỗi có phải 401/403 không.
 * Dùng khi component cần xử lý riêng lỗi phân quyền.
 *
 * @param   {Error}   error
 * @returns {boolean}
 */
export const isAuthError = (error) =>
  [401, 403].includes(error?.response?.status);


// ─────────────────────────────────────────────────────────────
//  EXPORT
// ─────────────────────────────────────────────────────────────

export default api;
