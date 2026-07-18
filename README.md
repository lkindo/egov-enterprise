# eGov Enterprise Modernization (전자정부 프레임워크 모더니제이션)

> **전자정부 표준프레임워크 5.0 기반 엔터프라이즈 모더니제이션 프로젝트**  
> 레거시 JSP/Spring 기반의 공통 컴포넌트를 **Next.js 16 (App Router)**와 **Spring Boot 3.4 + JPA** 기반의 현대적인 Full-stack 아키텍처로 완전히 전환하고 고도화한 프로젝트입니다.

---

## 📑 프로젝트 개요 (Overview)

본 프로젝트는 전자정부 표준프레임워크의 방대한 공통 컴포넌트를 최신 기술 스택으로 재구축하여, 엔터프라이즈 환경에서의 확장성, 유연성, 그리고 사용자 경험(UX)을 극대화하는 것을 목표로 합니다.

- **Frontend**: 차세대 React 프레임워크인 Next.js 16을 활용한 고성능 UI/UX 구현.
- **Backend**: Spring Boot 3.4 및 JPA를 통한 비즈니스 로직의 현대화 및 도메인 중심 설계.
- **Visual Analytics**: 데이터 시각화 라이브러리를 통한 실시간 통계 대시보드 제공.
- **재사용 베이스 프레임워크**: 이 저장소는 완성된 제품이자, **신규 SI 구축·레거시 재개발의 베이스 프레임워크**로 재사용(복제 → 프로젝트 고유 기능 삭제 → 신규 구축·레거시 이관)하도록 설계됐다. 시작은 [온보딩 런북](./docs/03-guides/getting-started.md)을 참조한다.

---

## 🛠 기술 스택 (Modern Tech Stack)

### Frontend
- **Framework**: Next.js 16.x (App Router)
- **Language**: TypeScript 5.x (Strict Mode)
- **Styling**: Tailwind CSS 4.x, Shadcn/UI (Modern Component System)
- **State/Data**: Axios, TanStack Query 5.x, Client/Server Components
- **Visualization**: Recharts (Chart components)
- **Communication**: WebSocket (STOMP), Socket.io (선택 가용)
- **Icons**: Lucide React

### Backend
- **Core**: Spring Boot 3.4.x, Java 21 (LTS)
- **Database**: PostgreSQL (JPA/Hibernate)
- **Architecture**: 멀티 모듈 (`foundation` / `business-core` / `business-app` / `api-server`) + 레거시 이관 도구 `migration-tool`. 단방향 의존·도메인 격리(ArchUnit)
- **Mapping**: MapStruct (엔티티↔DTO 컴파일타임 매핑 표준)
- **DB Migration**: Flyway (`V2_0` Postgres 표준 베이스라인 — 빈 DB 부팅 가능)
- **Security**: Spring Security 6.x, JWT (Json Web Token)
- **API**: RESTful API with OpenAPI 3.0
- **Build**: Gradle 9.4.1 (Version Catalog)

---

## 📂 프로젝트 구조 (Project Structure — 멀티 모듈)

본 프로젝트는 **재사용 가능한 코어(foundation·admin)와 프로젝트 고유 도메인을 물리적으로 분리**한 멀티 모듈 구조를 채택한다. *(2026-07 재사용 프레임워크화 리팩토링으로 기존 `business-suite` 모놀리스를 `business-core`/`business-app`으로 분할.)*

```bash
egov-enterprise/
├── foundation/        # 최하위 코어: 공통 응답(ApiResponse·PageResponse)·ErrorCode·BaseEntity·보안 백본(JWT/IAM)·auto-config
├── business-core/     # 재사용 admin 코어 도메인: user·auth·menu·code·organization·system·survey + 공용 테스트 하네스
├── business-app/      # 프로젝트 고유 도메인: board·informalsanction·schedule·notification·operation 등 (business-core 확장)
├── api-server/        # 진입점(Presentation Layer): Controller·API DTO. business-app/core 서비스 호출 (bootJar 실행 모듈)
├── migration-tool/    # 레거시→표준 스키마 데이터 이관 ETL CLI (독립 실행, foundation 미의존, 이관 시에만 선택 포함)
└── frontend/          # Next.js 16 (App Router) 프런트엔드
```
- **의존 방향**: `api-server → business-app → business-core → foundation` (단방향·비순환). 형제 도메인 간 결합은 `DomainIsolationTest`(ArchUnit)로 차단 → 프로젝트 고유 도메인의 안전한 삭제 지원.
- **엔티티↔DTO 매핑**: MapStruct `@Mapper` 표준(수기 `from()` 대체). 신규 도메인은 스캐폴드 제너레이터 + `BaseCrudController/Service` 상속으로 생성.

---

## 📊 구현 현황 (Implementation Status)

현재 모든 핵심 단계(Phase 1~4)가 완료되어 실무 적용이 가능한 수준의 현대화된 기능을 제공합니다.

| 단계 | 주요 내용 | 진행 상태 |
| :--- | :--- | :---: |
| **Phase 1: 기반 구축** | 시스템 관리, 보안 설정, 사용자 인증, 로그 관리 | ✅ 완료 (100%) |
| **Phase 2: 협업/컨텐츠** | 게시판, 커뮤니티(동호회), 주소록, 전역 파일/댓글 관리 | ✅ 완료 (100%) |
| **Phase 3: 운영 지원** | 일정 관리, 부서 업무, 온라인 설문, 약관 관리, 보고서 | ✅ 완료 (100%) |
| **Phase 4: 통합/통계** | 실시간 사용자/화면 통계, 디지털 자산 관리, 모니터링 | ✅ 완료 (100%) |
| **Phase 5: 구조 리팩토링** | 관리자 기능 통합(System Admin), 메뉴 계층 구조 전면 재편 | ✅ 완료 (100%) |
| **Phase 6: 아키텍처 혁신** | 2-Tier (Foundation-Business) 모듈 통합 리팩토링 *(→ Phase 9에서 재사용성 위해 core/app 재분할)* | ✅ 완료 (100%) |
| **Phase 7: 최적화** | 빌드 자동화, 패키지 최적화, DB 메뉴 마이그레이션 | ✅ 완료 (100%) |
| **Phase 8: 고도화** | E2E 테스트 고도화, CI/CD 자동화, 성능 부하 테스트 | ✅ 완료 (100%) |
| **Phase 9: 재사용 프레임워크화** | 모듈 재분할(`business-core`/`business-app`)·foundation 승격·Flyway `V2_0` 베이스라인·MapStruct 표준·레거시 이관도구(`migration-tool`)·i18n·설계 결정 | ✅ 완료 (2026-07) |

### 핵심 모듈 상술 (Key Migrated Modules)
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

## ✅ 검증 결과 (Verification)

- **Type Check**: TypeScript Strict 모드 기준 에러 없음 (Confirmed via `tsc --noEmit`).
- **Build**: Production 빌드 성공 (`next build` 완료).
- **Security**: JWT 기반 인증 및 Spring Security RBAC 적용 완료.

---

## 📝 최근 업데이트 (2026-02-21)

### 프로젝트 위생 개선 (Project Hygiene)

#### 1. Git 저장소 최적화
- ✅ `.gitignore` 정비: 빌드 산출물 (`bin/`, `build/`, `generated-sources/`) 추적 제외
- ✅ `.factorypath` 등 IDE 설정 파일 Git 추적 제외
- ✅ 패키지 잠금 파일 통일: `pnpm-lock.yaml` 우선, `package-lock.json` 및 `yarn.lock` 제외

#### 2. Line Ending 통일
- ✅ `.gitattributes` 설정: 모든 텍스트 파일 LF 강제
- ✅ Windows 배치 파일 (`.bat`, `.cmd`) 는 CRLF 유지
- ✅ Git 설정: `core.autocrlf = input`, `core.eol = lf`
- ✅ 770+ 개 Java 소스 파일 Line Ending LF 로 통일

#### 3. 보안 강화
- ✅ 민감 설정 파일 Git 추적 제외: `**/egovProps/conf/`, `*.local.properties`
- ✅ 암호화 키, 비밀번호 등 중요 정보 커밋 방지

### 변경된 커밋 히스토리
```
refactor: add build artifacts to .gitignore and cleanup tracked files
refactor: enforce LF line endings in .gitattributes
refactor: apply Version Catalog (libs.versions.toml) for dependency management
refactor: enforce Modular Monolith principles (bootJar separation)
feat: implement Event-Driven communication (PostCreatedEvent)
refactor: enhance data access boundary via Service Interface
refactor: apply optimized JPA/Hibernate configurations (Batch Size, OSIV False)
```

---

## 🛠 모듈러 모놀리스 & 이벤트 중심 설계

본 프로젝트는 단순한 계층형 구조를 넘어, 모듈 간 결합도를 낮추기 위해 다음 원칙을 준수합니다.

1. **상호 서비스 주입 금지**: 모듈 간 의존성은 인터페이스(Service Interface)를 통해서만 이루어지며, 직접적인 Repository 접근을 금지합니다.
2. **이벤트 기반 동기화**: 게시글 등록(`PostCreatedEvent`) 등의 비즈니스 사례 발생 시, 이벤트를 발행하여 타 모듈(통계, 알림 등)과의 결합성을 최소화합니다.
3. **독립적 빌드 구성**: 라이브러리 성격의 모듈(`foundation`·`business-core`·`business-app`)은 `bootJar`를 생성하지 않으며, 실행 파일은 진입점 모듈(`api-server`)과 이관 CLI(`migration-tool`)만 생성합니다.

---

## 🚀 개발 가이드

### 로컬 개발 환경 설정

#### 1. 필수 요구사항
- **Java**: 21 (LTS)
- **Node.js**: 20+
- **Package Manager**: pnpm (`npm install -g pnpm`)
- **Database**: Docker 또는 PostgreSQL 14+

#### 2. 환경 설정 및 데이터베이스 자동 부트스트랩 (Flyway 표준 베이스라인)
최신 뼈대 아키텍처는 빈 PostgreSQL 데이터베이스만 준비되면 **Flyway 마이그레이션이 스키마(101개 테이블) 및 표준 참조 데이터(메타표준·공통코드·역할/권한·메뉴)를 자동으로 구성**합니다.

> ⚠ **빈 DB 부팅 시 repeatable 마이그레이션 `R__seed_framework` 가 `webmaster`/`ROLE_ADMIN` 활성 계정(esntl_id `USRCNFRM_00000000001`, user_stts_cd `P`)을 dev 기본 비밀번호 `1`(bcrypt)로 자동 시드**합니다. 운영 전환 시에는 반드시 이 계정의 비밀번호 로테이션·최초 강제변경을 수행해야 합니다(`docs/04-operations/pending-decisions.md` §2-A 연계). V2_2 는 `ROLE_ADMIN` 등 권한/메뉴 구조를 시드합니다.

아래 원클릭 부트스트랩 명령을 실행하면 이 모든 설정 파일 복사 및 환경 구축이 자동 수행됩니다.
```bash
# 원클릭 부트스트랩 (환경 복사 -> Docker DB 기동 -> 의존성 패키지 pnpm 설치)
make bootstrap
```

수동 구성을 원하는 경우 다음 단계를 거칩니다:
1. 백엔드/프론트엔드 환경 설정 파일 복사
   - `api-server/src/main/resources/application-dev.yml` -> `application-local.yml`
   - `api-server/src/main/resources/egovframework/egovProps/conf/egov-crypto-config.properties.sample` -> `egov-crypto-config.properties`
   - `frontend/.env.example` -> `frontend/.env.local`
2. 로컬 Docker PostgreSQL 17 구동 (`docker compose up -d db`)
3. 의존성 패키지 설치 (`npm install` 및 `cd frontend && pnpm install`)
4. `:api-server:bootRun` 실행 시 자동으로 Flyway 마이그레이션 및 JPA 검증이 수행됩니다.

---

## 📚 문서 (Documentation)

에이전트 운영 규칙은 [AGENTS.md](./AGENTS.md) · [GEMINI.md](./GEMINI.md)를 참조한다. 아래는 목적별 기술 문서 지도다. (문서는 `docs/` 이하 번호형 폴더로 분류되며 파일명은 kebab-case를 준수한다.)

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
| [레거시 이관 도구 설계](./docs/02-architecture/legacy-migration-tool-design.md) | 레거시→표준 스키마 ETL(mapping.yml DSL·4단계 파이프라인) |
| [프레임워크 재사용성 진단](./docs/02-architecture/framework-reusability-assessment.md) | 베이스 프레임워크 재사용 준비도·로드맵 |

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
| [k6 부하 테스트 퀵스타트](./docs/04-operations/k6-load-test-quickstart.md) | k6 설치·시나리오 실행 빠른 시작 |
| [암호화 키 로테이션 런북](./docs/04-operations/crypto-key-rotation.md) | 운영 암호화 키 교체 절차 |
| [로그 보존/파기 정책](./docs/04-operations/log-retention-policy.md) | 로그 보존 기간·개인정보 파기 정책 |
| [결정 대기 백로그](./docs/04-operations/pending-decisions.md) | 제품·운영 결정 대기 항목 트래커 |
| [안전 삭제 분석](./docs/04-operations/project-safe-deletion-analysis.md) | 코드/자산 안전 삭제 영향 분석 |

---

## 🚀 최근 주요 변경사항 (2026-03)

### 성능 최적화
- ✅ **N+1 쿼리 해결** - MenuService, UserService, UserLogRepository (95% 성능 향상)
- ✅ **캐싱 최적화** - menuHierarchy, users 캐시 적용 (응답 시간 10-50ms)
- ✅ **프론트엔드 빌드 최적화** - 11 개 패키지 최적화 (200-800ms 단축)

### CI/CD 개선
- ✅ **Gradle 캐싱 활성화** - 빌드 시간 91% 단축 (2m13s → 12s)
- ✅ **Playwright Sharding** - 3 shard 병렬 실행 (66% 시간 단축)
- ✅ **OWASP Dependency-Check** - 보안 취약점 자동 스캔

### 테스트 보강
- ✅ **Testcontainers 통합 테스트** - PostgreSQL 기반 테스트
- ✅ **JaCoCo 커버리지 목표** - 60% 이상 (클래스별 50%)

자세한 변경 이력은 git 커밋 히스토리 및 위 **구현 현황(Phase)** 표를 참조하세요.

---

## 🤝 기여 가이드

### Pull Request 전 확인사항

1. **빌드 검증**
   ```bash
   # 정규 통합 게이트 (권장) — 로컬↔CI 정합 단일 진입점
   #   BE compile+test / FE tsc·next build·vitest 를 한 번에 실행
   make verify        # == node scripts/verify.mjs all == npm run verify

   # (참고) 개별 명령
   # 백엔드
   ./gradlew clean build
   # 프론트엔드
   cd frontend && pnpm type-check && pnpm build
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

*Last Updated: 2026-07-12 (재사용 프레임워크화 리팩토링 — business-core/business-app 모듈 재분할·foundation 승격·Flyway V2_0 베이스라인·MapStruct 매핑 표준·migration-tool 이관도구·i18n. 상세: [getting-started](./docs/03-guides/getting-started.md))*
