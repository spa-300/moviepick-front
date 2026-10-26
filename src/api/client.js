// 백엔드와 통신하는 단일 진입점.
// - 모든 요청에 credentials: 'include' (refreshToken 쿠키, XSRF-TOKEN 쿠키 전송)
// - 응답 본문에 data가 있으면 data, 없으면 본문 전체를 결과로 사용
// - CSRF / JWT / refresh / 재시도 규칙은 README의 "API 연결부" 참고
// - 모든 요청·응답을 개발 로그 패널로 보낸다

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

// ---------- 상태 (메모리 전용, localStorage 사용 안 함) ----------

let accessToken = null;
let csrfToken = null;
let csrfPromise = null;
let refreshPromise = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

// 인증 만료(refresh 실패) 시 화면에 알리기 위한 구독
const authExpiredListeners = new Set();

export function onAuthExpired(listener) {
  authExpiredListeners.add(listener);
  return () => authExpiredListeners.delete(listener);
}

function expireAuth() {
  accessToken = null;
  authExpiredListeners.forEach((listener) => listener());
}

// ---------- 개발 로그 ----------

const logListeners = new Set();
let logSeq = 0;

export function onLog(listener) {
  logListeners.add(listener);
  return () => logListeners.delete(listener);
}

function emitLog(entry) {
  const full = { id: ++logSeq, time: new Date(), ...entry };
  logListeners.forEach((listener) => listener(full));
}

// ---------- 오류 ----------

export class ApiError extends Error {
  constructor(status, body) {
    const message =
      (body && typeof body === 'object' && body.message) ||
      (typeof body === 'string' && body) ||
      (status === 0 ? '서버에 연결할 수 없습니다.' : `HTTP ${status}`);
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function errorMessage(e) {
  if (e instanceof ApiError) return `[${e.status}] ${e.message}`;
  return e?.message || String(e);
}

// ---------- 경로 규칙 ----------

// Authorization 헤더를 붙이지 않는 요청
const NO_AUTH_PATHS = new Set([
  '/api/auth/members',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/csrf',
  '/api/auth/refresh',
]);

// SecurityConfig에서 permitAll인 GET 경로
const PUBLIC_GET_PATTERNS = [
  /^\/api\/movies$/,
  /^\/api\/movies\/[^/]+$/,
  /^\/api\/movies\/[^/]+\/reviews$/,
  /^\/api\/community\/posts$/,
  /^\/api\/community\/posts\/[^/]+$/,
  /^\/api\/community\/posts\/[^/]+\/comments$/,
  /^\/api\/community\/posts\/[^/]+\/likes$/,
];

function pathOnly(path) {
  return path.split('?')[0];
}

function isPublicGet(method, path) {
  return method === 'GET' && PUBLIC_GET_PATTERNS.some((re) => re.test(pathOnly(path)));
}

export function unwrap(body) {
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body) {
    return body.data;
  }
  return body;
}

// ---------- 저수준 전송 ----------

async function send(method, path, body, withAuth, retry) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;
  const sentAuth = Boolean(withAuth && accessToken);
  if (sentAuth) headers.Authorization = `Bearer ${accessToken}`;

  const url = API_BASE_URL + path;
  const started = performance.now();
  let status = 0;
  let resBody = null;
  let networkError = null;

  try {
    const res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    status = res.status;
    const text = await res.text();
    if (text) {
      try {
        resBody = JSON.parse(text);
      } catch {
        resBody = text;
      }
    }
  } catch (e) {
    networkError = e.message || String(e);
  }

  emitLog({
    method,
    url,
    status,
    requestBody: body,
    responseBody: networkError ? { networkError } : resBody,
    retry,
    auth: sentAuth,
    durationMs: Math.round(performance.now() - started),
  });

  return { status, ok: status >= 200 && status < 300, body: resBody, sentAuth };
}

// ---------- CSRF / refresh ----------

export function fetchCsrf() {
  if (!csrfPromise) {
    csrfPromise = (async () => {
      const res = await send('GET', '/api/auth/csrf', undefined, false, null);
      if (!res.ok) throw new ApiError(res.status, res.body);
      const token = res.body?.token ?? res.body?.data?.token;
      if (!token) throw new Error('CSRF 응답에 token이 없습니다.');
      csrfToken = token;
      return token;
    })().finally(() => {
      csrfPromise = null;
    });
  }
  return csrfPromise;
}

// 성공하면 새 accessToken 저장 후 true. 실패하면 로그아웃 상태로 전환하고 false.
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const data = await request('POST', '/api/auth/refresh');
        if (!data?.accessToken) throw new Error('refresh 응답에 accessToken이 없습니다.');
        accessToken = data.accessToken;
        return true;
      } catch {
        expireAuth();
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ---------- 공개 요청 함수 ----------

export async function request(method, path, body) {
  const withAuth = !NO_AUTH_PATHS.has(pathOnly(path));

  if (method !== 'GET' && !csrfToken) {
    await fetchCsrf().catch(() => {});
  }

  let res = await send(method, path, body, withAuth, null);

  // 403: CSRF를 새로 받아 1회 재시도
  if (res.status === 403 && method !== 'GET') {
    try {
      await fetchCsrf();
      res = await send(method, path, body, withAuth, 'CSRF 재발급 후 재시도');
    } catch {
      // CSRF 발급 실패 시 원래 응답을 그대로 사용
    }
  }

  // 401: Authorization을 보냈던 요청만 처리
  if (res.status === 401 && withAuth && res.sentAuth) {
    if (isPublicGet(method, path)) {
      // 만료 토큰으로 공개 GET이 401이 되는 문제 우회: Authorization 없이 재시도
      res = await send(method, path, body, false, '공개 GET: Authorization 없이 재시도');
      // 다음 요청을 위해 토큰은 뒤에서 갱신
      refreshAccessToken();
    } else if (await refreshAccessToken()) {
      res = await send(method, path, body, true, 'refresh 후 재시도');
    }
  }

  if (!res.ok) throw new ApiError(res.status, res.body);
  return unwrap(res.body);
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};

// 쿼리 문자열 생성 (빈 값은 제외)
export function qs(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, value);
  });
  const s = search.toString();
  return s ? `?${s}` : '';
}

// Spring Page(직접 직렬화 / VIA_DTO)와 PageResponse를 모두 같은 모양으로 맞춘다
export function toPage(p) {
  if (!p || typeof p !== 'object') return { content: [], number: 0, totalPages: 0, totalElements: 0 };
  const meta = p.page && typeof p.page === 'object' ? p.page : p;
  return {
    content: p.content ?? [],
    number: meta.number ?? (typeof p.page === 'number' ? p.page : 0),
    totalPages: meta.totalPages ?? 0,
    totalElements: meta.totalElements ?? 0,
  };
}
