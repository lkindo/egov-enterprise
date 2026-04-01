# Tech Stack

## Frontend

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Next.js | 15.x (App Router) |
| **Language** | TypeScript | 5.x (Strict Mode) |
| **Styling** | Tailwind CSS | 4.x |
| **UI Library** | Shadcn/UI | Latest |
| **State Management** | TanStack Query | 5.x |
| **HTTP Client** | Axios | 1.13.x |
| **Visualization** | Recharts | Latest |
| **Icons** | Lucide React | Latest |
| **Testing** | Playwright, Vitest | Latest |

## Backend

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Spring Boot | 3.4.x |
| **Language** | Java | 21 (LTS) |
| **Database** | PostgreSQL | 14+ |
| **ORM** | JPA/Hibernate | 6.x |
| **Security** | Spring Security 6.x + JWT | Latest |
| **Build** | Gradle | 9.4.1 |
| **Architecture** | 2-Tier Modular Monolith | - |

## Infrastructure

| Category | Technology | Version |
|----------|------------|---------|
| **CI/CD** | GitHub Actions | Latest |
| **Container** | Docker | Latest |
| **Orchestration** | Docker Compose | Latest |
| **Monitoring** | JaCoCo, OWASP Dependency-Check | Latest |

## Project Structure (2-Tier)

```
egov-enterprise/
├── api-server/       # Spring Boot 진입점 (War 배포 모듈)
├── business-suite/   # 업무 도구 통합 모듈
├── foundation/       # 시스템 기반 통합 모듈
├── frontend/         # Next.js 15 프런트엔드
└── egov-libs/        # 전자정부 프레임워크 레거시 라이브러리
```
