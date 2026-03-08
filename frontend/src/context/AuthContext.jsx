/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────
 * Global authentication state cho toàn bộ ứng dụng SoundJudge.
 *
 * Cung cấp qua useAuth():
 *   user            {object|null}   - Thông tin user đang đăng nhập (null nếu chưa login)
 *   loading         {boolean}       - true khi đang kiểm tra session lúc app khởi động
 *   authError       {string|null}   - Thông báo lỗi từ login/register (null nếu không có)
 *   login()         {function}      - Đăng nhập bằng email + password
 *   register()      {function}      - Đăng ký tài khoản mới
 *   logout()        {function}      - Đăng xuất, xoá token, reset state
 *   updateUser()    {function}      - Cập nhật user state sau khi đổi profile (không cần logout)
 *   clearAuthError(){function}      - Xoá thông báo lỗi (dùng khi user bắt đầu gõ lại)
 *   isRole()        {function}      - Kiểm tra nhanh role: isRole('admin')
 *
 * Sơ đồ luồng khởi động:
 *   App mount
 *     → AuthProvider useEffect chạy
 *     → Kiểm tra TOKEN_KEY trong localStorage
 *     → Có token → gọi GET /auth/me để xác nhận token còn hợp lệ không
 *         → Thành công  → setUser(data.user),   loading = false
 *         → Thất bại    → clearAuthToken(),      loading = false
 *     → Không có token  →                        loading = false
 *
 * Cách import:
 *   import { useAuth } from '../context/AuthContext';
 *   const { user, login, logout } = useAuth();
 * ─────────────────────────────────────────────────────────────
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import api, {
  TOKEN_KEY,
  USER_KEY,
  clearAuthToken,
  extractErrorMessage,
  getStoredToken,
  setAuthToken,
} from '../api/axiosConfig';


// ─────────────────────────────────────────────────────────────
//  TẠO CONTEXT
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null);


// ─────────────────────────────────────────────────────────────
//  HELPER: Lưu / Đọc user từ localStorage (cache nhẹ)
// ─────────────────────────────────────────────────────────────

/**
 * persistUser(user)
 * Lưu thông tin user vào localStorage để hiển thị ngay khi reload
 * mà không cần chờ /auth/me phản hồi (tránh flash trắng).
 * Dữ liệu này chỉ là cache UI — luôn được xác nhận lại bằng /auth/me.
 */
const persistUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage đầy hoặc bị chặn (private mode) → bỏ qua
  }
};

/**
 * loadCachedUser()
 * Đọc user đã cache từ localStorage.
 * Trả về null nếu không có hoặc JSON bị hỏng.
 */
const loadCachedUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * clearPersistedUser()
 * Xoá cache user khỏi localStorage (gọi khi logout hoặc token invalid).
 */
const clearPersistedUser = () => {
  localStorage.removeItem(USER_KEY);
};


// ─────────────────────────────────────────────────────────────
//  AUTH PROVIDER COMPONENT
// ─────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  /**
   * user — Thông tin người dùng đang đăng nhập.
   *
   * Khởi tạo bằng loadCachedUser() để:
   *   - Hiển thị ngay UI đúng role mà không chờ API
   *   - Tránh flash màn hình trắng hoặc redirect sai khi reload
   *   - Cache sẽ được xác nhận lại bằng /auth/me trong useEffect
   *
   * Shape: {
   *   id, name, email, role,
   *   avatarUrl, bio,
   *   reputationScore, totalReviews,
   *   isActive, createdAt
   * }
   */
  const [user, setUser]           = useState(() => loadCachedUser());

  /**
   * loading — true khi đang xác minh token lúc app khởi động.
   *
   * ProtectedRoute dùng loading để hiện spinner thay vì redirect ngay,
   * tránh trường hợp user có token hợp lệ nhưng bị đẩy ra /login
   * trước khi /auth/me kịp phản hồi.
   *
   * Khởi tạo: true nếu có token (cần xác minh), false nếu không có token.
   */
  const [loading, setLoading]     = useState(() => Boolean(getStoredToken()));

  /**
   * authError — Thông báo lỗi từ login / register.
   * Được reset về null khi gọi clearAuthError() hoặc khi bắt đầu thao tác mới.
   */
  const [authError, setAuthError] = useState(null);

  /**
   * isMounted ref — tránh setState sau khi component đã unmount
   * (hiếm nhưng có thể xảy ra trong Strict Mode React 18)
   */
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);


  // ─────────────────────────────────────────────────────────
  //  KHÔI PHỤC SESSION KHI APP KHỞI ĐỘNG
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    /**
     * Kiểm tra token trong localStorage và xác minh với backend.
     *
     * Tại sao cần gọi /auth/me dù đã có cache?
     *   - Token có thể đã hết hạn (JWT expires)
     *   - Admin có thể đã khoá tài khoản
     *   - User có thể đã đổi mật khẩu trên thiết bị khác
     *     → backend trả 401 và axiosConfig tự redirect về /login
     */
    const verifySession = async () => {
      const token = getStoredToken();

      // Không có token → không cần gọi API
      if (!token) {
        if (isMounted.current) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await api.get('/auth/me');

        if (isMounted.current) {
          // Cập nhật user với dữ liệu mới nhất từ server (reputationScore có thể đã thay đổi...)
          setUser(data.user);
          persistUser(data.user);
        }

      } catch (error) {
        /**
         * Token không hợp lệ, hết hạn, hoặc tài khoản bị khoá.
         * axiosConfig interceptor đã xử lý 401 (clearToken + redirect /login).
         * Ở đây chỉ cần dọn dẹp state local.
         */
        if (isMounted.current) {
          clearAuthToken();
          clearPersistedUser();
          setUser(null);
        }

      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    verifySession();
  }, []); // Chỉ chạy 1 lần duy nhất khi app mount


  // ─────────────────────────────────────────────────────────
  //  ACTION: ĐĂNG NHẬP
  // ─────────────────────────────────────────────────────────

  /**
   * login(email, password)
   *
   * Gửi POST /auth/login → nhận token + user từ backend
   * → lưu token → cập nhật state → trả về user để component điều hướng.
   *
   * Xử lý lỗi: ném lại error để component catch và hiển thị thông báo cụ thể.
   * Không setAuthError ở đây để tách biệt: AuthContext không biết component
   * nào đang render, để component tự quyết định cách hiển thị lỗi.
   *
   * @param   {string} email
   * @param   {string} password
   * @returns {object} user - Dùng để điều hướng theo role trong LoginPage
   * @throws  {Error}  Ném lại axios error nếu đăng nhập thất bại
   */
  const login = useCallback(async (email, password) => {
    setAuthError(null);

    try {
      const { data } = await api.post('/auth/login', {
        email:    email.trim().toLowerCase(),
        password,
      });

      // Lưu token → axiosConfig tự đính vào default headers
      setAuthToken(data.token);

      // Cập nhật state
      setUser(data.user);
      persistUser(data.user);

      return data.user; // LoginPage dùng để navigate theo role

    } catch (error) {
      const message = extractErrorMessage(error, 'Đăng nhập thất bại');
      setAuthError(message);
      throw error; // Ném lại để LoginPage có thể catch nếu cần
    }
  }, []);


  // ─────────────────────────────────────────────────────────
  //  ACTION: ĐĂNG KÝ
  // ─────────────────────────────────────────────────────────

  /**
   * register(name, email, password, role)
   *
   * Gửi POST /auth/register → nhận token + user → tự động đăng nhập luôn.
   * Không yêu cầu user phải login thêm lần nữa sau khi đăng ký thành công.
   *
   * @param   {string} name
   * @param   {string} email
   * @param   {string} password
   * @param   {string} role     - 'artist' | 'reviewer'
   * @returns {object} user
   * @throws  {Error}  Ném lại axios error nếu đăng ký thất bại
   */
  const register = useCallback(async (name, email, password, role) => {
    setAuthError(null);

    try {
      const { data } = await api.post('/auth/register', {
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        password,
        role,
      });

      setAuthToken(data.token);
      setUser(data.user);
      persistUser(data.user);

      return data.user;

    } catch (error) {
      const message = extractErrorMessage(error, 'Đăng ký thất bại');
      setAuthError(message);
      throw error;
    }
  }, []);


  // ─────────────────────────────────────────────────────────
  //  ACTION: ĐĂNG XUẤT
  // ─────────────────────────────────────────────────────────

  /**
   * logout()
   *
   * Xoá token + cache → reset state.
   * axiosConfig clearAuthToken() đã xoá cả localStorage lẫn default headers.
   * Navbar gọi hàm này rồi tự navigate('/login').
   */
  const logout = useCallback(() => {
    clearAuthToken();
    clearPersistedUser();
    setUser(null);
    setAuthError(null);
  }, []);


  // ─────────────────────────────────────────────────────────
  //  ACTION: CẬP NHẬT USER SAU KHI ĐỔI PROFILE
  // ─────────────────────────────────────────────────────────

  /**
   * updateUser(updatedFields)
   *
   * Cập nhật một phần thông tin user trong state mà không cần logout.
   * Dùng sau khi PATCH /auth/update-profile thành công.
   *
   * Ví dụ:
   *   const { data } = await api.patch('/auth/update-profile', { name: 'Tên mới' });
   *   updateUser(data.user); // Navbar tự hiển thị tên mới ngay lập tức
   *
   * @param {object} updatedFields - Object chứa các field cần cập nhật
   *                                 (merge vào user hiện tại, không thay thế)
   */
  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      if (!prev) return updatedFields;
      const merged = { ...prev, ...updatedFields };
      persistUser(merged); // Đồng bộ vào localStorage
      return merged;
    });
  }, []);


  // ─────────────────────────────────────────────────────────
  //  HELPER: XOÁ LỖI AUTH
  // ─────────────────────────────────────────────────────────

  /**
   * clearAuthError()
   * Xoá thông báo lỗi trong state (vd: khi user bắt đầu gõ lại form).
   * AuthPages có thể gọi khi onChange của input.
   */
  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);


  // ─────────────────────────────────────────────────────────
  //  HELPER: KIỂM TRA ROLE
  // ─────────────────────────────────────────────────────────

  /**
   * isRole(...roles)
   * Kiểm tra nhanh xem user hiện tại có thuộc role nào trong danh sách không.
   *
   * Dùng trong component để hiện/ẩn UI theo quyền:
   *   const { isRole } = useAuth();
   *   {isRole('admin') && <AdminPanel />}
   *   {isRole('artist', 'admin') && <UploadButton />}
   *
   * @param   {...string} roles - Danh sách role cần kiểm tra
   * @returns {boolean}
   */
  const isRole = useCallback(
    (...roles) => Boolean(user && roles.includes(user.role)),
    [user]
  );


  // ─────────────────────────────────────────────────────────
  //  COMPUTED: CÁC GIÁ TRỊ DẪN XUẤT
  // ─────────────────────────────────────────────────────────

  /**
   * isAuthenticated — true khi đã đăng nhập VÀ không đang loading.
   * Dùng để quyết định hiển thị nội dung hay redirect mà không cần
   * viết điều kiện: !loading && user !== null ở mọi nơi.
   */
  const isAuthenticated = !loading && user !== null;


  // ─────────────────────────────────────────────────────────
  //  CONTEXT VALUE — dùng useMemo để tránh re-render không cần thiết
  // ─────────────────────────────────────────────────────────

  /**
   * useMemo: context value chỉ thay đổi khi user, loading, hoặc authError thay đổi.
   * Không memo hoá các callback vì đã dùng useCallback ở trên.
   *
   * Tất cả component dùng useAuth() chỉ re-render khi các giá trị
   * trong mảng dependency thực sự thay đổi.
   */
  const contextValue = useMemo(
    () => ({
      // ── State ──────────────────────────────────────────
      user,               // Thông tin user (null nếu chưa đăng nhập)
      loading,            // Đang xác minh token lúc app khởi động
      authError,          // Thông báo lỗi từ login/register
      isAuthenticated,    // Shorthand: !loading && user !== null

      // ── Actions ────────────────────────────────────────
      login,              // (email, password) → Promise<user>
      register,           // (name, email, password, role) → Promise<user>
      logout,             // () → void
      updateUser,         // (updatedFields) → void
      clearAuthError,     // () → void

      // ── Helpers ────────────────────────────────────────
      isRole,             // (...roles) → boolean
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, authError]
  );


  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────

  /**
   * Khi loading = true (đang xác minh token) và KHÔNG có cache:
   * Hiển thị màn hình loading toàn trang thay vì render children.
   *
   * Nếu có cache (user !== null từ loadCachedUser()) → vẫn render children
   * để tránh flash trắng, cache sẽ được xác nhận ngầm ở background.
   *
   * ProtectedRoute cũng có logic tương tự — 2 lớp bảo vệ để đảm bảo
   * không bao giờ flash nội dung riêng tư trước khi xác thực xong.
   */
  if (loading && !user) {
    return (
      <div style={loadingScreenStyle}>
        <div style={spinnerStyle} />
        <p style={loadingTextStyle}>Đang tải SoundJudge...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};


// ─────────────────────────────────────────────────────────────
//  LOADING SCREEN STYLES (inline để tránh phụ thuộc CSS file)
// ─────────────────────────────────────────────────────────────

const loadingScreenStyle = {
  display:         'flex',
  flexDirection:   'column',
  alignItems:      'center',
  justifyContent:  'center',
  minHeight:       '100vh',
  background:      '#0a0a0f',
  gap:             '1rem',
};

const spinnerStyle = {
  width:           '40px',
  height:          '40px',
  border:          '3px solid #1f2937',
  borderTopColor:  '#e2c97e',   // Gold accent — đồng bộ với màu chủ đạo của app
  borderRadius:    '50%',
  animation:       'spin 0.8s linear infinite',
};

const loadingTextStyle = {
  color:      '#6b7280',
  fontSize:   '0.9rem',
  fontFamily: "'DM Sans', sans-serif",
};


// ─────────────────────────────────────────────────────────────
//  CUSTOM HOOK: useAuth
// ─────────────────────────────────────────────────────────────

/**
 * useAuth()
 * Custom hook để truy cập AuthContext.
 *
 * Có kiểm tra: nếu gọi useAuth() bên ngoài <AuthProvider> sẽ throw error
 * với message rõ ràng thay vì lỗi khó đọc "cannot read property of null".
 *
 * Cách dùng:
 *   const { user, login, logout, isRole } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error(
      '[useAuth] phải được gọi bên trong <AuthProvider>.\n' +
      'Kiểm tra lại App.jsx: <AuthProvider> phải bao ngoài toàn bộ component tree.'
    );
  }

  return context;
};


// ─────────────────────────────────────────────────────────────
//  EXPORT DEFAULT (không dùng nhưng export để tiện import nếu cần)
// ─────────────────────────────────────────────────────────────

export default AuthContext;
