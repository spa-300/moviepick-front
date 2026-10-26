# moviepick-front

MoviePick 백엔드(`../moviepick`)와 연동해 실제 사용자 흐름(로그인 → 영화 → 리뷰 → 커뮤니티 → 후원)을 화면으로 확인하는 프론트엔드입니다.
디자인은 최소화했고, 오른쪽 **개발 로그 패널**에서 모든 요청·응답을 볼 수 있습니다.

- Vite + React (JavaScript), react-router-dom
- 스타일은 `src/styles.css` 한 파일
- 결제: `@portone/browser-sdk` (V2)

## 실행 방법

필요: Node.js `^20.19.0` 또는 `>=22.12.0` (Vite 8 요구 사항)

1. **백엔드를 먼저 실행**합니다. (`../moviepick`, 기본 `http://localhost:8080`)
2. 의존성 설치
   ```bash
   npm install
   ```
3. 개발 서버 실행 (포트 5173 고정, 사용 중이면 실패)
   ```bash
   npm run dev
   ```
4. 브라우저에서 http://localhost:5173 접속

## 필요한 백엔드 설정

| 항목 | 내용 |
| --- | --- |
| CORS | `SecurityConfig.corsConfigurationSource()`에 `http://localhost:5173` 허용, `allowCredentials(true)`, 허용 헤더 `Authorization`, `Content-Type`, `X-XSRF-TOKEN` (현재 설정되어 있음) |
| 카카오 로그인 | `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`. 성공 시 `http://localhost:5173/oauth2/success`로 리다이렉트 (현재 하드코딩) |
| TMDB | `TMDB_ACCESS_TOKEN` (관리자 "영화 불러오기"에 필요) |
| PortOne | `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`(결제창), `PORTONE_API_SECRET`(결제 확인). storeId/channelKey가 비어 있으면 후원 화면에 안내 문구만 나옵니다 |
| JWT | `JWT_SECRET` |
| 관리자 계정 | DB에서 회원의 `role`을 `ADMIN`으로 바꿔야 관리자 화면·영화 불러오기가 보입니다 |

## API 연결부 (`src/api/client.js`)

- 모든 요청에 `credentials: 'include'`
- 응답 본문에 `data`가 있으면 `data`를, 없으면 본문 전체를 결과로 사용 (ApiResponse로 감싼 응답과 감싸지 않은 응답 모두 지원)
- **CSRF**: 앱 시작 시 `GET /api/auth/csrf`로 받은 `token`(또는 `data.token`)을 GET이 아닌 모든 요청의 `X-XSRF-TOKEN` 헤더에 넣음. GET이 아닌 요청이 403이면 CSRF를 새로 받아 1회 재시도
- **JWT**: 로그인 응답의 `data.accessToken`을 메모리에만 저장(localStorage 사용 안 함), `Authorization: Bearer ...`
- **401**: `POST /api/auth/refresh`로 새 accessToken을 받아 1회 재시도. refresh도 실패하면 로그아웃 상태로 전환
- **공개 GET이 401**: Authorization 없이 1회 재시도하고, 뒤에서 refresh를 시도 (만료 토큰에 401을 주는 백엔드 문제 우회)
- 회원가입·로그인·로그아웃·CSRF·refresh 요청에는 Authorization을 붙이지 않음
- 새로고침 시 CSRF → refresh → `GET /api/members/me`로 로그인 상태 복구
- 모든 요청·응답(메서드, 주소, 상태 코드, 본문, 재시도 사유, Authorization 유무)을 개발 로그 패널로 전송
- 페이지 응답은 `toPage()`가 Spring `Page`(직접 직렬화 / `page:{...}` 형태)와 `PageResponse`를 같은 모양으로 맞춤

## 화면별 확인 순서

1. **/login** — 회원가입(이메일, 비밀번호 8자 이상, 닉네임) → 로그인. 위쪽 바에 닉네임·역할이 보이는지, 로그 패널에 `csrf → login → members/me`가 찍히는지 확인
2. **새로고침** — 로그인 상태가 유지되는지(로그 패널에 `csrf → refresh → members/me`)
3. **카카오로 로그인** — `/oauth2/success`에서 CSRF 발급 → refresh → 내 정보 조회 → 영화 화면 이동 단계가 차례로 표시되는지
4. **/movies** — (관리자) pages 1~5 선택 후 "영화 불러오기" → 목록·검색·페이지 이동
5. **/movies/:id** — 로그아웃 상태에서도 상세·리뷰 목록이 보이는지. 로그인 후 리뷰 작성(평점 0.5~5.0)·수정·삭제·좋아요, 정렬 변경
6. **/community** — 목록·검색·정렬, 글쓰기
7. **/community/:id** — 수정(제목만 바꿔 저장 가능), 삭제, 좋아요, 신고(ETC는 상세 필수), 댓글 작성·수정·삭제·좋아요·신고. 신고·수정·삭제 버튼은 작성자 여부에 따라 보임
8. **/admin** (관리자) — 신고 목록에서 승인/거절, 회원 목록(상태별), 정지 해제
9. **/support** — 3000/6000/9000원 선택 → 후원 생성 응답 확인 → PortOne 결제창(테스트 채널) → 결제 확인 결과(COMPLETED/FAILED/PENDING)
10. **토큰 만료 확인** — 30분 뒤(또는 백엔드에서 access 만료 시간을 줄여) 요청하면 로그 패널에 `401 → refresh → 재시도`가 보이는지

## 파일 구조

```
moviepick-front/
├─ index.html
├─ package.json
├─ vite.config.js          포트 5173 고정 (strictPort)
├─ .env.development        VITE_API_BASE_URL
├─ .gitignore
└─ src/
   ├─ main.jsx             Router + AuthProvider 연결
   ├─ App.jsx              레이아웃(위쪽 바 / 본문 / 로그 패널)과 라우트
   ├─ styles.css           전체 스타일 (다크)
   ├─ api/
   │  ├─ client.js         fetch 래퍼: CSRF, JWT, refresh, 재시도, 응답 unwrap, 로그 전송
   │  └─ endpoints.js      컨트롤러별 API 함수 (경로·본문을 백엔드 DTO에 맞춤)
   ├─ auth/
   │  └─ AuthContext.jsx   로그인 사용자 상태, 시작 시 복구, 로그인/로그아웃
   ├─ components/
   │  ├─ TopBar.jsx        메뉴, 로그인 사용자(닉네임·역할), 로그아웃
   │  ├─ DevLogPanel.jsx   요청 로그(펼쳐 보기, 비우기)
   │  ├─ Pager.jsx         이전/다음 페이지
   │  ├─ ReportForm.jsx    게시글·댓글 신고 폼
   │  └─ ErrorText.jsx     오류 메시지 표시
   └─ pages/
      ├─ LoginPage.jsx         회원가입, 로그인, 카카오 로그인
      ├─ OAuthSuccessPage.jsx  소셜 로그인 후 단계별 처리
      ├─ OAuthFailPage.jsx     소셜 로그인 실패 사유
      ├─ MovieListPage.jsx     영화 목록·검색, 관리자 영화 불러오기
      ├─ MovieDetailPage.jsx   영화 상세, 리뷰 CRUD·좋아요
      ├─ PostListPage.jsx      게시글 목록·검색·글쓰기
      ├─ PostDetailPage.jsx    게시글 상세·수정·삭제·좋아요·신고, 댓글
      ├─ AdminPage.jsx         신고 처리, 회원 목록
      └─ SupportPage.jsx       후원 생성 → PortOne 결제 → 결제 확인
```