import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function TopBar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout().catch(() => {});
    navigate('/login');
  };

  return (
    <header className="topbar">
      <Link to="/movies" className="brand">
        MoviePick
      </Link>
      <nav>
        <NavLink to="/movies">영화</NavLink>
        <NavLink to="/community">커뮤니티</NavLink>
        <NavLink to="/support">후원</NavLink>
        {isAdmin && <NavLink to="/admin">관리자</NavLink>}
      </nav>
      <div className="topbar-user">
        {user ? (
          <>
            <span>
              {user.nickname} <span className="badge">{user.role}</span>
            </span>
            <button className="small" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <Link to="/login">로그인</Link>
        )}
      </div>
    </header>
  );
}
