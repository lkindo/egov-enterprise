# 서드파티 오픈소스 및 표준프레임워크 고지 (Third-Party Notices)

이 문서는 저장소 루트 [LICENSE](../../LICENSE)와 함께 읽는 서드파티 오픈소스·표준프레임워크·외부 스킬·DB 벤더 자산의 라이선스 경계 안내다. 개별 패키지의 정확한 버전과 전이 의존성은 빌드 매니페스트([gradle/libs.versions.toml](../../gradle/libs.versions.toml), [package.json](../../package.json), [frontend/package.json](../../frontend/package.json))를 정본으로 한다.

---

## 1. 전자정부 표준프레임워크 (eGovFrame 5.0)

- **대상**: 공통컴포넌트 도메인 개념, 레거시 호환 식별자·표준 컬럼 규약 참조 자산
- **라이선스**: Apache License 2.0 (`https://www.apache.org/licenses/LICENSE-2.0`)
- **비고**: 본 저장소의 백엔드(Spring Boot 4.1 + JPA)·프런트엔드(Next.js App Router)·거버넌스 하네스 코드는 모더니제이션 아키텍처에 맞춰 재작성된 구현이며, eGovFrame 유래 오픈소스 구성요소는 Apache-2.0 조건을 따른다.

## 2. 백엔드 런타임·빌드 오픈소스 (`gradle/libs.versions.toml`, `build.gradle`)

주요 직접 의존성과 대표 라이선스는 다음과 같다.

| 구분 | 주요 구성요소 | 대표 라이선스 |
|---|---|---|
| 애플리케이션 프레임워크 | Spring Boot, Spring Framework, Spring Security, Spring Data JPA | Apache-2.0 |
| 영속성·쿼리·마이그레이션 | Hibernate ORM 7.x (Apache-2.0), OpenFeign QueryDSL (Apache-2.0), Flyway Community (Apache-2.0), HikariCP (Apache-2.0) | Apache-2.0 |
| 직렬화·매핑·문서화 | Jackson 3, MapStruct, springdoc-openapi, Lombok (MIT) | Apache-2.0 / MIT |
| 관측성·로깅·보안 | Micrometer, Bucket4j, JJWT, Spring Boot Structured Logging (Apache-2.0), Logback (EPL-1.0 / LGPL-2.1 이중 라이선스) | Apache-2.0 / EPL-1.0 / LGPL-2.1 |
| 테스트·품질 | JUnit 6 (EPL-2.0), AssertJ (Apache-2.0), Mockito (MIT), ArchUnit (Apache-2.0), Testcontainers (MIT), PITest (Apache-2.0) | EPL-2.0 / MIT / Apache-2.0 |

## 3. 프런트엔드·검증 도구 오픈소스 (`frontend/package.json`, 루트 `package.json`)

| 구분 | 주요 구성요소 | 대표 라이선스 |
|---|---|---|
| 웹 프레임워크·UI | Next.js, React, Tailwind CSS, Radix UI, Shadcn UI 파생 컴포넌트, Lucide Icons, Framer Motion | MIT / ISC |
| 상태·폼·계약 | TanStack Query, TanStack Table, React Hook Form, Zod, Axios, Recharts | MIT / Apache-2.0 |
| 테스트·접근성 | Vitest, Testing Library, Playwright, axe-core | MIT / Apache-2.0 / MPL-2.0(개발 의존성 일부) |

## 4. 에이전트 스킬 배포 경계 (`scripts/reusable-source-tree.mjs`)

- `.agent/skills/` 아래 스킬은 `project`(저장소 고유), `repository-only`(생산 저장소 전용), `external`(외부 오픈소스 유래)로 분류한다([reusable-source-tree.mjs](../../scripts/reusable-source-tree.mjs) `SKILL_DISTRIBUTION`).
- `external` 스킬은 각 디렉터리의 `SKILL.md` 머리말과 동봉 `LICENSE*` 파일이 원저작자·라이선스 정본이며, 프로젝트 생성기(`project-composer`)가 외부 배포용 산출물을 내보낼 때 자동 제외된다.

## 5. 다중 DB 벤더 드라이버 및 컨테이너 이미지 도입 시 주의사항

프로젝트 생성기 다중 DB 검증([config/db-vendors.json](../../config/db-vendors.json), [multi-database-composer-design.md](../02-architecture/multi-database-composer-design.md))에 포함된 벤더 자산은 도입 기관의 운영 환경 계약과 별개로 확인해야 한다.

- **PostgreSQL / MariaDB / CUBRID**: 오픈소스 드라이버(BSD / LGPL-2.1 / Apache-2.0 계열) 기준이나, 기관 표준 배포판 정책을 확인한다.
- **MySQL**: `com.mysql:mysql-connector-j` 는 GPL-2.0(Universal FOSS Exception 포함) 또는 상용 라이선스 조건이 적용되므로, 자체 상용 재배포 패키지 구성 시 법무 검토가 필요하다.
- **Oracle / Tibero**: 컨테이너 이미지(`gvenzl/oracle-free` 등)와 JDBC 드라이버(Oracle Free Use Terms and Conditions, Tibero EULA/상용 라이선스)는 개발·검증 범위와 실제 상용 운영 라이선스가 다르므로 운영 투입 전 도입 기관의 정식 라이선스 보유 여부를 반드시 확인한다.

## 6. 의존성 목록(OSS BOM) 점검 및 갱신 절차

1. **직접 의존성 변경 시 확인**: `gradle/libs.versions.toml`, `build.gradle`, 루트 `package.json`, `frontend/package.json`에 런타임·빌드 의존성을 추가하거나 메이저 버전을 올릴 때는 Maven POM `<licenses>` 또는 npm 패키지 `license` 필드로 라이선스 변경 여부(예: Apache-2.0 / MIT 외 GPL·AGPL·SSPL·상용 약관 유입 여부)를 확인하고 위 표를 함께 갱신한다.
2. **릴리스·기관 납품 전 SBOM 대조**: 릴리스 이미지 발행 및 기관 납품 패키지 준비 시 CI 컨테이너 이미지 SBOM 스캔 결과와 Gradle 의존성 그래프(`.github/workflows/dependency-submission.yml`), `pnpm licenses list --prod`(프런트엔드 운영 의존성)를 대조해 미승인 강한 카피레프트(GPL/AGPL) 런타임 유입이 없는지 확인한다.
3. **생성 프로젝트 인도 시 안내**: `project-composer`로 생성한 프로젝트를 협약 기관에 인도할 때는 해당 구성에 실제 포함된 모듈·DB 드라이버에 맞춰 본 문서와 루트 `LICENSE`를 기관 협약 조건으로 갱신할 수 있다([LICENSE](../../LICENSE) §2).
