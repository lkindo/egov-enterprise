# eGov Enterprise Modernization - Frontend

전자정부 표준프레임워크 5.0 기반 엔터프라이즈 모더니제이션 프로젝트의 **Next.js 16 (App Router)** 프런트엔드 애플리케이션입니다.

## 🛠 주요 기술 스택

- **Framework**: Next.js 16.2.x (App Router, cacheComponents/PPR)
- **Library**: React 19.0.0
- **Styling**: Tailwind CSS 4, 시맨틱 디자인 토큰
- **Data Fetching**: Axios(동일 출처 `/api/v1` 프록시), TanStack Query 5.x
- **State Management**: Zustand, React Context
- **Real-time**: STOMP over SockJS (동일 출처 `/ws` 프록시)
- **Validation**: Zod + React Hook Form
- **Language**: 한국어 UI (`html lang="ko"`), API 오류 ko/en 협상은 백엔드가 담당

## 🚀 시작하기

### 1. 의존성 설치
```bash
pnpm install
```

### 2. 개발 서버 실행
```bash
pnpm dev
```

### 3. 빌드 및 타입 체크
```bash
pnpm type-check
pnpm build
```

## 📂 주요 구조

- `src/app`: App Router 기반 페이지 구성
- `src/components`: UI 및 비즈니스 컴포넌트
- `src/services`: API 통신 레이어 (Axios / TanStack Query)
- `src/types`: TypeScript 인터페이스 정의
- `src/hooks`: 커스텀 훅 (인증, 공통 기능 등)

---
*Last Updated: 2026-08-15 (Next.js 16 · 동일 출처 프록시 · 한국어 UI 제품정책 · 시맨틱 토큰 반영)*
