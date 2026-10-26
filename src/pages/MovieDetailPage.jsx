import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toPage } from '../api/client';
import { movieApi, reviewApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ErrorText from '../components/ErrorText';
import Pager from '../components/Pager';

// 0.5 ~ 5.0, 0.5 단위
const RATINGS = Array.from({ length: 10 }, (_, i) => ((i + 1) * 0.5).toFixed(1));

const SORTS = [
  ['latest', '최신순'],
  ['likes', '좋아요순'],
  ['ratingDesc', '평점 높은순'],
  ['ratingAsc', '평점 낮은순'],
];

function ReviewForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [rating, setRating] = useState(initial?.rating ?? '5.0');
  const [content, setContent] = useState(initial?.content ?? '');
  const [spoiler, setSpoiler] = useState(initial?.spoiler ?? false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ rating: Number(rating), content, spoiler });
      if (!initial) {
        setContent('');
        setSpoiler(false);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack" style={{ maxWidth: '100%' }}>
      <div className="row">
        <label>
          평점{' '}
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            {RATINGS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} /> 스포일러
        </label>
      </div>
      <textarea
        placeholder="리뷰 내용 (1000자 이내)"
        value={content}
        maxLength={1000}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <div className="row">
        <button className="primary" disabled={busy}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            취소
          </button>
        )}
      </div>
      <ErrorText error={error} />
    </form>
  );
}

function ReviewItem({ review, me, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const mine = me && review.author?.memberId === me.id;

  const run = async (fn) => {
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e);
    }
  };

  const toggleLike = () =>
    run(() => (review.likedByMe ? reviewApi.unlike(review.reviewId) : reviewApi.like(review.reviewId)));

  const remove = () => {
    if (window.confirm('리뷰를 삭제할까요?')) run(() => reviewApi.remove(review.reviewId));
  };

  if (editing) {
    return (
      <div className="card">
        <ReviewForm
          initial={{ rating: Number(review.rating).toFixed(1), content: review.content, spoiler: review.spoiler }}
          submitLabel="수정 저장"
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            await reviewApi.update(review.reviewId, body);
            setEditing(false);
            onChanged();
          }}
        />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row">
        <strong>★ {review.rating}</strong>
        <span>{review.author?.nickname}</span>
        {review.spoiler && <span className="badge">스포일러</span>}
        <span className="muted">{review.createdAt}</span>
      </div>
      <p>{review.content}</p>
      <div className="row">
        <button className="small" onClick={toggleLike} disabled={!me}>
          {review.likedByMe ? '♥' : '♡'} {review.likeCount}
        </button>
        {mine && (
          <>
            <button className="small" onClick={() => setEditing(true)}>
              수정
            </button>
            <button className="small danger" onClick={remove}>
              삭제
            </button>
          </>
        )}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [movieError, setMovieError] = useState(null);
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(0);
  const [reviews, setReviews] = useState(toPage(null));
  const [reviewError, setReviewError] = useState(null);

  useEffect(() => {
    setMovieError(null);
    movieApi.detail(id).then(setMovie, setMovieError);
  }, [id]);

  const loadReviews = useCallback(async () => {
    setReviewError(null);
    try {
      setReviews(toPage(await reviewApi.listByMovie(id, { sort, page })));
    } catch (e) {
      setReviewError(e);
    }
  }, [id, sort, page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  return (
    <div>
      <ErrorText error={movieError} />
      {movie && (
        <div className="card movie-detail">
          {movie.posterUrl && <img src={movie.posterUrl} alt={movie.title} />}
          <div>
            <h1>{movie.title}</h1>
            <p className="muted">
              {movie.originalTitle} · {movie.releaseDate || '개봉일 미정'} · {movie.runtimeMinutes ?? '-'}분 ·{' '}
              {movie.status}
            </p>
            <p>
              ★ {movie.voteAverage ?? '-'} ({movie.voteCount ?? 0}명)
            </p>
            <div className="row">
              {(movie.genres || []).map((g) => (
                <span key={g.id} className="badge">
                  {g.name}
                </span>
              ))}
            </div>
            <p>{movie.overview}</p>
          </div>
        </div>
      )}

      <h2>리뷰</h2>
      {user ? (
        <div className="card">
          <ReviewForm
            submitLabel="리뷰 작성"
            onSubmit={async (body) => {
              await reviewApi.create(id, body);
              setPage(0);
              loadReviews();
            }}
          />
        </div>
      ) : (
        <p className="muted">로그인하면 리뷰를 작성할 수 있습니다.</p>
      )}

      <div className="row" style={{ marginBottom: 12 }}>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(0);
          }}
        >
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="muted">총 {reviews.totalElements}개</span>
      </div>
      <ErrorText error={reviewError} />
      {reviews.content.map((r) => (
        <ReviewItem key={r.reviewId} review={r} me={user} onChanged={loadReviews} />
      ))}
      <Pager page={reviews.number} totalPages={reviews.totalPages} onChange={setPage} />
    </div>
  );
}
