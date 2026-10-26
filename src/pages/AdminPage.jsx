import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toPage } from '../api/client';
import { adminApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ErrorText from '../components/ErrorText';
import Pager from '../components/Pager';

function targetLink(report) {
  // 댓글 신고는 게시글 ID를 알 수 없어 ID만 표시
  if (report.targetType === 'POST') return <Link to={`/community/${report.targetId}`}>게시글 #{report.targetId}</Link>;
  return `댓글 #${report.targetId}`;
}

function Reports() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(toPage(null));
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(toPage(await adminApi.reports(page)));
    } catch (e) {
      setError(e);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const process = async (id, status) => {
    setError(null);
    try {
      await adminApi.processReport(id, status);
      load();
    } catch (e) {
      setError(e);
    }
  };

  return (
    <section className="card">
      <h2>신고 목록</h2>
      <ErrorText error={error} />
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>대상</th>
            <th>신고자</th>
            <th>사유</th>
            <th>상세</th>
            <th>상태</th>
            <th>처리</th>
          </tr>
        </thead>
        <tbody>
          {data.content.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{targetLink(r)}</td>
              <td>{r.reporterId}</td>
              <td>{r.reason}</td>
              <td>{r.detail}</td>
              <td>{r.status}</td>
              <td>
                {r.status === 'PENDING' && (
                  <div className="row">
                    <button className="small primary" onClick={() => process(r.id, 'ACCEPTED')}>
                      승인
                    </button>
                    <button className="small" onClick={() => process(r.id, 'REJECTED')}>
                      거절
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!error && data.content.length === 0 && <p className="muted">신고가 없습니다.</p>}
      <Pager page={data.number} totalPages={data.totalPages} onChange={setPage} />
    </section>
  );
}

function Members() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(toPage(null));
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(toPage(await adminApi.members({ status, page })));
    } catch (e) {
      setError(e);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const release = async (memberId) => {
    setError(null);
    try {
      await adminApi.releaseSuspension(memberId);
      load();
    } catch (e) {
      setError(e);
    }
  };

  return (
    <section className="card">
      <h2>회원 목록</h2>
      <div className="row" style={{ marginBottom: 8 }}>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">전체</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="WITHDRAWN">WITHDRAWN</option>
        </select>
        <span className="muted">총 {data.totalElements}명</span>
      </div>
      <ErrorText error={error} />
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>이메일</th>
            <th>닉네임</th>
            <th>역할</th>
            <th>상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.content.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.email}</td>
              <td>{m.nickname}</td>
              <td>{m.role}</td>
              <td>{m.status}</td>
              <td>
                {m.status === 'SUSPENDED' && (
                  <button className="small" onClick={() => release(m.id)}>
                    정지 해제
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={data.number} totalPages={data.totalPages} onChange={setPage} />
    </section>
  );
}

export default function AdminPage() {
  const { user, isAdmin } = useAuth();

  if (!user) return <p>로그인이 필요합니다.</p>;
  if (!isAdmin) return <p>관리자만 접근할 수 있습니다. (현재 역할: {user.role})</p>;

  return (
    <div>
      <h1>관리자</h1>
      <Reports />
      <Members />
    </div>
  );
}
