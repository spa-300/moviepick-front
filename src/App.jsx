import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import TopBar from './components/TopBar';
import DevLogPanel from './components/DevLogPanel';
import LoginPage from './pages/LoginPage';
import OAuthSuccessPage from './pages/OAuthSuccessPage';
import OAuthFailPage from './pages/OAuthFailPage';
import MovieListPage from './pages/MovieListPage';
import MovieDetailPage from './pages/MovieDetailPage';
import PostListPage from './pages/PostListPage';
import PostDetailPage from './pages/PostDetailPage';
import AdminPage from './pages/AdminPage';
import SupportPage from './pages/SupportPage';

export default function App() {
  const { booting } = useAuth();

  return (
    <div className="layout">
      <TopBar />
      <div className="body">
        <main className="main">
          {booting ? (
            <p className="muted">로그인 상태 확인 중…</p>
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/movies" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/oauth2/success" element={<OAuthSuccessPage />} />
              <Route path="/oauth2/fail" element={<OAuthFailPage />} />
              <Route path="/movies" element={<MovieListPage />} />
              <Route path="/movies/:id" element={<MovieDetailPage />} />
              <Route path="/community" element={<PostListPage />} />
              <Route path="/community/:id" element={<PostDetailPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="*" element={<p>페이지를 찾을 수 없습니다.</p>} />
            </Routes>
          )}
        </main>
        <DevLogPanel />
      </div>
    </div>
  );
}
