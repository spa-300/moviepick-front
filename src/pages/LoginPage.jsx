import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/client';
import { authApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ErrorText from '../components/ErrorText';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [signup, setSignup] = useState({ email: '', password: '', nickname: '' });
  const [signupMsg, setSignupMsg] = useState(null);
  const [signupErr, setSignupErr] = useState(null);

  const [form, setForm] = useState({ email: '', password: '' });
  const [loginErr, setLoginErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupErr(null);
    setSignupMsg(null);
    if (signup.password.length < 8) {
      setSignupErr('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    try {
      const member = await authApi.signup(signup);
      setSignupMsg(`가입 완료: ${member?.email} (${member?.nickname}). 아래에서 로그인하세요.`);
      setForm({ email: signup.email, password: '' });
    } catch (err) {
      setSignupErr(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErr(null);
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/movies');
    } catch (err) {
      setLoginErr(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>로그인</h1>
      {user && <p className="success">이미 {user.nickname}(으)로 로그인되어 있습니다.</p>}

      <section className="card">
        <h3>로그인</h3>
        <form className="stack" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="이메일"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button className="primary" disabled={busy}>
            로그인
          </button>
          <ErrorText error={loginErr} />
        </form>
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={() => (window.location.href = `${API_BASE_URL}/oauth2/authorization/kakao`)}>
            카카오로 로그인
          </button>
        </div>
      </section>

      <section className="card">
        <h3>회원가입</h3>
        <form className="stack" onSubmit={handleSignup}>
          <input
            type="email"
            placeholder="이메일"
            value={signup.email}
            onChange={(e) => setSignup({ ...signup, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="비밀번호 (8자 이상)"
            value={signup.password}
            onChange={(e) => setSignup({ ...signup, password: e.target.value })}
            minLength={8}
            required
          />
          <input
            placeholder="닉네임 (50자 이하)"
            value={signup.nickname}
            onChange={(e) => setSignup({ ...signup, nickname: e.target.value })}
            maxLength={50}
            required
          />
          <button>회원가입</button>
          {signupMsg && <p className="success">{signupMsg}</p>}
          <ErrorText error={signupErr} />
        </form>
      </section>
    </div>
  );
}
