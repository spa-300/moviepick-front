import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toPage } from '../api/client';
import { commentApi, postApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ErrorText from '../components/ErrorText';
import Pager from '../components/Pager';
import ReportForm from '../components/ReportForm';

function PostEditForm({ post, onDone, onCancel }) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [error, setError] = useState(null);

  // 바뀐 필드만 보낸다 (제목만 수정 가능)
  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const body = {};
    if (title !== post.title) body.title = title;
    if (content !== post.content) body.content = content;
    if (Object.keys(body).length === 0) {
      setError('바뀐 내용이 없습니다.');
      return;
    }
    try {
      await postApi.update(post.postId, body);
      onDone();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form className="card stack" style={{ maxWidth: '100%' }} onSubmit={submit}>
      <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} required />
      <textarea value={content} maxLength={5000} onChange={(e) => setContent(e.target.value)} required />
      <div className="row">
        <button className="primary">저장</button>
        <button type="button" onClick={onCancel}>
          취소
        </button>
      </div>
      <ErrorText error={error} />
    </form>
  );
}

function CommentItem({ postId, comment, me, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.content);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState(null);
  const mine = me && comment.author?.memberId === me.id;

  const run = async (fn) => {
    setError(null);
    try {
      await fn();
      onChanged();
      return true;
    } catch (e) {
      setError(e);
      return false;
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (await run(() => commentApi.update(postId, comment.commentId, { content: text }))) setEditing(false);
  };

  return (
    <div className="card">
      <div className="row">
        <strong>{comment.author?.nickname}</strong>
        <span className="muted">{comment.createdAt}</span>
      </div>
      {editing ? (
        <form className="row" onSubmit={save}>
          <input style={{ flex: 1 }} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} required />
          <button className="small primary">저장</button>
          <button type="button" className="small" onClick={() => setEditing(false)}>
            취소
          </button>
        </form>
      ) : (
        <p>{comment.content}</p>
      )}
      <div className="row">
        <button
          className="small"
          disabled={!me}
          onClick={() =>
            run(() => (comment.likedByMe ? commentApi.unlike(comment.commentId) : commentApi.like(comment.commentId)))
          }
        >
          {comment.likedByMe ? '♥' : '♡'} {comment.likeCount}
        </button>
        {mine && !editing && (
          <>
            <button className="small" onClick={() => setEditing(true)}>
              수정
            </button>
            <button
              className="small danger"
              onClick={() => window.confirm('댓글을 삭제할까요?') && run(() => commentApi.remove(comment.commentId))}
            >
              삭제
            </button>
          </>
        )}
        {me && !mine && (
          <button className="small" onClick={() => setReporting((v) => !v)}>
            신고
          </button>
        )}
      </div>
      {reporting && (
        <ReportForm onSubmit={(body) => commentApi.report(comment.commentId, body)} onClose={() => setReporting(false)} />
      )}
      <ErrorText error={error} />
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [postError, setPostError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);

  const [page, setPage] = useState(0);
  const [comments, setComments] = useState(toPage(null));
  const [commentError, setCommentError] = useState(null);
  const [newComment, setNewComment] = useState('');

  const loadPost = useCallback(async () => {
    setPostError(null);
    try {
      setPost(await postApi.detail(id));
    } catch (e) {
      setPostError(e);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    setCommentError(null);
    try {
      setComments(toPage(await commentApi.list(id, { page })));
    } catch (e) {
      setCommentError(e);
    }
  }, [id, page]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const mine = user && post && post.author?.memberId === user.id;

  // 상세를 다시 조회하면 조회수가 올라가므로 좋아요 응답({ liked, likeCount })으로만 갱신
  const toggleLike = async () => {
    setActionError(null);
    try {
      const res = await (post.likedByMe ? postApi.unlike(id) : postApi.like(id));
      setPost((prev) => ({ ...prev, likedByMe: res.liked, likeCount: res.likeCount }));
    } catch (e) {
      setActionError(e);
    }
  };

  const removePost = async () => {
    if (!window.confirm('게시글을 삭제할까요?')) return;
    setActionError(null);
    try {
      await postApi.remove(id);
      navigate('/community');
    } catch (e) {
      setActionError(e);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    setCommentError(null);
    try {
      await commentApi.create(id, { content: newComment });
      setNewComment('');
      await loadComments();
    } catch (err) {
      setCommentError(err);
    }
  };

  return (
    <div>
      <ErrorText error={postError} />
      {post &&
        (editing ? (
          <PostEditForm
            post={post}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              loadPost();
            }}
          />
        ) : (
          <div className="card">
            <h1>{post.title}</h1>
            <p className="muted">
              {post.author?.nickname} · 조회 {post.viewCount} · 댓글 {post.commentCount} · {post.createdAt}
              {post.updatedAt && post.updatedAt !== post.createdAt && ` (수정 ${post.updatedAt})`}
            </p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
            <div className="row">
              <button className="small" disabled={!user} onClick={toggleLike}>
                {post.likedByMe ? '♥' : '♡'} {post.likeCount}
              </button>
              {mine && (
                <>
                  <button className="small" onClick={() => setEditing(true)}>
                    수정
                  </button>
                  <button className="small danger" onClick={removePost}>
                    삭제
                  </button>
                </>
              )}
              {user && !mine && (
                <button className="small" onClick={() => setReporting((v) => !v)}>
                  신고
                </button>
              )}
            </div>
            {reporting && <ReportForm onSubmit={(body) => postApi.report(id, body)} onClose={() => setReporting(false)} />}
            <ErrorText error={actionError} />
          </div>
        ))}

      <h2>댓글</h2>
      {user ? (
        <form className="row" onSubmit={addComment} style={{ marginBottom: 12 }}>
          <input
            style={{ flex: 1 }}
            placeholder="댓글 (500자 이하)"
            value={newComment}
            maxLength={500}
            onChange={(e) => setNewComment(e.target.value)}
            required
          />
          <button className="primary">등록</button>
        </form>
      ) : (
        <p className="muted">로그인하면 댓글을 쓸 수 있습니다.</p>
      )}
      <ErrorText error={commentError} />
      {comments.content.map((c) => (
        <CommentItem
          key={c.commentId}
          postId={id}
          comment={c}
          me={user}
          onChanged={loadComments}
        />
      ))}
      <Pager page={comments.number} totalPages={comments.totalPages} onChange={setPage} />
    </div>
  );
}
