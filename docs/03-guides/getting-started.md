# Getting Started — 프레임워크로 새 프로젝트 시작하기 (Onboarding Runbook)

> 이 저장소는 **신규 SI 구축 / 기존 프로젝트 재개발의 베이스 프레임워크**다. 본 런북은 `복제 → 리브랜딩 → 부트스트랩 → 기동 → 커스터마이징`의 실무 절차와 **알려진 제약**을 정리한다.
> 상위 설계 배경은 [framework-reusability-assessment.md](../02-architecture/framework-reusability-assessment.md) 참조.

---

## 0. 아키텍처 한눈에

| 레이어 | 모듈 | 역할 | 재사용 정책 |
|---|---|---|---|
| Backend Core | `foundation` | 응답봉투·예외·감사엔티티·보안백본(JWT/IAM)·crypto·i18n·config | **필수(불변 코어)** |
| Backend Admin | `business-core` | user·auth·code·menu·program·organization·log·system 등 관리 도메인 | **필수** |
| Backend App | `business-app` | 프로젝트 고유/앱 도메인(informalsanction·operation·memoreport 등) | **선택(삭제·교체 대상)** |
| Web Runtime | `api-server` | Controller·Security·Flyway·WebSocket·Batch | 필수 |
| Frontend | `frontend` | Next.js 16 App Router | 필수(화면은 선택 삭제) |

> 의존 방향: `foundation ← business-core ← business-app ← api-server` (비순환 단방향, ArchUnit 강제).

---

## 1. 사전 요구사항

- **JDK 21**, **Node ≥ 20 + pnpm**, **Docker**(로컬 DB), **PowerShell**(Windows) 또는 bash.
- Gradle/wrapper는 저장소에 포함(`./gradlew`).

---

## 2. 복제 & 리브랜딩

```powershell
# 1) 저장소 복제
git clone <this-repo> my-platform && cd my-platform

# 2) 패키지·프로젝트명 리브랜딩 (먼저 -DryRun 으로 영향 범위 확인!)
./scripts/rename-project.ps1 -NewPackage "com.mycompany" -NewProjectName "my-platform" -DryRun
./scripts/rename-project.ps1 -NewPackage "com.mycompany" -NewProjectName "my-platform"

# 3) 리브랜딩 후 컴파일 무결성 확인
./gradlew clean compileJava compileTestJava
```

> `rename-project.ps1`은 `nuri.*` 패키지·`group`·`rootProject.name`·로깅/메트릭 태그를 일괄 치환한다. **반드시 `-DryRun` 선확인** 후 실행하고, 완료 후 컴파일로 검증한다.

---

## 3. 환경 부트스트랩 (시크릿 · DB)

### 3.1 필수 시크릿 (미설정 시 운영 기동 실패 = fail-fast)

| 환경변수 | 용도 | 비고 |
|---|---|---|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | PostgreSQL 접속 | 운영은 기본값 없음(강제 주입) |
| `JWT_SECRET` | JWT 서명키 | 고엔트로피 값 필수 |
| `ALGORITHM_KEY` | PII(주민번호 등) 암복호화 마스터키 | **운영 필수**, 로테이션 시 재암호화 선행 |
| `CORS_ORIGIN_1` / `CORS_ORIGIN_2` | 운영 CORS 오리진 | `application-prod.yml` |

> 로컬/개발은 `application.yml`의 개발용 기본값으로 동작하나, **운영(`prod`) 프로필은 위 값이 없으면 기동을 거부**한다. 시크릿은 절대 커밋하지 말 것(`.gitignore`가 `*.key`/`*.pem` 차단, `pre-commit`에 gitleaks 훅 — 설치 시 스테이징 시크릿 차단).

### 3.2 로컬 DB 기동

```bash
docker compose up -d db     # postgres:17 (docker-compose.yml)
```

> ⚠ **현재 빈 DB 자동 스키마 구성은 미지원** — §6.1 참조. 로컬 개발은 기존 스키마 덤프 복원 또는 공유 DB를 가리켜 시작한다.

---

## 4. 기동 & 검증

```bash
# 개발 서버(백엔드+프론트 동시)
npm run dev              # = concurrently(API bootRun + pnpm -C frontend dev)

# 개별
npm run backend          # gradlew :api-server:bootRun
pnpm -C frontend dev
```

컴파일·타입 게이트(§0.6 HARD):

```bash
./gradlew compileJava compileTestJava     # 백엔드 컴파일 무결성
npx --prefix frontend tsc --noEmit        # (또는) cd frontend && npx tsc --noEmit
```

---

## 5. 커스터마이징

### 5.1 프로젝트 고유 기능 삭제

```powershell
# 삭제 대상 도메인의 BE(도메인/서비스/리포/API)·FE(app/services/types) 경로를 일괄 제거
./scripts/delete-domain.ps1 -DomainName "informalsanction" -DryRun   # 먼저 확인
./scripts/delete-domain.ps1 -DomainName "informalsanction"
```

> 삭제 대상 후보(business-app)와 필수 유지(business-core)의 분류는 [assessment §7 부록](../02-architecture/framework-reusability-assessment.md) 표를 기준으로 한다. 삭제 후 반드시 `clean compileJava compileTestJava`로 회귀 확인.
> FE 라우트는 문자열 URL로만 참조되어 tsc/build가 누락을 못 잡으므로(과거 오삭제 이력), `frontend/src/config/project-modules.ts` 매니페스트도 함께 정리한다.

### 5.2 신규 도메인 추가(스캐폴드)

```powershell
./scripts/generate-domain.ps1 -DomainName "product" -FieldName "title"
```

> `business-app`에 Entity(`BaseTimeEntity` 상속)·DTO·Service·Repository·API 골격을 생성한다. 생성 후 QueryDSL Q타입 재생성을 위해 `./gradlew clean :business-app:compileJava` 권장. 제네릭 CRUD가 필요하면 `business-core`의 `BaseCrudController`/`BaseCrudService`를 상속한다.

---

## 6. ⚠ 알려진 제약 (반드시 숙지 — 프레임워크화 진행 중)

프레임워크化(assessment 로드맵)가 **부분 완료** 상태다. 아래는 파생 프로젝트 착수 전 반드시 인지해야 할 미결 사항이다.

### 6.1 빈 DB Flyway 부트스트랩 미지원 (B4, 미해결)
- `V2_0__baseline.sql`(102 테이블)이 추가됐으나 **버전 순서상 맨 마지막(2.0 > 1.12)** 이고, 앞선 델타 `V1.1__add_indexes`가 **레거시 테이블 `NEMPLYRINFO`/`NUSER_AUTHORITY`에 인덱스**를 거는데 그 테이블은 어떤 마이그레이션도 생성하지 않는다.
- 따라서 **빈 Postgres에 `flyway migrate` 하면 V1.1에서 실패**한다. 현재는 기존 스키마(덤프/공유 DB) 위에서만 동작.
- **회피**: 초기 개발은 스키마 덤프 복원 후 시작. **근본 수정**: 베이스라인을 델타보다 먼저 실행되도록 재구성(단, 공유 DB checksum drift 주의 — [flyway drift 노트](./e2e-test-guide.md) 참조). 수정 시 Docker 빈 DB 스모크 테스트 필수.

### 6.2 RBAC이 아직 하드코딩 (미해결)
- 인가가 `@PreAuthorize("hasRole('ADMIN')")` 등 **하드코딩 문자열** 기반이다. `tb_role_info`/`MenuAuthority` 테이블은 있으나 런타임 인가에 연결되지 않았다.
- 새 역할 추가 시 enum + 어노테이션 문자열을 코드에서 수정해야 한다(데이터 주도 아님).

### 6.3 브랜딩 부분 토큰화 (미해결)
- 다수 admin 화면이 `slate-*`/`gray-*`를 하드코딩한다. 브랜드 색 교체는 `globals.css` 토큰만으로 완결되지 않으며 컴포넌트 일괄 치환이 필요하다.

### 6.4 기타 미결
- **감사 로그 영속**: `OperationalAuditInterceptor`는 `log.info`만(테이블 미기록). **i18n**: `next-intl` 미도입(프론트 정적 문자열). **레거시 데이터 이관 도구**: 부재. **MapStruct/도메인 이벤트 seam**: 미도입.

---

## 7. 품질 게이트 (완료 전 필수)

| 도메인 | 명령 | 근거 |
|---|---|---|
| Backend 컴파일 | `./gradlew compileJava compileTestJava` | §0.6 HARD |
| Backend 부팅 | `./gradlew :api-server:test --tests "*SecurityAuthAnnotationLinterTest"` | 컨텍스트 로드 실증 |
| Frontend 타입 | `cd frontend && npx tsc --noEmit` | §0.6 HARD |
| 커버리지 | `make coverage` / `npm run test:coverage` | JaCoCo |
| 보안 | `/security-review`(수동) + gitleaks pre-commit | — |

---
*Last Updated: 2026-07-11 (Claude Code — 온보딩 런북 신설. 실측 스크립트/명령 기준, 미결 제약 명시.)*
