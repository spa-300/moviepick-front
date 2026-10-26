import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toPage } from '../api/client';
import { movieApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ErrorText from '../components/ErrorText';
import Pager from '../components/Pager';

function AdminSync({ onDone }) {
  const [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await movieApi.sync(pages));
      onDone();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="row">
        <strong>관리자</strong>
        <select value={pages} onChange={(e) => setPages(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              pages {n}
            </option>
          ))}
        </select>
        <button className="primary" disabled={busy} onClick={run}>
          {busy ? '불러오는 중…' : '영화 불러오기'}
        </button>
      </div>
      {result && (
        <p className="success">
          요청 {result.requestedPages}페이지 · 저장 {result.savedCount} · 실패 {result.failedCount}
        </p>
      )}
      <ErrorText error={error} />
    </div>
  );
}

export default function MovieListPage() {
  const { isAdmin } = useAuth();
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(toPage(null));
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(toPage(await movieApi.list({ keyword, page })));
    } catch (e) {
      setError(e);
    }
  }, [keyword, page]);

  useEffect(() => {
    load();
  }, [load]);

  const search = (e) => {
    e.preventDefault();
    setPage(0);
    setKeyword(input.trim());
  };

  return (
    <div>
      <h1>영화</h1>
      {isAdmin && <AdminSync onDone={load} />}
      <form className="row" onSubmit={search} style={{ marginBottom: 12 }}>
        <input placeholder="제목 검색" value={input} onChange={(e) => setInput(e.target.value)} />
        <button>검색</button>
        <span className="muted">총 {data.totalElements}편</span>
      </form>
      <ErrorText error={error} />
      <div className="movie-grid">
        {data.content.map((m) => (
          <Link key={m.id} to={`/movies/${m.id}`} className="card movie-card">
            {m.posterUrl ? <img src={m.posterUrl} alt={m.title} /> : <div className="poster-placeholder" />}
            <div>{m.title}</div>
            <div className="muted">
              {m.releaseDate || '개봉일 미정'} · ★ {m.voteAverage ?? '-'}
            </div>
          </Link>
        ))}
      </div>
      {!error && data.content.length === 0 && <p className="muted">영화가 없습니다.</p>}
      <Pager page={data.number} totalPages={data.totalPages} onChange={setPage} />
    </div>
  );
}
