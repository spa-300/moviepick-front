import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { authApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

const STEPS = ['CSRF 발급', 'Access Token 재발급 (refresh)', '내 정보 조회', '영화 화면으로 이동'];

export default function OAuthSuccessPage() {
  const { loadMe } = useAuth();
  const navigate = useNavigate();
  const [states, setStates] = useState(STEPS.map(() => 'wait'));
  const [error, setError] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const mark = (i, s) => setStates((prev) => prev.map((v, idx) => (idx === i ? s : v)));

    (async () => {
      let i = 0;
      try {
        mark(0, 'run');
        await authApi.csrf();
        mark(0, 'done');

        i = 1;
        mark(1, 'run');
        if (!(await authApi.refresh())) throw new Error('refresh 실패 (refreshToken 쿠키가 없거나 만료됨)');
        mark(1, 'done');

        i = 2;
        mark(2, 'run');
        await loadMe();
        mark(2, 'done');

        i = 3;
        mark(3, 'done');
        setTimeout(() => navigate('/movies', { replace: true }), 600);
      } catch (e) {
        mark(i, 'fail');
        setError(errorMessage(e));
      }
    })();
  }, [loadMe, navigate]);

  const icon = { wait: '·', run: '…', done: '✔', fail: '✖' };

  return (
    <div>
      <h1>소셜 로그인 처리</h1>
      <ol className="card">
        {STEPS.map((step, i) => (
          <li key={step} className={states[i] === 'fail' ? 'error' : states[i] === 'done' ? 'success' : ''}>
            {icon[states[i]]} {step}
          </li>
        ))}
      </ol>
      {error && (
        <>
          <p className="error">{error}</p>
          <button onClick={() => navigate('/login')}>로그인 화면으로</button>
        </>
      )}
    </div>
  );
}
