import { useEffect, useState } from 'react';
import { onLog } from '../api/client';

const MAX_LOGS = 300;

function statusClass(status) {
  if (status === 0) return 'log-status err';
  if (status >= 400) return 'log-status err';
  if (status >= 300) return 'log-status warn';
  return 'log-status ok';
}

function pretty(value) {
  if (value === undefined) return '(없음)';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export default function DevLogPanel() {
  const [logs, setLogs] = useState([]);
  const [openIds, setOpenIds] = useState(() => new Set());

  useEffect(
    () => onLog((entry) => setLogs((prev) => [...prev, entry].slice(-MAX_LOGS))),
    [],
  );

  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clear = () => {
    setLogs([]);
    setOpenIds(new Set());
  };

  return (
    <aside className="devlog">
      <div className="devlog-head">
        <strong>개발 로그 ({logs.length})</strong>
        <button className="small" onClick={clear}>
          비우기
        </button>
      </div>
      <ul className="devlog-list">
        {logs.map((log) => {
          const path = log.url.replace(/^https?:\/\/[^/]+/, '');
          return (
            <li key={log.id} className="devlog-item">
              <button className="devlog-row" onClick={() => toggle(log.id)}>
                <span className="muted">{log.time.toLocaleTimeString()}</span>
                <span className="log-method">{log.method}</span>
                <span className={statusClass(log.status)}>{log.status || 'ERR'}</span>
                <span className="log-path">{path}</span>
              </button>
              {log.retry && <div className="log-retry">↻ {log.retry}</div>}
              {openIds.has(log.id) && (
                <div className="devlog-detail">
                  <div className="muted">
                    {log.url} · {log.durationMs}ms · Authorization {log.auth ? '있음' : '없음'}
                  </div>
                  {log.requestBody !== undefined && (
                    <>
                      <div className="muted">요청 본문</div>
                      <pre>{pretty(log.requestBody)}</pre>
                    </>
                  )}
                  <div className="muted">응답 본문</div>
                  <pre>{pretty(log.responseBody)}</pre>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
