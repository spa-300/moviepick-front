// page는 0부터 시작 (Spring Pageable 기준)
export default function Pager({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="pager">
      <button className="small" disabled={page <= 0} onClick={() => onChange(page - 1)}>
        이전
      </button>
      <span>
        {page + 1} / {totalPages}
      </span>
      <button className="small" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
        다음
      </button>
    </div>
  );
}
