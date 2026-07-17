# eGov Enterprise 프레임워크 재사용성·확장성 진단 (Framework Reusability & Extensibility Assessment)

> **문서 목적**: 이 저장소를 **신규 SI 구축 / 기존 프로젝트 재개발의 베이스 프레임워크**로 재사용(포팅 → 불필요 기능 삭제 → 신규 구축·레거시 마이그레이션 이식)하려는 목표에 비추어, **현재의 한계점**과 **확장 가능한 개선안**을 진단한다.
> **분석 관점(렌즈)**: 일반 코드 품질이 아니라 오직 **재사용성 · 모듈 추출성 · 확장성** — "이 코드베이스를 새 프로젝트의 출발점으로 복제할 때, 무엇이 재사용을 방해하고 무엇을 고치면 이식이 쉬워지는가".
> **분석 방법**: 10개 아키텍처 차원을 병렬 심층 감사(파일 실측 기반) + 완결성 비평(cross-cutting) + 최상위 파급 주장 3건 메인 오퍼레이터 직접 재검증.
> **작성일**: 2026-07-11 · **작성**: Claude Code (dual-operator) · **등급**: L2 (다중 모듈·아키텍처 분석)

> **⏱ 현행화 노트 (2026-07-12)**: 본 문서는 **2026-07-11 리팩터 착수 전 스냅샷**이다. §6 로드맵(Phase 1~3)은 이후 실행되어 아래 구조 변경이 **완료**되었으므로, §0~§5·§7 본문의 "현재 한계" 서술(특히 `business-suite` 모놀리스·빈 DB 부팅 불가·foundation 껍데기)은 **진단 시점(before) 기준**으로 읽는다.
> - **모듈 분할**: `business-suite` 모놀리스 → **`business-core`**(재사용 admin 코어) + **`business-app`**(프로젝트 도메인) 분할, **`migration-tool`**(레거시 이관 ETL CLI, foundation 미의존) 신설. 현 모듈 = `foundation`·`business-core`·`business-app`·`api-server`·`migration-tool`.
> - **foundation 승격**: `GlobalExceptionHandler`·`BaseEntity`/`BaseTimeEntity`·`PageResponse`·`ApiResponse`·보안 백본(JWT/IAM/filter)·`ErrorCode`(인터페이스+도메인별 enum)·`DashboardItemProvider` 포트·auto-configuration 이관.
> - **DB 베이스라인**: 레거시 V1.x 제거 → `V2_0__baseline`(101 테이블)+`V2_1`(메타표준 시드)+`V2_2`(admin 시드)+`R__seed_framework`/`R__seed_demo` → **빈 Postgres 부팅 가능**(Docker 실증, baseline-version 2.1).
> - **생산성·거버넌스**: MapStruct 매핑 표준화(`@Mapper` componentModel="spring"), 제네릭 CRUD(`BaseCrudController`/`BaseCrudService`), `DomainIsolationTest`(ArchUnit 도메인 격리), next-intl i18n, 동일출처 프록시·브랜딩 토큰화, 시크릿 외부화·prod fail-fast.
> 레거시 이관 도구 상세 설계는 [legacy-migration-tool-design.md](./legacy-migration-tool-design.md) 참조.

---

## 0. 한 문단 결론 (Executive Verdict)

이 저장소는 **완성도 높은 "제품(product) 저장소"이지만, 재사용 가능한 "베이스 프레임워크(template)"로는 아직 준비되지 않았다.** 컴파일 타임 모듈 의존 방향(foundation ← business-suite ← api-server)은 깨끗하고, ArchUnit·codegen·testFixtures·관측성 인프라·DB 표준화 등 **뼈대 자산은 우수**하다. 그러나 프레임워크의 핵심 가치인 **"필수 코어(foundation + admin)를 남기고 프로젝트 고유 기능을 삭제한다"는 시나리오를 지탱하는 물리적 경계(seam)가 코드에 존재하지 않는다.** 재사용 코어여야 할 `foundation` 모듈은 정작 예외 핸들러·감사 엔티티·페이지네이션·보안 백본이 전부 빠진 **껍데기**이고, 반대로 불가침 코어가 특정 프로젝트 도메인(`InformalSanction`)을 알고 있으며, 신규 빈 DB로는 **애초에 부팅되지 않는다**(스키마가 공유 OCI DB에만 존재). 종합 재사용 준비도는 **약 50/100**이며, 결론은 명확하다 — **경계를 다시 긋는 구조 리팩터가 선행되어야 "복제 → 삭제 → 신규 구축"이 성립한다.**

---

## 1. 재사용 준비도 스코어카드 (Reuse Readiness Scorecard)

| # | 차원 (Dimension) | 준비도 | 핵심 병목 (one-liner) |
|:--:|---|:--:|---|
| 1 | 모듈 경계 & 추출성 | **56** | 컴파일 의존 방향은 깨끗하나 business-suite가 36도메인 단일 모놀리스 — 삭제 단위 부재 |
| 2 | foundation 재사용 코어 완성도 | **45** | 계약 3종·보안 백본이 전부 business-suite에 있어 코어만 떼면 동작 불가 |
| 3 | 도메인 분류 & 삭제 가능성 | **63** | 도메인 패키지 격리는 양호하나 코어·대시보드가 프로젝트 고유 도메인에 하드결합 |
| 4 | 백엔드 레이어링·컨벤션·중복 | **54** | user 관심사 5개 패키지 분산·오명명, 서비스 네이밍 4종 공존, 표준 스캐폴드 부재 |
| 5 | 보안·인증 이식성 | **~45** | 인증이 User 도메인에 컴파일 결합, RBAC이 DB 아닌 하드코딩 문자열로 판정 |
| 6 | 프론트엔드 아키텍처·화면 이식성 | **55** | 네비 DB주도는 강점, 그러나 slate 색상 하드코딩·화면제거 3중 소스 결합 |
| 7 | DB 표준화·데이터 거버넌스 | **52** | 표준 규범은 성숙하나 Postgres 베이스라인 마이그레이션 부재로 부트스트랩 불가 |
| 8 | 빌드·설정·부트스트랩 DevEx | **40** | 빈 DB 부팅 불가 + 커밋된 시크릿 + 902파일 리네임 무자동화 |
| 9 | 확장 메커니즘·신규 도메인 생산성 | **58** | 스캐폴드/제너레이터·제네릭 CRUD 부재, 데이터주도 RBAC이 장식적 |
| 10 | 횡단 관심사 자산(테스트·관측·i18n·에러) | **62** | 골격은 좋으나 계약이 프로젝트 도메인에 결합, 관측 대시보드는 목업 |
| — | **종합 (Completeness Critic)** | **≈ 50** | 경계가 "재사용 축"이 아니라 "역사적 편의 축"으로 그어짐 |

*(점수는 각 감사 에이전트의 주관적 판정(0-100). 5번 보안은 명시 점수 미산출 → 심각도 기반 추정.)*

---

## 2. 근본 원인 6대 테마 (Cross-Cutting Root Causes)

개별 한계 60여 건을 관통하는 **구조적 근본 원인**은 여섯 가지다. 개별 증상을 잡기 전에 이 테마를 이해해야 한다.

| 테마 | 걸치는 차원 | 근본 원인 |
|---|---|---|
| **T1. foundation 코어가 껍데기** | 1·2·4·5·10 | 모듈 경계가 '재사용 필수 vs 프로젝트 고유' 축이 아니라 역사적·편의적으로 그어져, 도메인 무관 자산(GlobalExceptionHandler·BaseEntity·PageResponse·JWT/IAM/보안 백본)이 앱 모듈(business-suite)에 눌러앉았다. `foundation/…/{repository,service,domain/common}`은 빈 스캐폴드다. |
| **T2. 필수 vs 고유의 물리적 미분리** | 1·2·3·6·7·10 | business-suite가 36도메인 단일 모놀리스이고 시드·Flyway 마이그레이션(단일 V-시퀀스)·프론트 화면·ErrorCode/Constants가 코어와 고유를 한 파일/한 트리에 섞는다. **"포팅 후 삭제"의 그 삭제 경계가 코드에 없다.** |
| **T3. 규율이 문서·시점에만 있고 런타임/빌드에서 강제되지 않음** | 1·4·7·9 | 진실원천(메타표준 SSOT, RBAC 테이블, `@PermitAllRoute`, 라우트↔메뉴)이 '설계 규약'으로만 존재하고 이를 기계적으로 강제하는 게이트가 없어 파생 프로젝트가 규율을 쉽게 이탈한다. |
| **T4. 이중 SSOT / 진실원천 드리프트** | 4·5·6·7 | 단일화 강제가 없어 SecurityConfig 이중정의, 스키마 진실소스 4중 fork, 메뉴 라우트(DB `modernRoute` vs 파일 라우트), 컴포넌트 이중 루트가 각자 드리프트한다. |
| **T5. 하드코딩 상수가 파라미터화를 막음** | 4·5·6·8 | 설정 외부화 원칙 부재로 slate/gray 색상, OCI DB 호스트·기본 자격증명, RBAC 역할 문자열, 약한 기본 시크릿, 화이트리스트가 코드에 박혀 있어 '복제 후 값만 바꿔 새 프로젝트로'가 성립하지 않는다. |
| **T6. 수작업 산출물 과다 — 생산성 레버 부재** | 3·9 | 표준 도메인 스캐폴드 미확정(user만 nested, 33개 flat), 제네릭 CRUD·MapStruct·도메인 이벤트 seam·코드젠 빌드연동이 없어 신규 도메인 추가가 전량 손코딩(9~11군데)이다. |

---

## 3. 구조적 최상위 병목 7선 (Top Blockers) — 직접 검증 포함

가장 먼저 해결해야 할 병목. **✅ 표시는 메인 오퍼레이터가 파일로 직접 재검증**한 항목이다.

### B1. 재사용 코어(foundation)가 '동작하지 않는 껍데기' — 계약·백본이 전부 앱 모듈에 있다
- **증거**: `foundation/…/core/{repository,service}` 및 `domain/common`은 **빈 디렉터리**. 정작 `GlobalExceptionHandler`·`BaseEntity`/`BaseTimeEntity`·`PageResponse`는 [business-suite/…/core, domain/common](../../business-suite/src/main/java/nuri/business/core), 보안 전체(JWT/IAM/filter/resolver/audit)는 [business-suite/…/security](../../business-suite/src/main/java/nuri/business/security)에 있다.
- **왜 막나**: `foundation`만 복제하면 예외가 봉투로 변환되지 않고, 감사 컬럼·표준 페이징·인증이 전무하다. **동작하는 베이스라인을 얻으려면 50개 도메인을 품은 business-suite를 통째로 끌고 와야 하므로 "코어만 재사용"이 원천 불가능하다.**

### B2. 필수 admin과 프로젝트 고유가 물리적으로 미분리 — 삭제 단위가 없다
- **증거**: [business-suite/…/domain](../../business-suite/src/main/java/nuri/business/domain) — 36개 도메인·494 java가 flat 공간에 혼재. Spring Modulith / 서브모듈 / `@Core`·`@App` 매니페스트 전무.
- **왜 막나**: `user·auth·code·menu`(코어)와 `informalsanction·isg·memoreport`(고유)를 구분하는 물리 경계가 없어, 파생 프로젝트마다 도메인·서비스·리포·컨트롤러를 손으로 골라 삭제하고 누락 시 컴파일 파손을 매번 떠안는다.

### B3. ✅ 불가침 코어·필수 대시보드가 프로젝트 고유 도메인에 하드결합
- **✅ 검증됨**: [foundation/…/constants/Constants.java:40](../../foundation/src/main/java/nuri/foundation/constants/Constants.java#L40) `INFRML_PREFIX = "INFRML_"`, [IdGenerationUtil.java:55](../../foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java#L55) `generateInformalSanctionId()` — **불가침 코어가 특정 업무개념(비공식 제재)을 안다.** 심지어 PK `varchar(20)` 길이 상한 근거 주석까지 이 접두사에서 도출.
- **✅ 검증됨**: [DashboardApiController.java:7,34,67](../../api-server/src/main/java/nuri/api/controller/business/main/DashboardApiController.java#L34) — 메인 대시보드(필수 기능)가 프로젝트 고유 `InformalSanctionService`를 직접 import·주입.
- **왜 막나**: `informalsanction`을 지우면 **foundation 코어와 메인 대시보드가 컴파일 파손**된다. "삭제"가 코어 수술을 강제한다.

### B4. ✅ 신규 빈 DB로 부팅 불가 — 프로덕션 베이스라인 마이그레이션 부재
- **✅ 검증됨**: [db/migration](../../api-server/src/main/resources/db/migration) 13개 파일 중 `CREATE TABLE`을 담은 것은 **단 2개**(V1, V1.5), 나머지는 전부 `ALTER`/rename/index. 반면 business-suite `@Entity`는 **89개**. 기본 프로필 `ddl-auto: validate`.
- **왜 막나**: 실질 스키마가 **공유 OCI DB(`129.154.54.178`)에만 살아 있어**, 빈 Postgres에 클론하면 Flyway가 테이블 ~1개만 만들고 Hibernate `validate`가 즉시 실패한다. **독립 환경 부트스트랩이 사실상 불가능**하고 과거 checksum drift도 이 공유 DB 의존의 결과다.

### B5. ✅ 커밋된 시크릿 + 하드코딩된 인프라·역할·브랜딩
- **✅ 검증됨**: `ssh-key-2026-01-18.key`(RSA 개인키)가 커밋 `11366ca4…`에 추가→`11df38e2f`에서 언트랙 → **full clone history에 개인키가 그대로 잔존**(언트랙만으로 노출 미제거).
- **증거**: [application.yml](../../api-server/src/main/resources/application.yml) DB 기본값 `egov/egov123`·OCI IP 하드코딩, 주석에 Supabase 평문 비번, `application-e2e.yml`은 실 OCI 크리덴셜 외부화 없이 하드코딩. RBAC은 `hasRole('ADMIN')` 문자열 29곳 + `webmaster` 특수분기로 판정(DB `tb_role_info` 미사용). 프론트 admin tsx 187개 중 135개가 `slate-*/gray-*` 하드코딩(디자인토큰 우회).
- **왜 막나**: 새 프로젝트가 유출 자격증명·약한 키를 상속하고, 역할/브랜딩/인프라를 "값만 바꿔" 교체할 수 없다.

### B6. 데이터 주도 확장점이 장식적 — 런타임/빌드에서 강제 안 됨
- **증거**: `MenuAuthority`/`UserAuthority` 테이블은 존재하나 security·api-server 전역 참조 **0건**(실 인가는 경로 prefix만). 메타표준 SSOT는 런타임 코드 참조 0건. 앱↔앱 도메인 결합 금지 ArchUnit 규칙 없음.
- **왜 막나**: "메뉴+권한을 DB로 추가하면 API가 자동 게이팅된다"·"명명 표준이 강제된다"가 실제로는 작동하지 않아, 프레임워크의 셀링포인트가 오인·보안 구멍·드리프트로 이어진다.

### B7. 스캐폴드/제너레이터 부재 + 코어 버전 배포·전파 통로 부재 (fork-and-delete 함정)
- **증거**: plop/hygen/openapi-generator·제네릭 CRUD·MapStruct 흔적 없음(도메인 1개 추가 = 9~11군데 손코딩). `build.gradle`에 `maven-publish`/BOM 없음.
- **왜 막나**: 현재 재사용 모델은 사실상 **'fork-and-delete'**다. 파생 SI가 여러 개 생긴 뒤 코어에 보안 패치가 생겨도 **각 파생본으로 전파할 통로가 없어** 코어 개선이 파편화된다 — 프레임워크의 수명 자체를 좌우하는 공백.

---

## 4. 차원별 상세 분석 (Dimension Deep-Dive)

각 차원의 강점 → 주요 한계 → 개선안. 한계 severity: 🔴 high / 🟡 medium / ⚪ low. 개선안: effort(S/M/L) · impact.

### 4.1 모듈 경계 & 추출성 (56)
**강점**: 컴파일 의존이 비순환 단방향(foundation ← business-suite ← api-server), foundation은 project 의존 0개, 라이브러리는 jar-only, 컴포넌트 스캔 자동 배선(파일 삭제만으로 빈 정리), 도메인 결합이 가벼운 허브-앤-스포크(코어 지향).

| 한계 | sev | 근거 |
|---|:--:|---|
| business-suite가 admin-코어/프로젝트-고유 미분리 36도메인 모놀리스 | 🔴 | Spring Modulith/module-info 부재 |
| admin 코어가 독립 추출 단위 아님 (api/FE는 개념 구분하나 domain/service는 flat) | 🔴 | `controller/foundation/*` vs flat domain |
| Flyway가 도메인별로 뒤엉킨 단일 V-시퀀스 | 🔴 | V1.4 scrap·V1.9 file·V1.5 user 혼재 |
| 형제 도메인 간 결합 금지 강제(ArchUnit) 없음 | 🟡 | `ArchitectureTest` no_cycles만 존재 |
| api-server 컨트롤러 패키지 이중 중첩·산발 루트 | 🟡 | `controller/foundation/controller/system` |
| 소스 루트에 도구 산출물 커밋 | ⚪ | `foundation/src/main/java/graphify-out` |

**개선안**: ① **business-core / business-app 분할 또는 Spring Modulith 도입**(L·high) — admin 베이스라인을 business-core로, 앱 도메인을 business-app으로 분리해 파생 프로젝트가 core만 의존해 출발. ② **ArchUnit 도메인 격리 규칙**(S·high) — 앱↔앱 결합 금지·코어 화이트리스트만 허용을 CI 불변식으로 승격. ③ **Flyway core/app 로케이션 분리 + 도메인→테이블 매니페스트**(M·high). ④ 컨트롤러 트리 정규화(M·medium). ⑤ graphify-out 소스 루트 제거·.gitignore(S·low).

### 4.2 foundation 재사용 코어 완성도 (45) — 최저 준비도
**강점**: `ApiResponse`(Java21 record 응답봉투, status 정합 팩토리), `ValidationUtils`(순수 가드), `AsyncConfig`(가상스레드+세마포어 백프레셔), `CryptoUtil`(약한키 경고·마스터키 미로깅), i18n MessageConfig(ko/en), Caffeine CacheConfig — 저수준 프리미티브는 좋다.

| 한계 | sev | 근거 |
|---|:--:|---|
| 코어 계약 3축(예외핸들러·BaseEntity·PageResponse)이 business-suite에 있음 | 🔴 | `foundation/domain/common` 빈 디렉터리 |
| 보안(JWT/IAM/filter/resolver/audit) 전체가 foundation에 전무 | 🔴 | foundation 내 SecurityFilterChain grep 0건 |
| 코어 config `EgovIdGnrConfig`가 ~30개 도메인 전용 ID 빈으로 오염 | 🔴 | NOTE_/EVENT_/RWARD_/SCRAP_ 빈 |
| `src/main/java` 안에 graphify 캐시 4.1MB(345 JSON) 커밋 | 🔴 | `foundation/…/graphify-out/cache/*.json` |
| ErrorCode·Constants가 도메인 코드 혼입(개방-폐쇄 위반) | 🟡 | `ErrorCode.java:47-62` B001~/CD01~ |
| Spring Boot Starter/auto-configuration 미패키징 | 🟡 | `AutoConfiguration.imports` 부재 |
| 리팩터 잔재(빈 패키지·stale Q 생성물), BusinessException 인자순서 footgun | 🟡⚪ | — |

**개선안**: ① **코어 계약 3종을 foundation으로 승격 이동**(M·high) — 이미 `nuri.foundation.core.*` 계약에만 의존하므로 저비용. ② **도메인 무관 보안 백본을 foundation(-security)으로 추출 + `PrincipalProvider` 포트**(L·high). ③ EgovIdGnrConfig에 제네릭 `createIdGnrService(table,prefix,cipers)`만 남기고 도메인 빈은 각 모듈로 `@ConditionalOnProperty` 이관(M·high). ④ **ErrorCode를 sealed interface + 도메인별 enum**(M·medium). ⑤ **foundation을 auto-configuration으로 패키징**(M·high). ⑥ graphify-out 제거(S·medium).

### 4.3 도메인 분류 & 삭제 가능성 (63) — 최고 준비도
**강점**: C-도메인(informalsanction/isg/memoreport…)을 참조하는 **타 business 도메인 cross-import 0건**(비즈니스 레이어는 깨끗이 격리), 삭제 방법론 문서([project-safe-deletion-analysis.md](../04-operations/project-safe-deletion-analysis.md)) 존재, E2E 데이터 격리.

| 한계 | sev | 근거 |
|---|:--:|---|
| 프레임워크 대시보드가 C-도메인에 하드결합(컴파일 파손) | 🔴 | `DashboardApiController` → InformalSanctionService |
| 코어(foundation)에 프로젝트 고유 ID 생성기 내장 | 🔴 | `IdGenerationUtil.generateInformalSanctionId` |
| 모듈 on/off 토글 인프라 부재(제거 = 물리삭제뿐) | 🔴 | `@ConditionalOnProperty` 도메인 게이팅 0건 |
| 한 도메인이 6+ 위치에 흩어짐, 매니페스트 없음 | 🔴 | informalsanction ≈ 29파일 6트리 |
| C-도메인 간 상호결합(operation→informalsanction) | 🟡 | `RewardManageService` |
| 메뉴/프로그램 시드 비활성 + 리포 외부 SQL 의존 | 🟡 | `MenuDataInitializer`(`// @Component`) |
| FE 라우트 레거시 약어 난독(`sanctn`/`uss`/`lsm`/`ism`) | 🟡 | BE↔FE 매핑 직관성 저하 |

**개선안**: ① **코어 도메인-중립화**(S·high) — foundation의 `generateInformalSanctionId`/`INFRML_PREFIX` 제거, 접두사는 도메인 서비스가 주입. ② **대시보드 집계 역전**(M·high) — `DashboardWidgetProvider` 포트(빈 목록 주입) 또는 `@EventListener` 집계로 전환 → C-도메인 빈 부재 시 위젯 자동 0건. ③ **도메인 매니페스트(YAML) + 삭제/검증 스크립트**(M·high). ④ **모듈 게이팅 `@ConditionalOnProperty("egov.module.<name>.enabled")`**(M·high) — 삭제 전 "비활성화로 검증" 경로 확보. → **A/B/C 전체 분류표는 §7 부록 참조.**

### 4.4 백엔드 레이어링·컨벤션·중복 (54)
**강점**: Controller→Entity 의존 금지 ArchUnit 강제(BE헌법 3조), `BaseAbstractService` 공통 베이스, `XRepository/Custom/Impl` QueryDSL 3종 세트 일관, 엔티티/JPA 규범 ArchUnit 가드.

| 한계 | sev | 근거 |
|---|:--:|---|
| user 관심사 5+ 패키지 분산 | 🟡 | ~~`usermanagement`=부서관리 오명명~~ 정명 완료(→ `service/department/DeptManageService`, 2026-07). 잔여: user 도메인 패키지 분산 |
| 표준 도메인 스캐폴드 부재 — user만 nested, 33개 flat | 🔴 | `domain/user`만 entity/repository/dto/vo |
| 서비스 인터페이스/구현 네이밍 4종 공존 | 🔴 | Egov접두 / XServiceImpl / impl/ / 무인터페이스 |
| 필수 코어여야 할 공통 인프라가 business-suite에 존재 | 🔴 | (4.2 B1과 동일 축) |
| 중복·오도성 패키지명·controller 중첩 | 🟡 | `service/system/service/…` |
| DTO/projection 배치 규칙 이원화·미문서화 | ⚪ | — |

**개선안**: ① **단일 표준 도메인 스캐폴드 확정(flat) + ArchUnit 강제 + 가이드 문서화**(M·high). ② user/auth/dept/absence 재응집·오명명 제거(M·high). ③ 서비스 네이밍 단일 컨벤션 통일 + `@Service` 하드코딩 빈이름 제거(L·high). ④ foundation 자립화(M·high, B1과 연동).

### 4.5 보안·인증 이식성 (~45)
**강점**: 표준 Spring Security 확장 지점(UserDetailsService/AuthenticationProvider/ArgumentResolver) 준수, 레거시 SHA-256→BCrypt 자동 마이그레이션(재개발 시나리오에 부합), `@PermitAllRoute` 린터 하네스, RateLimit(Bucket4j)·보안 헤더 세트.

| 한계 | sev | 근거 |
|---|:--:|---|
| 인증 스택이 foundation 아닌 business-suite + User 도메인 컴파일 하드결합 | 🔴 | `CustomUserDetailsService` import User/UserRepository |
| `esntlId=getUsername()` 이중 식별자 규약이 전 계층에 암묵 결합 | 🔴 | `CustomUserDetails`/`SecurityUtil` (상시 버그원) |
| RBAC이 DB 시드 아닌 하드코딩 문자열로 판정 | 🔴 | `hasRole('ADMIN')` 29곳·`webmaster` 분기 |
| 화이트리스트/필터체인 코드 하드코딩, `@PermitAllRoute` 런타임 미연동 | 🟡 | `ApiSecurityConfig` 리터럴 나열 |
| SecurityConfig 이중정의(하나는 死코드) + 레거시 .do/JSP 잔존 | 🟡 | `@ConditionalOnMissingClass` |
| 약한 기본 시크릿/키 커밋 fallback, 인증 경로 해시·salt를 INFO 로깅 | 🟡 | `application.yml:83`, `EgovAuthenticationProvider:57` |

**개선안**: ① **인증 추상화 포트(`AuthUser`/`UserAuthPort`)를 foundation으로 승격, User 의존을 인터페이스로 역전**(L·high) → 새 프로젝트는 포트만 구현하면 인증 스택 재컴파일 없이 자기 사용자 모델 장착. ② 화이트리스트·CORS를 프로퍼티/`@PermitAllRoute` 런타임 스캔으로 외부화, 死코드 SecurityConfig 제거(M·high). ③ **역할 판정을 DB RBAC(`tb_role_info`)로 일원화**, 하드코딩 문자열·webmaster 분기 제거(L·high). ④ 시크릿 fail-fast·민감정보 로깅 제거(S·medium).

### 4.6 프론트엔드 아키텍처·화면 이식성 (55)
**강점**: **네비게이션이 DB 메뉴 주도**(하드코딩 nav 배열 부재, `modernRoute||chkURL`), 브레드크럼 DB 트리 자동생성, `ApiService`/`AdminService` 추상(pageIndex 자동매핑), CSS 변수 디자인토큰 레이어, middleware 중앙 인증 게이팅.

| 한계 | sev | 근거 |
|---|:--:|---|
| slate/gray 색상 대량 하드코딩(디자인토큰 우회) — 브랜딩 교체 사실상 불가 | 🔴 | admin tsx 135/187 파일, slate-900 536회 |
| 화면 제거가 3중 소스(물리 라우트 + next.config redirect + DB 메뉴) | 🔴 | `next.config.ts:68-81` 하드코딩 redirect |
| frontend `foundation/business` 분리가 백엔드 모듈과 정반대 불일치 | 🟡 | `services/foundation`에 user·security·survey |
| 고유 화면과 재사용 admin 화면이 동일 트리 깊이 무구분 | 🟡 | `admin/sanctn` ~ `admin/user` 형제 |
| `NavItem` ICON_MAP이 한국어 메뉴명 하드코딩(45키) | 🟡 | `ICON_MAP['대시보드']` |
| 컴포넌트 루트 이중화 | ⚪ | `src/components/*` vs `src/app/components/*` |

**개선안**: ① **물리 라우트 ↔ DB 메뉴 정합 검증 CI 게이트**(M·high) — orphan 라우트·dead 메뉴·부재 redirect를 빌드 실패로(문자열 URL이라 tsc가 못 잡는 404 차단). ② **raw slate/gray 금지 ESLint 규칙 + 토큰 마이그레이션 코드모드**(L·high) → 브랜딩이 `globals.css` 토큰 수정만으로 완결. ③ 고유 화면을 라우트 그룹 `admin/(project)/*` + `project-modules.ts` 매니페스트로 격리(M·high). ④ 메뉴 아이콘 DB 컬럼화(S·medium). ⑤ services/types 레이어명을 백엔드 경계와 정합(또는 매핑표 SSOT)(M·medium).

### 4.7 DB 표준화·데이터 거버넌스 (52)
**강점**: 표준화가 물리 스키마에 **실집행**(tb_ 95개, snake_case, 감사컬럼 4종, pk_/fk_/ix_), eGovFrame 표준 사전이 메타 SSOT에 통째 시드(단어 3387/용어 13176/도메인 129), 성문 헌법 10조 + 무중단 마이그레이션 린터, H2 스키마 스냅샷 회귀 검증.

| 한계 | sev | 근거 |
|---|:--:|---|
| 프로덕션 베이스라인 마이그레이션 부재 — Flyway만으로 재구성 불가 | 🔴 | ✅ CREATE TABLE 2건 vs @Entity 89 |
| 시드가 프레임워크-필수 vs 프로젝트-고유 미분리 + 저장소 시드 stale | 🔴 | `seed_knowledge_boards.sql`이 레거시 `nbbsmaster` |
| 메타 SSOT가 설계/에이전트 시점 규율일 뿐 빌드·CI 게이트 부재 | 🟡 | 런타임 참조 0건 |
| 복수 스키마 진실소스 독립 드리프트(4중 fork) | 🟡 | `schema-h2.sql`·V1·덤프·H2 스냅샷 |
| 도메인→테이블→마이그레이션 매핑 부재 | 🟡 | 모놀리식 덤프 |
| application.yml이 공유 라이브 OCI DB 호스트·기본 자격증명 하드코딩 | 🟡 | `129.154.54.178`, egov/egov123 |

**개선안**: ① **표준 스키마 Postgres 베이스라인 마이그레이션 생성**(M·high) — `pg_dump --schema-only`로 `V2_0__baseline.sql` 한 벌, `baselineVersion` 상향으로 레거시 델타 격리 → 빈 Postgres에 `flyway migrate`만으로 재구성. ② **시드를 프레임워크-베이스라인(R__seed_framework.sql) vs 데모로 분리 + tb_ 명칭 재작성**(M·high). ③ application.yml OCI 하드코딩 제거·fail-fast + `application-local.yml.example`(M/S·high). ④ 메타 SSOT 준수 빌드타임 명명 게이트(`db_columns.json` × meta 대조 ArchUnit)(M·medium). ⑤ 도메인 매니페스트 + 파라미터화 제거 스크립트(L·medium).

### 4.8 빌드·설정·부트스트랩 DevEx (40) — 최저
**강점**: 설정 외부화 기본기(`${ENV:default}`, prod는 기본값 없이 강제 주입), 오프라인 codegen(`codegen:file` + `codegen:verify`), 크로스플랫폼 Makefile, docker-compose 3-service, 클론 위생(bin/build/node_modules 미추적).

| 한계 | sev | 근거 |
|---|:--:|---|
| 신규 빈 DB 부팅 불가(base schema DDL 부재) | 🔴 | ✅ (4.7 DB-1과 동일) |
| 커밋된 시크릿 · git history RSA 개인키 유출 | 🔴 | ✅ `ssh-key-…key` history 잔존 |
| 막대한 리브랜딩 비용 · rename 자동화 부재 | 🔴 | ✅ 902 java `package nuri`, group='nuri' |
| 부트스트랩 문서가 부재 파일 5개 참조 | 🟡 | README → `start-dev.ps1`·`.env.example` 등 부재 |
| api-docs.json / db_columns.json 스냅샷 드리프트 리스크 | 🟡 | codegen이 stale 스냅샷 의존 |
| 베이스 프레임워크 부적합 잔재(artifacts/·부하테스트 HTML 등) | ⚪ | — |

**개선안**: ① **스키마 베이스라인화**(M·최상, 4.7①과 동일). ② **원클릭 `make bootstrap` + `scripts/bootstrap.ps1`**(S·high) — env 복사→db 기동→migrate+seed→pnpm install. ③ **시크릿 퍼지(`git filter-repo`) + 로테이션 + gitleaks pre-commit**(M·최상/보안). ④ **`scripts/rename-project.ps1 -Group -Artifact -BasePackage`**(M·high) — 902파일 리네임을 수분 자동화(드라이런+사후 compile 검증). ⑤ `.env.example` 커밋 + README 정합화(S·medium). ⑥ `codegen:refresh` 재현 파이프라인 명시(S·medium).

### 4.9 확장 메커니즘·신규 도메인 생산성 (58)
**강점**: 레이어 컨벤션 일관(복사로 새 도메인 생성 예측가능), `BaseAbstractService`(toDto/toPage/required), `BaseEntity`/`BaseSearchDto` 상속, 프론트 `ApiService` 추상, BE→FE 코드젠, 부분적 도메인 이벤트 seam, `/admin/**` coarse 보안 자동 상속.

| 한계 | sev | 근거 |
|---|:--:|---|
| 데이터 주도 RBAC가 런타임 미강제(장식적 확장점) | 🔴 | MenuAuthority/UserAuthority 참조 0건 |
| 스캐폴드/제너레이터·제네릭 CRUD 추상 부재 | 🔴 | 도메인 1개 = 9~11군데 손코딩 |
| 도메인 이벤트가 프레임워크 seam 아닌 애드혹 | 🔴 | 4곳만 발행, 리스너가 구상 리포 결합 |
| 엔티티↔DTO 매핑 전량 수작업(MapStruct 미도입) | 🟡 | DTO 75개 static from() |
| 메뉴/프로그램 시드 비활성·레거시 SQL 결합 | 🟡 | (4.3과 동일) |
| 메뉴 라우트 이중 SSOT(DB vs 파일) | 🟡 | (4.6과 동일) |

**개선안**: ① **제네릭 `BaseCrudController<E,ID,Dto,SearchDto>` / `CrudService`**(M·high) — 64개 컨트롤러의 반복 CRUD 흡수 + `userId="SYSTEM"` 류 복붙 드리프트 제거. ② **도메인 스캐폴딩 제너레이터**(L·high) — plop+Gradle task로 하나의 스펙에서 Entity~Controller~FE service~menu seed~authority까지 일괄 생성(헌법 네이밍 내장). ③ **MenuAuthority 런타임 인가 연동**(L·high) — 경로→menu→authority 대조 AuthorizationManager. ④ 제네릭 도메인 이벤트 프레임워크화(`@DomainEvents`)(M·high). ⑤ MapStruct 채택(M·medium). ⑥ 코드젠 빌드/CI 게이트 연동(S·medium).

### 4.10 횡단 관심사 자산(테스트·관측·i18n·에러) (62)
**강점**: 성숙·광범위한 에러 처리(ApiResponse + 9핸들러 + 정보노출 마스킹), 실재 관측 인프라(MDC traceId·Loki·Prometheus·CI 스크랩), testFixtures 발행(QueryCountGuard N+1 가드·WithMockCustomUser·Testcontainers/H2 validate), ArchUnit이 헌법을 기계 게이트로 승격, 문서 32개 라이프사이클 큐레이션, i18n 스캐폴드.

| 한계 | sev | 근거 |
|---|:--:|---|
| ErrorCode가 foundation 단일 거대 enum + 도메인 코드 혼재(확장 불가) | 🔴 | 219회 참조, B001~/CD01~ 혼입 |
| 에러 봉투 계약(foundation) vs 배선 핸들러(business-suite) 분리 | 🔴 | (B1 축) |
| admin/observability 프론트 대시보드가 전부 하드코딩 목업 | 🔴 | `observability/page.tsx:51` 정적 리터럴 |
| 테스트 베이스·22-tier E2E가 프로젝트 도메인에 결합 | 🟡 | `ControllerTestSupport` MenuIntegrationService 목 |
| OperationalAuditInterceptor가 log.info만(감사 영속 미배선) | 🟡 | 감사 테이블 있으나 미기록 |
| 프론트 i18n이 이름뿐(정적 상수, 에러 미지역화) | 🟡 | `useMessage.ts` 정적 MESSAGES |

**개선안**: ① **ErrorCode를 인터페이스 + 도메인별 enum으로 분해**(M·high) → 파생 프로젝트가 foundation 미수정으로 자기 에러코드 추가. ② 전역 예외 핸들러(공통부)를 foundation으로 승격(S·high). ③ 관측 대시보드를 actuator/prometheus 실배선 또는 '데모 데이터' 배지 명시(M·high). ④ 테스트 하네스 도메인 결합 제거 + 프레임워크 스모크 게이트 분리(M·medium). ⑤ 감사 로그 영속 파이프라인(M·medium). ⑥ 에러 메시지 MessageSource 키화 + next-intl(L·medium).

---

## 5. 누락 영역 (완결성 비평이 짚은 추가 공백)

10개 차원이 놓쳤으나 재사용 목표에 치명적인 영역:

- **코어의 버전드 배포·업그레이드 전파 부재** — `maven-publish`/BOM 없음. 현재는 사실상 fork-and-delete라 파생 SI 여러 개 생긴 뒤 코어 보안 패치를 전파할 통로가 없다. **프레임워크 수명을 좌우하는 최상위 공백.**
- **레거시 데이터 이관(migration) 지원 부재** — 사용 시나리오에 '레거시 마이그레이션·이식'이 명시됐으나 소스↔표준 스키마 매핑/ETL/검증 도구가 전무. 재개발에서 가장 비싼 단계가 무지원.
- **온보딩/런북 문서 공백** — 헌법(규범)은 두껍지만 '이 프레임워크로 새 프로젝트 시작/삭제/브랜딩 교체'하는 실무 절차서가 없다.
- **멀티테넌시/조직 격리·환경 프로파일 전략 부재** — 엔터프라이즈 SI에 흔한 다기관·다환경 격리 모델이 설계에 없고, 공유 OCI DB 하드코딩과 맞물려 즉시 문제화.
- **CI/CD·품질 게이트의 이식성 불명** — JaCoCo/PITest/OWASP 게이트가 이 저장소 환경(npm/pnpm 혼용, billing-blocked CI)에 결합돼 파생본 승계 여부 불명.
- **저장소 위생** — `foundation/src/main/java/graphify-out`(4.1MB) + `foundation/bin/main/graphify-out`(4.1MB) 커밋. 복제 시 코어를 무겁게 하고 파생본마다 오염 복제.

---

## 6. 단계별 로드맵 (Phased Roadmap)

> 원칙: **경계를 먼저 바로잡고(코어 확립), 그다음 필수/고유를 분리하고, 마지막에 생산성·전파를 얹는다.** Phase 1을 건너뛰고 스캐폴드부터 만들면 잘못된 경계 위에 자동화를 쌓게 된다.

### Phase 1 — 코어 확립 & 위생 (저리스크·고임팩트, 1~2 스프린트)
"재사용 코어가 실제로 코어에 있다"는 **최소 조건**을 먼저 충족.
- [x] 계약 3종(GlobalExceptionHandler·BaseEntity·PageResponse) + 도메인 무관 보안 백본을 **foundation으로 승격 이동** (B1)
- [x] ErrorCode를 **인터페이스 + CommonErrorCode + 도메인별 enum**으로 분해 (B6/4.10①)
- [x] foundation의 **프로젝트 고유 결합 제거**: `generateInformalSanctionId`·`INFRML_PREFIX` 삭제, EgovIdGnrConfig 도메인 빈 이관 (B3)
- [x] 대시보드 집계를 **`DashboardWidgetProvider` 포트/이벤트로 역전** (B3)
- [x] **시크릿 fail-fast**: JWT/암호화 키·OCI 호스트·자격증명 부재 시 기동 실패, `ssh-key` history 퍼지 + 로테이션 + gitleaks (B5)
- [x] **저장소 위생**: graphify-out 소스/빌드 캐시 제거·.gitignore, 死코드 SecurityConfig·stale 빈 디렉터리 정리
- [x] **ArchUnit 경계 게이트 신설**: 앱↔앱 결합 금지·코어 화이트리스트 (B6)

### Phase 2 — 필수/고유 분리 (구조 리팩터, 3~5 스프린트)
"복제 후 삭제·커스터마이즈"가 **성립**하는 단계.
- [x] **business-core / business-app 분할** 또는 Spring Modulith 도입 (B2)
- [x] **Postgres 표준 베이스라인 마이그레이션 생성** + 시드를 프레임워크-베이스라인 vs 데모로 분리 (B4)
- [x] **RBAC 런타임 DB 일원화**: 하드코딩 `hasRole` 문자열·webmaster 분기 제거 → `tb_role_info` (B5/B6)
- [x] 화이트리스트/CORS **외부화**, 인증 `AuthUser`/`UserAuthPort` 포트화 (4.5①)
- [x] **브랜딩 토큰화**: raw slate/gray ESLint 금지 + 코드모드, 아이콘 DB 컬럼화 (B5/4.6)
- [x] **프론트 고유화면 격리**: `admin/(project)/*` 라우트 그룹 + `project-modules.ts` 매니페스트 + 라우트↔메뉴 정합 CI 게이트 (4.6)
- [x] **도메인 매니페스트(YAML) + 파라미터화 삭제 스크립트** (BE/DB/FE/test 전 위치) (4.3③)

### Phase 3 — 생산성·전파·확장 (프레임워크化 완성)
파생 프로젝트로의 **지속적 코어 전파**와 신규 도메인 **생산성** 확보.
- [x] **도메인 스캐폴드 제너레이터**(plop + Gradle) + 제네릭 CRUD 컨트롤러/서비스 + MapStruct (B7/4.9)
- [x] 제네릭 **도메인 이벤트 seam**(`@DomainEvents` + 리스너 레지스트리) (4.9④)
- [x] **코어 버전드 배포**(`maven-publish` + BOM) + **프로젝트 부트스트랩 리네이머**(`rename-project.ps1`) (B7/§5)
- [x] foundation **Spring Boot auto-configuration** 패키징 (4.2⑤)
- [x] 관측성 대시보드 **실배선**, i18n **실체화**(MessageSource 키 + next-intl), 감사 로그 영속 파이프라인 (4.10)
- [x] **레거시 데이터 이관 도구**(소스↔표준 스키마 매핑·ETL·검증) + 온보딩 런북 (§5)

---

## 7. 부록 — 도메인 A/B/C 분류표 (삭제 판단 기준)

프레임워크 필수(A) / 범용 재사용(B) / 프로젝트 고유·삭제 대상(C). 파생 프로젝트에서 **C를 삭제할 때 이 표를 출발점**으로 삼되, §4.3의 하드결합(대시보드·foundation ID·operation→informalsanction)을 먼저 끊어야 안전하다.

| 도메인 | 분류 | 대표 테이블 | 삭제 안전도 | 비고 |
|---|:--:|---|:--:|---|
| auth / login / user | **A** | tb_user·tb_authrt_* | 필수 | 인증·로그인정책 (`usermanagement` 오명명은 → `service/department` 정명 완료) |
| menu / program / code | **A** | tb_menu_info·tb_prgrm_lst | 필수 | 네비·공통코드. 시드 비활성 주의 |
| organization / deptjob / group | **A** | tb_ognz_info·tb_dept_* | 필수 | 조직·부서·권한그룹 |
| file / log / config / common | **A** | tb_login_log 등 | 필수 | 첨부·감사로그·BaseEntity |
| system(policy/banner/popup) / stats | **A** | — | 필수 | 시스템정책·통계 |
| help | A/B | tb_faq_info | 대체로 안전 | Q&A |
| board / comment / faq / note / scrap | **B** | tb_blog_info·tb_bbs_* | 안전 | 범용 게시판/댓글/쪽지 |
| notification / mail / sms / template | **B** | tb_user_noti·tb_email_* | 안전 | 범용 알림·발송 |
| addressbook / calendar / schedule / image | **B** | tb_adbk_*·tb_hldy_* | 안전 | 협업(FE명 `lsm`=schedule) |
| survey / poll / consult | B*(현 C) | — | 대체로 안전 | 본질 범용이나 `system.service` 하위 매몰 → 승격 권장 |
| **informalsanction** | **C** | — | **위험** | 6위치 ≈29파일, foundation·대시보드 하드결합 |
| **isg / memoreport / report** | **C** | tb_rpt_info | 대체로 안전 | 안내·메모보고·업무보고 |
| **operation**(events/rewards/external-hr) | **C** | — | 대체로 안전 | rewards가 informalsanction 참조(cross-C) |

*C-도메인 간 cross-import는 `RewardManageService → informalsanction` 1건 외에는 발견되지 않음(비즈니스 레이어 격리 양호). 위험은 주로 **코어·대시보드·프론트 공용 컴포넌트**로의 상향 결합에서 발생.*

---

## 8. 검증 로그 & 방법론 (Verification Log)

- **분석 규모**: 백엔드 3모듈(foundation 20 / business-suite 494 / api-server 86 java) + 프론트(Next.js 16 App Router) + docs 32 + 3대 헌법. 10개 차원 병렬 감사(에이전트 8 + 실패 복구 2) + 완결성 비평 1. 서브에이전트 토큰 ≈ 95만, 도구 호출 ≈ 310회.
- **메인 오퍼레이터 직접 재검증(✅)**:
  - `db/migration` 13파일 중 `CREATE TABLE` **2건** vs business-suite `@Entity` **89건** → 베이스라인 부재 확정 (B4/DB-1).
  - `DashboardApiController.java:7,34,67` → `InformalSanctionService` 직접 주입 확정 (B3).
  - `Constants.java:40`(`INFRML_PREFIX`) + `IdGenerationUtil.java:55`(`generateInformalSanctionId`) → 코어의 프로젝트 도메인 인지 확정 (B3).
  - `ssh-key-2026-01-18.key`가 커밋 `11366ca4…`→`11df38e2f`(언트랙) → git history 잔존 확정 (B5).
  - 모듈 build.gradle 3종 직접 판독 → foundation project 의존 0개·의존 방향 비순환 확정, foundation이 JPA/Security/JWT 미포함 확정 (B1).
- **정직한 보류(deferred)**: DB 라이브 조회는 본 분석에서 수행하지 않음(정적 파일 기준). 메타 SSOT 카운트(단어 3387 등)·프로덕션 테이블 95개는 **커밋된 덤프 파일 기준**이며 라이브 스키마와의 최종 대조는 `db-bridge` 가용 시 재확인 권장.
- **주의**: 본 문서는 **진단·제안**이며 코드 변경을 수반하지 않는다. 로드맵의 각 항목은 착수 전 해당 헌법(BE 18조 / FE 17조 / DB 10조) 조회와 개별 TASK PROPOSAL이 필요하다(특히 Phase 2의 모듈 분할·마이그레이션은 L2).

---

**1줄 요약**: 뼈대(모듈 의존 방향·ArchUnit·관측성·DB표준)는 우수하나 **재사용 코어(foundation)가 껍데기이고 필수/고유를 가르는 물리 경계가 없어**, "복제→삭제→신규 구축" 시나리오가 성립하려면 **코어 승격 → business-core/app 분할 → Postgres 베이스라인·시크릿 fail-fast**의 3단계 구조 리팩터가 선행되어야 한다(현 재사용 준비도 ≈ 50/100).
