import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthFailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reason = params.get('reason');

  return (
    <div>
      <h1>소셜 로그인 실패</h1>
      <div className="card">
        <p>사유: {reason || '(전달된 reason 없음)'}</p>
        <button onClick={() => navigate('/login')}>로그인 화면으로</button>
      </div>
    </div>
  );
}
