# Frontend Architecture

## 🚀 Overview

본 프로젝트의 프론트엔드는 **Next.js 16 (App Router)** 기반으로 구축되었으며, **React 19**의 최신 기능(Server Components, Actions 등)을 적극 활용합니다.

## 🏗️ Core Architecture

### 1. Hub & Spoke Pattern
복잡한 비즈니스 로직을 가진 모듈(설문, 협업, 관리자 등)은 단일 진입점인 `HubClient`를 통해 하위 기능을 **Tab 기반**으로 오케스트레이션합니다.
- **URL State**: `?tab=...` 쿼리 스트링을 사용하여 현재 활성화된 기능을 식별합니다.
- **Lazy Loading**: 각 탭의 무거운 컴포넌트는 `next/dynamic`을 통해 지연 로딩합니다.

### 2. Service Layer (ApiService)
모든 백엔드 통신은 `src/services/core/ApiService.ts`를 상속받은 서비스 클래스를 통해 이루어집니다.
- **자동 매핑**: 프론트엔드의 `page`(0-based)를 백엔드의 `pageIndex`(1-based)로, `size`를 `recordCountPerPage`로 자동 변환합니다.
- **Domain Partitioning**: `UserService`, `AdminService` 등으로 계층화되어 경로 관리를 자동화합니다.

### 3. State Management
- **Server State**: `TanStack Query (v5)`를 사용하여 데이터 패칭, 캐싱, 동기화를 관리합니다.
- **Global UI State**: 테마, 사이드바 상태 등 범용 UI 상태는 `React Context`를 사용합니다.
- **Form State**: `react-hook-form`과 `Zod` 스키마를 결합하여 강력한 타입 안정성과 검증을 제공합니다.

### 4. Middleware Security
`src/middleware.ts`를 통해 라우팅 레벨에서 보안 및 접근 제어를 수행합니다.
- **Session Check**: 쿠키의 `accessToken` 존재 여부를 확인하여 비인증 사용자를 `/login`으로 리다이렉트합니다.
- **RBAC (Role-Based Access Control)**: `/admin` 하위의 민감한 경로(system, user, security 등)는 `userRole`이 `ADMIN`인 경우에만 접근을 허용합니다.

## 🎨 Design System
- **Styling**: `Tailwind CSS 4`를 기반으로 한 유틸리티 퍼스트 디자인.
- **Components**: `Shadcn/UI` (Radix UI) 프리셋을 프로젝트 요구사항에 맞춰 커스텀하여 사용.
- **Animations**: `Framer Motion`을 사용하여 마이크로 인터렉션 구현.

## 📁 Directory Structure
```
frontend/
├── src/
│   ├── app/             # App Router (Pages, Layouts)
│   ├── components/      # Shared & Page-specific Components
│   ├── hooks/           # Custom React Hooks
│   ├── lib/             # Third-party Configs (axios, query-client)
│   ├── services/        # Backend API Services
│   ├── types/           # TS Definitions (Generated API types included)
│   ├── utils/           # Helper Functions
│   └── middleware.ts    # Global Middleware (Auth, RBAC)
├── public/              # Static Assets
├── tailwind.config.ts   # Tailwind CSS Config
└── next.config.ts       # Next.js Config (Rewrites, Optimization)
```

---
*Last Updated: 2026-05-01 (Updated via Antigravity)*
