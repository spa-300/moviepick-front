import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toPage } from '../api/client';
import { postApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ErrorText from '../components/ErrorText';
import Pager from '../components/Pager';

function PostWriteForm({ onCancel }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await postApi.create({ title, content });
      navigate(`/community/${created.postId}`);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form className="card stack" style={{ maxWidth: '100%' }} onSubmit={submit}>
      <input placeholder="제목 (100자 이하)" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} required />
      <textarea
        placeholder="내용 (5000자 이하)"
        value={content}
        maxLength={5000}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <div className="row">
        <button className="primary">등록</button>
        <button type="button" onClick={onCancel}>
          취소
        </button>
      </div>
      <ErrorText error={error} />
    </form>
  );
}

export default function PostListPage() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(toPage(null));
  const [error, setError] = useState(null);
  const [writing, setWriting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(toPage(await postApi.list({ q, sort, page })));
    } catch (e) {
      setError(e);
    }
  }, [q, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const search = (e) => {
    e.preventDefault();
    setPage(0);
    setQ(input.trim());
  };

  return (
    <div>
      <h1>커뮤니티</h1>
      <form className="row" onSubmit={search} style={{ marginBottom: 12 }}>
        <input placeholder="검색어 (50자 이하)" value={input} maxLength={50} onChange={(e) => setInput(e.target.value)} />
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(0);
          }}
        >
          <option value="latest">최신순</option>
          <option value="popular">인기순</option>
        </select>
        <button>검색</button>
        {user && !writing && (
          <button type="button" className="primary" onClick={() => setWriting(true)}>
            글쓰기
          </button>
        )}
      </form>
      {writing && <PostWriteForm onCancel={() => setWriting(false)} />}
      <ErrorText error={error} />
      <table>
        <thead>
          <tr>
            <th>제목</th>
            <th>작성자</th>
            <th>좋아요</th>
            <th>댓글</th>
            <th>조회</th>
            <th>작성일</th>
          </tr>
        </thead>
        <tbody>
          {data.content.map((p) => (
            <tr key={p.postId}>
              <td>
                <Link to={`/community/${p.postId}`}>{p.title}</Link>
              </td>
              <td>{p.author?.nickname}</td>
              <td>{p.likeCount}</td>
              <td>{p.commentCount}</td>
              <td>{p.viewCount}</td>
              <td className="muted">{p.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!error && data.content.length === 0 && <p className="muted">게시글이 없습니다.</p>}
      <Pager page={data.number} totalPages={data.totalPages} onChange={setPage} />
    </div>
  );
}
