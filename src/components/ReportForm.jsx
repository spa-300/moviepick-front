import { useState } from 'react';
import ErrorText from './ErrorText';

const REASONS = [
  ['SPAM', '스팸'],
  ['ABUSE', '욕설·비방'],
  ['SPOILER', '스포일러'],
  ['ADULT', '음란물'],
  ['ETC', '기타'],
];

// 게시글·댓글 신고 공용. onSubmit({ reason, detail })
export default function ReportForm({ onSubmit, onClose }) {
  const [reason, setReason] = useState('SPAM');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (reason === 'ETC' && !detail.trim()) {
      setError('기타 신고는 상세 사유가 필수입니다.');
      return;
    }
    try {
      const res = await onSubmit({ reason, detail: detail.trim() || null });
      setDone(`신고 접수됨 (reportId ${res?.reportId}, ${res?.status})`);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="row">
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map(([value, label]) => (
            <option key={value} value={value}>
              {value} - {label}
            </option>
          ))}
        </select>
      </div>
      <input
        placeholder={reason === 'ETC' ? '상세 사유 (필수, 200자 이하)' : '상세 사유 (선택, 200자 이하)'}
        value={detail}
        maxLength={200}
        onChange={(e) => setDetail(e.target.value)}
      />
      <div className="row">
        <button className="danger">신고</button>
        <button type="button" onClick={onClose}>
          닫기
        </button>
      </div>
      {done && <p className="success">{done}</p>}
      <ErrorText error={error} />
    </form>
  );
}
