# eGov Enterprise Modernization - Frontend

전자정부 표준프레임워크 5.0 기반 엔터프라이즈 모더니제이션 프로젝트의 **Next.js 15 (App Router)** 프런트엔드 애플리케이션입니다.

## 🛠 주요 기술 스택

- **Framework**: Next.js 15.1.7 (App Router)
- **Library**: React 19.0.0
- **Styling**: Tailwind CSS 4, Shadcn/UI
- **Data Fetching**: Axios, TanStack Query 5.x
- **State Management**: Zustand, React Context
- **Real-time**: STOMP over SockJS (WebSocket)
- **Validation**: Zod + React Hook Form

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
*Last Updated: 2026-02-25*
