# eGov Enterprise Modernization (전자정부 프레임워크 모더니제이션)

> **전자정부 표준프레임워크 5.0 기반 엔터프라이즈 모더니제이션 프로젝트**  
> 레거시 JSP/Spring 기반의 공통 컴포넌트를 **Next.js 16 (App Router)**와 **Spring Boot 3.5 + JPA** 기반의 현대적인 Full-stack 아키텍처로 전환한 프로젝트입니다.

---

## 📑 프로젝트 개요 (Overview)

본 프로젝트는 전자정부 표준프레임워크의 방대한 공통 컴포넌트를 최신 기술 스택으로 재구축하여, 엔터프라이즈 환경에서의 확장성, 유연성, 그리고 사용자 경험(UX)을 극대화하는 것을 목표로 합니다.

- **Frontend**: 차세대 React 프레임워크인 Next.js 16을 활용한 고성능 UI/UX 구현.
- **Backend**: Spring Boot 3.5 및 JPA를 통한 비즈니스 로직의 현대화 및 도메인 중심 설계.
- **Visual Analytics**: 데이터 시각화 라이브러리를 활용한 통계 대시보드 제공.
- **재사용 베이스 프레임워크**: 이 저장소는 **신규 SI 구축·레거시 재개발을 위한 참조 구현과 재사용 베이스**다. 프로필 기반 추출과 레거시 이관 경계는 구현되어 있으나, 운영 투입 전에는 [활성 gap](./.agent/memory/known-gaps.md)과 환경별 검증을 확인한다. 시작은 [온보딩 런북](./docs/03-guides/getting-started.md)을 참조한다.

---

## 🛠 기술 스택 (Modern Tech Stack)

### Frontend
- **Framework**: Next.js 16.x (App Router)
- **Language**: TypeScript 5.x (Strict Mode)
- **Styling**: Tailwind CSS 4.x, Shadcn/UI (Modern Component System)
- **State/Data**: Axios, TanStack Query 5.x, Client/Server Components
- **Visualization**: Recharts (Chart components)
- **Communication**: WebSocket (STOMP/SockJS)
- **Icons**: Lucide React

### Backend
- **Core**: Spring Boot 3.5.16, Java 21 (LTS)
- **Database**: PostgreSQL (JPA/Hibernate)
- **Architecture**: 멀티 모듈 (`foundation` / `business-core` / `business-app` / `api-server`) + 레거시 이관 도구 `migration-tool`. 단방향 의존·도메인 격리(ArchUnit)
- **Mapping**: MapStruct (엔티티↔DTO 컴파일타임 매핑 표준)
- **DB Migration**: Flyway (`V2_0` Postgres 표준 베이스라인 — 빈 DB 부팅 가능)
- **Security**: Spring Security 6.x, JWT (Json Web Token)
- **API**: RESTful API with OpenAPI 3.0
- **Build**: Gradle 9.6.1 (Version Catalog)

---

## 📂 프로젝트 구조 (Project Structure — 멀티 모듈)

본 프로젝트는 **재사용 가능한 코어(`foundation`·`business-core`)와 프로젝트 고유 도메인을 물리적으로 분리**한 멀티 모듈 구조를 채택한다. 현재 제품 경계의 정본은 [ADR-0001](./docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md)이다.

```bash
egov-enterprise/
├── foundation/        # 최하위 코어: 공통 응답(ApiResponse·PageResponse)·ErrorCode·BaseEntity·보안 백본(JWT/IAM)·auto-config
├── business-core/     # 재사용 필수 코어: user·auth·menu·code·organization·policy + 공용 테스트 하네스
├── business-app/      # 선택/참조 도메인: board·survey·community·banner·popup·operation 등 (business-core 확장)
├── api-server/        # 진입점(Presentation Layer): Controller·API DTO. business-app/core 서비스 호출 (bootJar 실행 모듈)
├── migration-tool/    # 레거시→표준 스키마 데이터 이관 ETL CLI (독립 실행, foundation 미의존, 이관 시에만 선택 포함)
└── frontend/          # Next.js 16 (App Router) 프런트엔드
```
- **의존 방향**: `api-server → business-app → business-core → foundation` (단방향·비순환). 형제 도메인 간 결합은 `DomainIsolationTest`(ArchUnit)로 차단 → 프로젝트 고유 도메인의 안전한 삭제 지원.
- **엔티티↔DTO 매핑**: MapStruct `@Mapper` 표준(수기 `from()` 대체). 신규 도메인은 스캐폴드 제너레이터(`scripts/generate-domain.ps1`)로 골격을 뽑되, Service·Controller 는 [getting-started §5.2.1](docs/03-guides/getting-started.md) 의 실존 관례(`ApiResponse` 래퍼·`@PreAuthorize`·`@Transactional(readOnly=true)`·MapStruct)대로 작성한다. 제네릭 `BaseCrudController`/`BaseCrudService`는 존재하지 않으므로 상속 대상으로 가정하지 않는다.

---

## 📊 현재 제공 범위 (Current Capability Boundary)

완료율이나 과거 Phase 번호 대신 현재 모듈과 실행 가능한 기능을 기준으로 범위를 설명한다. 미해결 위험과 운영 결정은 [.agent/memory/known-gaps.md](./.agent/memory/known-gaps.md) 및 [pending-decisions.md](./docs/04-operations/pending-decisions.md)에서 확인한다.

### 핵심 기능군
- **Administrative Tools**: 공통코드, 메뉴 관리, 프로그램 관리, 로그(시스템/웹/개인정보 등) 관리.
- **Security & IAM**: 권한 관리, 롤 관리, 그룹 관리 등 정교한 RBAC 시스템.
- **Collaboration Suite**: 공지사항, 갤러리 게시판, 동호회 관리, 주소록.
- **Operational Support**: 부서/개인 일정 관리, 주간/월간 보고 승인 프로세스, 온라인 설문 참여 및 결과 조회.
- **Analytics Dashboard**: User/Screen 방문 정보 시각화 (Recharts 기반).
- **CI/CD & DevOps**: GitHub Actions 통합 파이프라인, Docker Compose 개발/운영 환경.

---

## 🎨 UI/UX 특장점

1. **Dashboard First**: 대시보드 중심의 UI로 최근 공지, 설문 현황, 주요 통계를 한눈에 확인 가능.
2. **Glassmorphism Design**: 로그인 페이지 등 주요 진입점에 현대적인 디자인 트렌드 반영.
3. **Advanced Filtering**: Shadcn/UI 기반의 고성능 데이터 테이블과 필터링 시스템.
4. **Standalone Admin Pages**: 파일 및 댓글을 전역적으로 관리할 수 있는 독립 관리자 인터페이스 추가.

---

### 로컬 개발 환경 초기화 (최초 1회 필수)
프로젝트 복제(clone) 후, 로컬 개발을 시작하기 전에 환경변수 설정, 로컬 Docker DB 실행, 그리고 의존성 패키지 설치를 한 번에 완료하기 위해 아래 명령을 실행합니다.
```bash
make bootstrap
# 또는 (Windows PowerShell)
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

### 로컬 개발 통합 실행
아래 통합 실행 명령을 호출하면 로컬 DB 구동 상태를 자동으로 확인하고, 백엔드와 프론트엔드를 동시에 실행합니다.
```bash
npm run dev
# 또는 (Windows PowerShell)
.\start-dev.ps1
```

### 개별 실행 방식
#### 1. Backend (Java/Spring)
```bash
# 루트 디렉토리에서 실행
./gradlew :api-server:bootRun
```
- API Endpoint: `http://localhost:8080/api/v1`

#### 2. Frontend (Next.js)
```bash
cd frontend
pnpm install
pnpm dev
```
- Web Interface: `http://localhost:3001`

---

## ✅ 검증 진입점 (Verification Entry Points)

- `npm run verify:docs` / `verify:fast` / `verify:push` / `verify:full`: 비용 순으로 중첩된 로컬 프로파일. 변경 범위에 맞는 최소 프로파일을 고른다. `verify:full`은 실 PostgreSQL 스키마 검증을 포함해 Docker가 필요하다.
- `npm run verify:e2e`: 브라우저 E2E. 서비스 기동이 필요해 별도로 둔다.
- `.\gradlew.bat localGate`: Docker 기반 PostgreSQL 스키마 검증, 전 모듈 테스트, JaCoCo, 프론트 단위 검증을 포함하는 병합 전 로컬 게이트.
- `npm run verify:ops`: 원격 ruleset 등 네트워크·관리 권한이 필요한 운영 점검.
- 최종 병합 권위는 [.github/required-checks.json](./.github/required-checks.json)에 결속된 required CI다.

변경 범위별 최소 검증과 문서-only fast path는 [AGENTS.md](./AGENTS.md#verification-by-change-scope)와 [.githooks/README.md](./.githooks/README.md)를 따른다.

---

## 🛠 모듈러 모놀리스 & 이벤트 중심 설계

본 프로젝트는 단순한 계층형 구조를 넘어, 모듈 간 결합도를 낮추기 위해 다음 원칙을 준수합니다.

1. **의존 방향 유지**: 상위 모듈이 하위 모듈을 호출하고, 재사용 경계는 port/interface 또는 event를 우선한다. 현재 일부 구체 서비스·타 도메인 repository 결합은 예외로 남아 있으므로 “전부 인터페이스”라고 간주하지 않으며, [활성 gap](./.agent/memory/known-gaps.md)과 격리 테스트로 축소한다.
2. **이벤트 기반 동기화**: 게시글 등록(`PostCreatedEvent`)처럼 비동기 후속 효과가 적합한 경로는 event를 사용해 결합을 줄인다. 모든 도메인 호출이 event 기반이라는 의미는 아니다.
3. **독립적 빌드 구성**: 라이브러리 성격의 모듈(`foundation`·`business-core`·`business-app`)은 `bootJar`를 생성하지 않으며, 실행 파일은 진입점 모듈(`api-server`)과 이관 CLI(`migration-tool`)만 생성합니다.

---

## 🚀 개발 가이드

### 로컬 개발 환경 설정

#### 1. 필수 요구사항
- **Java**: 21 (LTS)
- **Node.js**: 22+ (`.nvmrc` = 22, `frontend/package.json` `engines.node` = `>=22.0.0`)
- **Package Manager**: 루트 npm(`package-lock.json`), 프런트엔드 pnpm 9(`frontend/pnpm-lock.yaml`)
- **Database**: Docker 또는 PostgreSQL 17

#### 2. 환경 설정 및 데이터베이스 자동 부트스트랩 (Flyway 표준 베이스라인)
빈 PostgreSQL 데이터베이스를 준비하면 **Flyway가 스키마와 표준 참조 데이터(메타표준·공통코드·역할/권한·메뉴)를 구성**합니다. 현재 테이블·엔티티·컬럼 수는 migration에 따라 바뀌므로 README에 고정하지 않으며, CI의 PostgreSQL schema validation과 [getting-started.md](./docs/03-guides/getting-started.md) §6.1을 기준으로 확인합니다.

> ⚠ **관리자 계정 자격증명 정책**
>
> 빈 DB 부팅 시 repeatable 마이그레이션 `R__seed_framework`가 관리자 역할 계정을 만들지만 **로그인 가능한 비밀번호는 시드하지 않습니다**. 입력과 매칭되지 않는 sentinel 상태로 시작합니다.
>
> - **dev / local / e2e**: `spring.flyway.locations`가 `classpath:db/seed-dev`를 함께 적재하여 개발 전용 계정을 넣습니다. 공개 배포나 운영에 이 seed를 포함하지 않습니다.
> - **운영**: `ADMIN_INITIAL_PASSWORD` 환경변수를 주고 기동하면 `AdminPasswordProvisioner` 가 최초 1회 비밀번호를 설정합니다. 이미 설정된 비밀번호는 절대 덮어쓰지 않으며(재기동마다 되돌아가면 그 자체가 백도어), 로그인 후 즉시 변경하고 환경변수를 제거하십시오. 미설정 시 이 계정은 로그인 불가 상태로 남고 기동 로그에 경고가 남습니다.
>
> V2_2 는 `ROLE_ADMIN` 등 권한/메뉴 구조를 시드합니다.

아래 원클릭 부트스트랩 명령을 실행하면 필요한 환경 파일 준비와 로컬 개발 환경 구성이 자동 수행됩니다.
```bash
# 원클릭 부트스트랩 (환경 복사 -> Docker DB 기동 -> 의존성 패키지 pnpm 설치)
make bootstrap
```

수동 구성을 원하는 경우 다음 단계를 거칩니다:
1. 백엔드/프론트엔드 환경 설정 파일 복사
   - `api-server/src/main/resources/application-dev.yml` -> `application-local.yml`
   - `frontend/.env.example` -> `frontend/.env.local`
2. 로컬 Docker PostgreSQL 17 구동 (`docker compose up -d db`)
3. 의존성 패키지 설치 (`npm install` 및 `pnpm -C frontend install`)
4. `:api-server:bootRun` 실행 시 자동으로 Flyway 마이그레이션 및 JPA 검증이 수행됩니다.

---

## 📚 문서 (Documentation)

> 📑 **전체 문서 인덱스: [docs/README.md](./docs/README.md)** — 추적 문서의 단일 진입점이다.
> 아래 표는 **자주 쓰는 문서만 추린 발췌**이며 전량이 아니다. 찾는 문서가 없으면 위 인덱스를 볼 것.

에이전트의 프로젝트 공통 운영 규칙 SSOT는 [AGENTS.md](./AGENTS.md)다. [GEMINI.md](./GEMINI.md)와 [CLAUDE.md](./CLAUDE.md)는 각 도구의 자동 탐색을 위한 얇은 어댑터이며 별도 정책 원본이 아니다. 사용자 홈 글로벌 규칙도 도구별 네이티브 경로를 통해 로드되므로 다른 도구가 자동 상속한다고 가정하지 않는다. 아래는 목적별 기술 문서 지도다. (문서는 `docs/` 이하 번호형 폴더로 분류되며 파일명은 kebab-case를 준수한다.)

### 🏛 아키텍처 (`docs/02-architecture/`)
| 문서 | 설명 |
|------|------|
| [백엔드 아키텍처](./docs/02-architecture/backend-architecture.md) | 계층 구조·모듈 경계 단일 참조점 |
| [프론트엔드 아키텍처](./docs/02-architecture/frontend-architecture.md) | App Router·서버 컴포넌트 전략 |
| [프론트엔드 디자인 시스템](./docs/02-architecture/frontend-design-system.md) | 디자인 토큰·컴포넌트 시스템 |
| [도메인 보안 & 회복탄력성](./docs/02-architecture/domain-resilience.md) | 고가용성 로직 설계 |
| [JPA 성능 가드레일](./docs/02-architecture/jpa-performance-guardrail.md) | N+1·페치 전략 |
| [Zero-Downtime 마이그레이션](./docs/02-architecture/zero-downtime-migration.md) | Expand-and-Contract 패턴 |
| [Pitest 뮤테이션 테스트](./docs/02-architecture/pitest-mutation-testing.md) | 테스트 방어력 검증 |
| [레거시 이관 도구 설계](./docs/02-architecture/legacy-migration-tool-design.md) | 다중 source→PostgreSQL 승인형 offline ETL(discover·plan·validate·load) |
| [재사용 Base 생성 가이드](./docs/03-guides/reusable-base-guide.md) | 검증된 프로필 기반 프레임워크 추출 절차 |

### 📗 개발 지침 (`docs/03-guides/`)
| 문서 | 설명 |
|------|------|
| [온보딩 런북 (Getting Started)](./docs/03-guides/getting-started.md) | 복제→리브랜딩→부트스트랩→커스터마이징 실무 절차 |
| [오케스트레이션 프로토콜](./docs/03-guides/orchestration-protocol.md) | 태스크 등급·파이프라인 SSOT |
| [테스트 종합 가이드](./docs/03-guides/testing-guide.md) | 단위/통합/E2E 전략 SSOT |
| [E2E 운영 Runbook](./docs/03-guides/e2e-test-guide.md) | Playwright 환경·CI 최적화 |
| [API 문서화 가이드](./docs/03-guides/api-documentation-guide.md) | OpenAPI/Swagger |
| [DB 표준화 매뉴얼](./docs/03-guides/db-standardization-manual.md) | 물리 스키마 설계 실무 |
| [보안 하드닝 플레이북](./docs/03-guides/security-hardening-playbook.md) | 인증·필터·JWT |
| [CI/CD 파이프라인](./docs/03-guides/cicd-pipeline.md) | GitHub Actions |

### ⚙️ 운영 (`docs/04-operations/`)
| 문서 | 설명 |
|------|------|
| [성능 최적화 가이드](./docs/04-operations/performance-optimization-guide.md) | N+1·캐싱·FE 최적화 |
| [데이터베이스 최적화 가이드](./docs/04-operations/database-optimization-guide.md) | 인덱스·쿼리 튜닝 |
| [부하 테스트 가이드](./docs/04-operations/load-test-guide.md) | k6 부하 테스트 |
| [암호화 키 로테이션 런북](./docs/04-operations/crypto-key-rotation.md) | 운영 암호화 키 교체 절차 |
| [로그 보존/파기 정책](./docs/04-operations/log-retention-policy.md) | 로그 보존 기간·개인정보 파기 정책 |
| [결정 대기 백로그](./docs/04-operations/pending-decisions.md) | 제품·운영 결정 대기 항목 트래커 |
| [프로젝트 안전 삭제 가이드](./docs/04-operations/project-safe-deletion-analysis.md) | 프레임워크 간접 소비까지 포함한 안전 삭제 절차 |

---

## 🤝 기여 가이드

### Pull Request 전 확인사항

1. **빌드 검증**
   ```bash
   # 변경 범위에 맞춰 비용 순으로 고른다: docs < fast < push < full
   npm run verify:fast   # 컴파일·계약·타입·불변식 (가장 흔한 선택)
   npm run verify:push   # verify:fast + 거버넌스 하네스
   make verify           # == npm run verify:full — 실 PostgreSQL 스키마 검증 포함(Docker 필요)

   # Docker 사용 가능 시 병합 전 전수 로컬 게이트
   .\gradlew.bat localGate
   ```

2. **코드 포맷**
   - Java: Google Java Style 적용
   - TypeScript: ESLint + Prettier 자동 포맷팅

3. **커밋 메시지 컨벤션**
   ```
   feat: 새로운 기능
   fix: 버그 수정
   refactor: 코드 리팩토링 (기능 변경 없음)
   docs: 문서 수정
   chore: 빌드/설정 관련 변경
   ```

---

## 📞 문의 및 지원

- **이슈 트래커**: GitHub Issues
- **기술 문의**: 프로젝트 Discussions

---
