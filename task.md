# 태스크 관리 (Task Management)

## 📋 진행 상태 (Progress)
- [x] 서버 실행 분석 (Analyze server execution)
    - [x] 백엔드 실행 방법 확인 (Check backend execution method)
    - [x] 프론트엔드 실행 방법 및 포트 설정 확인 (Check frontend execution method and port config)
- [x] 서버 실행 (Run servers)
    - [x] 백엔드 서버 실행 (Run backend server)
    - [x] 프론트엔드 서버 3001번 포트로 실행 (Run frontend server on port 3001)
- [x] 결과 확인 및 요약 (Verify and Summarize)
- [x] 403 Forbidden 에러 디버깅 (Debug 403 Forbidden Error)
- [x] React 렌더링 중 setState 에러 디버깅 (Debug setState during render error)
- [x] 로그인 페이지 401 Unauthorized 에러 디버깅 (Debug 401 Error on login page)
    - [x] use-notifications.ts 훅에 인증 여부 확인 로직 추가 (Add auth check to use-notifications hook)
    - [x] AuthContext.tsx의 checkAuth에 토큰 존재 및 JWT 만료 여부 확인 로직 추가 (Add token & JWT expiration check)
    - [x] 백엔드 ApiSecurityConfig에 JwtAuthenticationFilter 등록 (Register JwtAuthenticationFilter in backend)
- [x] 로그인 페이지 배경 이미지 404 에러 해결 (Fix 404 error for login background image)
- [x] 로그인 성공 후 세션 유지 문제 해결 (Debug login session persistence)
    - [x] AuthContext의 login 함수에서 토큰 저장 및 유저 정보 처리 수정 (Fix token storage and user handling in login)
    - [x] public/images 디렉토리 생성 및 이미지 파일 추가 (Create dir and add image)

## 📝 작업 기록 (Work Log)
- **2026-02-24**: 
    - 백엔드(Port 8080) 및 프론트엔드(Port 3001) 서버 실행 완료.
    - 백엔드: `./gradlew :api-server:bootRun`
    - 프론트엔드: `npx next dev -p 3001 --webpack`
- **2026-02-24 (13:31)**: 프론트엔드 `/api/v1/auth/token/refresh` 요청 시 403 Forbidden 에러 발생 보고됨.
    - 원인 1: 백엔드 CORS 허용 목록에 3001 포트 누락.
    - 원인 2: 백엔드 Security 설정에 토큰 재발급 API 허용 누락.
    - 원인 3: 프론트엔드 API 경로가 백엔드와 불일치 (`/token/refresh` vs `/reissue`).
    - 조치: 백엔드 설정 수정 및 백엔드 서버 재시작, 프론트엔드 경로 수정 완료.
- **2026-02-24 (13:35)**: `Cannot update a component (Router) while rendering` 에러 발생 보고됨.
    - 원인: React 렌더링 과정에서 직접 `router.push()`를 호출하여 상태 변경 충돌 발생.
    - 조치: 리다이렉트 로직을 `useEffect` 내부로 이동시키고, 로딩 블록을 통합하여 렌더링 안정성 확보.
- **2026-02-24 (13:38)**: 로그인 페이지에서 `/api/v1/notifications` 401 에러 발생 보고됨.
    - 원인: 헤더에 포함된 알림 훅(`useNotifications`)이 로그인 여부와 관계없이 API를 호출함.
    - 조치: `useNotifications` 내부에서 `user` 객체가 존재할 때만 API를 호출하도록 수정.
- **2026-02-24 (13:40)**: 로그인 페이지에서 `/api/v1/auth/me` 401 에러 발생 보고됨.
    - 원인: `AuthContext`의 `checkAuth`가 페이지 로드 시 토큰 유무와 상관없이 인증 확인 API를 호출함.
    - 조치: `localStorage`에 `accessToken`이 존재할 때만 API를 호출하도록 방어 로직 추가.
- **2026-02-24 (13:41)**: 만료된 토큰으로 인한 `/api/v1/auth/me` 401 에러 조치.
    - 조치: `isTokenExpired` 유틸리티를 추가하여 서버 요청 전 JWT 만료 여부를 클라이언트에서 1차 검증하도록 개선.
- **2026-02-24 (13:42)**: 로그인 페이지 배경 이미지(`login-bg.jpg`) 404 에러 발생 보고됨.
    - 조치: `public/images` 폴더를 생성하고 AI로 생성한 전문적인 사무 공간 이미지를 추가(`login-bg.png`)한 뒤 소스 코드의 경로를 수정함.
- **2026-02-24 (13:46)**: 로그인 성공 후에도 `/api/v1/auth/me` 401 에러 지속 발생 보고됨.
    - 원인: 백엔드 `ApiSecurityConfig`에 JWT 토큰을 해석하여 인증 정보를 설정하는 `JwtAuthenticationFilter`가 등록되어 있지 않았음.
    - 조치: `ApiSecurityConfig`를 수정하여 `JwtAuthenticationFilter`를 필터 체인에 추가하고 백엔드 서버 재시작.
