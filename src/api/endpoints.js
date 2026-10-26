// 백엔드 컨트롤러별 API 함수. 경로·본문은 ../moviepick 의 컨트롤러와 DTO 기준.
import { api, qs, setAccessToken, fetchCsrf, refreshAccessToken } from './client';

// ---------- 인증 / 회원 (AuthController, CsrfController, MemberController) ----------

export const authApi = {
  csrf: fetchCsrf,
  refresh: refreshAccessToken,
  // SignupRequest { email, password(8자 이상), nickname(50자 이하) } → MemberResponse
  signup: (body) => api.post('/api/auth/members', body),
  // LoginRequest { email, password } → LoginResponse { memberId, nickname, role, accessToken, tokenType, expiresIn }
  login: async (body) => {
    const data = await api.post('/api/auth/login', body);
    setAccessToken(data?.accessToken);
    return data;
  },
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },
  // MemberResponse { id, email, nickname, role, status }
  me: () => api.get('/api/members/me'),
};

// ---------- 영화 (MovieController, AdminMovieController) ----------

export const movieApi = {
  // Page<MovieListResponse { id, title, releaseDate, voteAverage, posterUrl }> (ApiResponse로 감싸지 않음)
  list: ({ keyword, page = 0, size = 20 }) => api.get(`/api/movies${qs({ keyword, page, size })}`),
  // MovieDetailResponse (ApiResponse로 감싸지 않음)
  detail: (movieId) => api.get(`/api/movies/${movieId}`),
  // MovieSyncResponse { requestedPages, savedCount, failedCount }
  sync: (pages) => api.post(`/api/admin/movies/sync${qs({ pages })}`),
};

// ---------- 리뷰 (ReviewController) ----------

export const reviewApi = {
  // sort: latest | likes | ratingDesc | ratingAsc → PageResponse<ReviewResponse>
  listByMovie: (movieId, { sort = 'latest', page = 0, size = 20 } = {}) =>
    api.get(`/api/movies/${movieId}/reviews${qs({ sort, page, size })}`),
  // ReviewCreateRequest { rating, content, spoiler }
  create: (movieId, body) => api.post(`/api/movies/${movieId}/reviews`, body),
  // ReviewUpdateRequest { rating?, content?, spoiler? }
  update: (reviewId, body) => api.patch(`/api/reviews/${reviewId}`, body),
  remove: (reviewId) => api.delete(`/api/reviews/${reviewId}`),
  // LikeResponse { liked, likeCount }
  like: (reviewId) => api.post(`/api/reviews/${reviewId}/likes`),
  unlike: (reviewId) => api.delete(`/api/reviews/${reviewId}/likes`),
};

// ---------- 커뮤니티 (PostController, CommentController, *LikeController, CommunityReportController) ----------

export const postApi = {
  // sort: latest | popular → PageResponse<PostListResponse>
  list: ({ q, sort = 'latest', page = 0, size = 20 }) =>
    api.get(`/api/community/posts${qs({ q, sort, page, size })}`),
  detail: (postId) => api.get(`/api/community/posts/${postId}`),
  // PostCreateRequest { title, content } → PostCreateResponse { postId, title, createdAt }
  create: (body) => api.post('/api/community/posts', body),
  // PostUpdateRequest { title?, content? }
  update: (postId, body) => api.patch(`/api/community/posts/${postId}`, body),
  remove: (postId) => api.delete(`/api/community/posts/${postId}`),
  like: (postId) => api.post(`/api/community/posts/${postId}/likes`),
  unlike: (postId) => api.delete(`/api/community/posts/${postId}/likes`),
  // CommunityReportRequest { reason: SPAM|ABUSE|SPOILER|ADULT|ETC, detail }
  report: (postId, body) => api.post(`/api/community/posts/${postId}/reports`, body),
};

export const commentApi = {
  // PageResponse<CommentListResponse>
  list: (postId, { page = 0, size = 20 } = {}) =>
    api.get(`/api/community/posts/${postId}/comments${qs({ page, size })}`),
  create: (postId, body) => api.post(`/api/community/posts/${postId}/comments`, body),
  // 수정은 PUT /posts/{postId}/comments/{commentId}, 삭제는 DELETE /comments/{commentId}
  update: (postId, commentId, body) => api.put(`/api/community/posts/${postId}/comments/${commentId}`, body),
  remove: (commentId) => api.delete(`/api/community/comments/${commentId}`),
  like: (commentId) => api.post(`/api/community/comments/${commentId}/likes`),
  unlike: (commentId) => api.delete(`/api/community/comments/${commentId}/likes`),
  report: (commentId, body) => api.post(`/api/community/comments/${commentId}/reports`, body),
};

// ---------- 관리자 (AdminReportController, AdminMemberController) — ApiResponse로 감싸지 않음 ----------

export const adminApi = {
  // Page<AdminReportResponse { id, reporterId, targetType, targetId, reason, detail, status }>
  reports: (page = 0) => api.get(`/api/admin/reports${qs({ page })}`),
  // AdminReportProcessRequest { status: ACCEPTED | REJECTED }
  processReport: (id, status) => api.patch(`/api/admin/reports/${id}`, { status }),
  // Page<MemberResponse>, status: ACTIVE | SUSPENDED | WITHDRAWN
  members: ({ status, page = 0 } = {}) => api.get(`/api/admin/members${qs({ status, page })}`),
  releaseSuspension: (memberId) => api.patch(`/api/admin/members/${memberId}/status`),
};

// ---------- 후원 (SupportController) ----------

export const supportApi = {
  // SupportCreateRequest { amount: 3000|6000|9000 } → SupportCreateResponse { paymentId, amount, orderName, storeId, channelKey }
  create: (amount) => api.post('/api/supports', { amount }),
  // SupportConfirmResponse { paymentId, status, result, message }
  confirm: (paymentId) => api.post(`/api/supports/${encodeURIComponent(paymentId)}/confirm`),
};
