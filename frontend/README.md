# eGov Enterprise Modernization - Frontend

전자정부 표준프레임워크 5.0 기반 엔터프라이즈 모더니제이션 프로젝트의 **Next.js 16 (App Router)** 프런트엔드 애플리케이션입니다.

## 🛠 주요 기술 스택

- **Framework**: Next.js 16.2.x (App Router, cacheComponents/PPR)
- **Library**: React 19.2.x
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

### 4. UI 기본 컴포넌트 추가(shadcn CLI)
`src/components/ui` 의 기본 컴포넌트는 shadcn CLI 로 가져온 소스를 저장소가 직접 소유한다. CLI 는 의존성으로 두지 않는다 — 상시 설치하면 쓰지 않는 하위 트리가 보안 override 를 늘린다(2026-10-07 제거). 컴포넌트를 추가할 때만 버전을 고정해 실행한다. 설정은 `components.json` 이다.
```bash
pnpm dlx shadcn@<고정버전> add <component>
```

## 📂 주요 구조

- `src/app`: App Router 기반 페이지 구성
- `src/components`: UI 및 비즈니스 컴포넌트
- `src/services`: API 통신 레이어 (Axios / TanStack Query)
- `src/types`: TypeScript 인터페이스 정의
- `src/hooks`: 커스텀 훅 (인증, 공통 기능 등)

---
