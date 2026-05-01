# Tech Stack

## Frontend

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Next.js (App Router) | 16.2.x |
| **UI Core** | React | 19.0.0 |
| **Language** | TypeScript | 5.x (Strict Mode) |
| **Styling** | Tailwind CSS | 4.x |
| **State Management** | TanStack Query | 5.90.x |
| **UI Components** | Shadcn/UI (Radix UI) | Latest |
| **Form Management** | React Hook Form + Zod | Latest |
| **Animations** | Framer Motion / tw-animate-css | Latest |
| **Testing** | Playwright (E2E), Vitest (Unit) | Latest |

## Backend

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Spring Boot | 3.4.1 |
| **Language** | Java | 21 (LTS) |
| **Database** | OCI PostgreSQL | 17 |
| **ORM** | Spring Data JPA / Hibernate | 6.x |
| **API Spec** | SpringDoc OpenAPI | 3.0 |
| **Build** | Gradle (Multi-project) | 9.x |
| **Quality** | JaCoCo (Target 50%+) | Latest |

## Infrastructure & Tools

| Category | Technology | Version |
|----------|------------|---------|
| **Orchestration** | Superpowers CCG (AI-Driven) | 1.3.x |
| **Code Analysis** | Next Bundle Analyzer / LHCI | Latest |
| **API Gen** | openapi-typescript | 7.x |

## Project Structure (Multi-Module)

본 프로젝트는 의존성 전이 및 유지보수 효율을 위해 계층화된 멀티 모듈 구조를 채택합니다.

- **`api-server`**: 애플리케이션 진입점. 외부 노출 API 컨트롤러 및 Swagger 설정을 포함하며 최종 빌드 결과물(Executable Jar)을 생성합니다.
- **`business-suite`**: 핵심 비즈니스 로직 계층. 게시판, 설문, 협업 모듈 등 도메인별 서비스와 레포지토리를 포함합니다.
- **`foundation`**: 시스템 공통 기반 계층. 보안(Security), 공통 설정(Config), 예외 처리, 유틸리티 및 전역 Entity 클래스를 포함합니다.
- **`frontend`**: Next.js 16 기반의 프론트엔드 애플리케이션.

---
*Last Updated: 2026-05-01 (Updated via Antigravity)*
