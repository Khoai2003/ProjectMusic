import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar             from './components/common/Navbar';
import ProtectedRoute     from './components/common/ProtectedRoute';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import ArtistDashboard    from './components/artist/ArtistDashboard';
import UploadTrack        from './components/artist/UploadTrack';
import TrackStats         from './components/artist/TrackStats';
import ReviewerWorkspace  from './components/reviewer/ReviewerWorkspace';
import AdminDashboard     from './components/admin/AdminDashboard';

// Trang điều hướng sau khi đăng nhập theo role
const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'artist')   return <Navigate to="/dashboard/artist" />;
  if (user.role === 'reviewer') return <Navigate to="/dashboard/reviewer" />;
  if (user.role === 'admin')    return <Navigate to="/dashboard/admin" />;
  return <Navigate to="/login" />;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/"         element={<Navigate to="/dashboard" />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Routes>
                  <Route index element={<DashboardRedirect />} />
                </Routes>
              </>
            </ProtectedRoute>
          } />

          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <Navbar />
              <Routes>
                <Route index element={<DashboardRedirect />} />

                {/* Artist routes */}
                <Route path="artist" element={
                  <ProtectedRoute roles={['artist']}>
                    <ArtistDashboard />
                  </ProtectedRoute>
                } />
                <Route path="upload" element={
                  <ProtectedRoute roles={['artist']}>
                    <UploadTrack />
                  </ProtectedRoute>
                } />
                <Route path="artist/track/:id" element={
                  <ProtectedRoute roles={['artist', 'admin']}>
                    <TrackStats />
                  </ProtectedRoute>
                } />

                {/* Reviewer routes */}
                <Route path="reviewer" element={
                  <ProtectedRoute roles={['reviewer']}>
                    <ReviewerWorkspace />
                  </ProtectedRoute>
                } />

                {/* Admin routes */}
                <Route path="admin" element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
              </Routes>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
