# ⚖️ eGov Enterprise 프로젝트 아키텍처 정밀 점검 보고서

본 보고서는 `egov-enterprise` 프로젝트의 데이터베이스(DB), 백엔드, 프론트엔드 전반의 아키텍처 정합성을 비판적 관점에서 분석하고, 안정성 및 유지보수성 극대화를 위한 구조 개선 방안과 트레이드오프를 제시합니다.

> [!IMPORTANT] **현행화 이력 (2026-07-06 코드 전수 대조)**
> 본 보고서의 초판 진단 이후 상당수 항목이 이미 해결되었다. 각 항목에 코드 대조 기준 상태를 표기한다:
> **✅ 해결** · **🟡 부분(진행/일부만)** · **⚠️ 전제 낡음(문제 소멸/사실 변경)** · **🔴 미해결(여전히 유효)**
>
> **요약**: 초판이 "최악의 문제"로 지목한 **프론트엔드 Zod 파편화(§4.1)** 와 **`@Where` 고정 필터 소프트삭제(§2.2)** 는 이미 해소되었다. 반면 **가상 스레드 pinning(§3.3)** 은 전역 활성화된 상태로 완화책이 전무하여 **현시점 최우선 실질 리스크**이며, **N+1 fetchJoin 정적 게이트(방안2)** 는 여전히 미구현이다.

---

## 1. 개요 (Executive Summary)

현재 `egov-enterprise` 프로젝트는 **멀티 모듈 구조**(`api-server` ➔ `business-suite` ➔ `foundation`)의 백엔드와 **Next.js App Router 기반 프론트엔드**로 구성됩니다. 3대 헌법(DB/백엔드/프론트엔드)과 이를 강제하는 하네스(ArchUnit, Fail-Fast 테스트, 코드젠)가 상당 수준으로 정비되어, 초판에서 지적한 "개념(헌법)과 구현(코드)의 단절"은 **대부분 좁혀졌습니다.**

**현시점 잔여 핵심 과제**는 성격이 바뀌었습니다:
1. **🔴 가상 스레드 Thread Pinning (런타임 안정성)** — 전역 활성 상태에서 완화·계측 부재. **최우선.**
2. **🔴 JPA 동적 Fetch Join 누락에 대한 빌드타임 정적 게이트 부재** — LAZY는 강제되나 쿼리 단 fetchJoin 검증은 없음.
3. **🟡 정리성 부채** — 미사용 MapStruct 의존성 잔존(방안3), 소프트삭제 `@Filter`의 공통화·전사 확산 미완(방안4), Zod 코드젠의 npm/CI 미배선(방안1 후속).

---

## 2. DB & JPA 레이어 점검 결과 및 문제점

### 2.1. 표준 메타데이터 거버넌스(SSOT) 및 명명 규칙 점검 — 🟡 부분(일부 전제 정정)
- **현황(정정)**:
  - **명명 전략은 "명시적 CamelCase 전략 배선"이 아니라 프레임워크 기본값 의존**이다. `application.yml`·Java 어디에도 `physical-strategy`/`NamingStrategy` 설정이 없으며(0건), Spring Boot 3.4.1의 **기본 물리 명명 전략(camelCase→snake_case)** 에 암묵 의존한다. 즉 "전략을 골라 배선했다"기보다 "기본 동작에 의존한다"가 정확하다.
  - **물리 타입은 `char` 전면 배제·`varchar` 이전이 실제로 완료**되어 있다(마이그레이션 `V1..V1.10`에 standalone `char` 0건, `varchar` 47건). ✅
  - **`@Column`의 `name=` 생략**은 사실이다(예: `Board.java`가 `pst_id`/`bbs_id`/`atch_file_id`에만 `name=`을 두고 `pstTtl`·`ansLv`·`inqCnt` 등은 생략).
  - **정정 필요**: `meta_standard_words/terms/domains` 는 **런타임 DB 테이블이 아니다.** Flyway 마이그레이션(`V1..V1.10`)에 존재하지 않으며, 표준 명칭/타입은 **거버넌스 하네스(문서·스킬·`db_columns.json`)가 "저작 시점"에 강제**한다. "DB 테이블이 런타임에 표준을 강제한다"는 초판 서술은 부정확하다.
- **평가**: 간결한 엔티티(암묵 명명) + varchar 정비는 유효하나, 그 안전성은 아래 2.1 Fail-Fast 세이프티넷에 전적으로 의존한다.

### 2.1-b. Fail-Fast 세이프티넷 — ✅ 해결(실재 확인)
- 필드명 리팩토링 시 매핑 붕괴를 빌드/기동 시점에 잡는 안전망이 **실제로 배선되어 있다**:
  - `api-server/src/main/resources/application.yml`의 `spring.jpa.hibernate.ddl-auto: validate`(운영), `foundation` 테스트도 `ddl-auto: validate`.
  - Flyway로 스키마 이행 후 엔티티와 검증(Flyway-then-validate) → 매핑 불일치 즉시 Fail-Fast.
  - `@DataJpaTest` 슬라이스 스위트(`BoardRepositoryTest`, `BoardMasterRepositoryTest`, `RestdeRepositoryTest`, `SentMailRepositoryTest`, `SimpleJpaTest`) 및 `PersistenceTestSupport`(`@AutoConfigureTestDatabase(replace=NONE)`).
- 초판의 "테스트 보호망으로 커버한다"는 **아직 존재하지 않는 지향이 아니라 이미 갖춰진 사실**이다.

### 2.2. 물리/논리 삭제 혼용 및 런타임 조인 위험 — ⚠️ 전제 낡음(이미 대체됨)
- **초판 전제(무효)**: 고정형 글로벌 필터 `@Where(clause="use_yn='Y'")` 로 인해 부모가 논리 삭제되면 자식 조회 시 `EntityNotFoundException` 발생.
- **현재 사실**:
  - **`@Where` 는 코드에 존재하지 않는다**(Java 소스 0건; 문서/아카이브에만 잔존). 고정형 필터 전제 자체가 사라졌다.
  - **동적 Hibernate `@Filter` 로 이미 전환**되어 있다. `@FilterDef(softDeleteFilter)` 는 **`nuri.business.domain` 의 `package-info.java` 에 중앙 선언(2026-07-06)** 하고, `@Filter` 는 소프트삭제 대상 엔티티(`Board`·`Comment`)에 적용한다. (이전에는 `Board` 가 `@FilterDef` 를 호스팅해 `Comment` 가 암묵 의존했으나 결합을 제거함.)
  - **트랜잭션 단위 동적 제어가 구현**되어 있다: `SoftDeleteAspect` 가 `@Service`/`@Transactional` 경계에서 `softDeleteFilter(useYn='Y')` 를 켜고, `@DisableSoftDelete` 애노테이션 시 끈다. `SoftDeleteDynamicTest` 로 검증됨.
- **🟡 남은 문제(재정의)**: `@FilterDef` 중앙화는 완료됐으나 `@Filter` **적용은 Board·Comment 2개**뿐이다. 확산은 각 엔티티의 소프트삭제 대상 여부(전용 `use_yn` 컬럼·"비활성=조회 제외" 의미)를 판단해야 하는 **도메인 결정**이며, `SoftDeleteAspect` 가 서비스 읽기를 전역 필터링하므로 무분별 적용은 조회 누락 위험이 있다(→ 방안4에 확산 관례 명시).

---

## 3. 백엔드 아키텍처 점검 결과 및 문제점

### 3.1. 의존성 방향 및 계층 분립 — 🟡 부분(가드 일부 신설)
- **현황**: `api-server ➔ business-suite ➔ foundation` 3-Tier 준수, 순환 없음(Gradle `project()` 배선으로 구조적으로 보장).
- **정정된 비판 쟁점**: 초판의 "컨트롤러 침투 모니터링 부재"는 **일부 낡았다.** 다음 ArchUnit 가드가 신설되어 있다:
  - `api-server/.../ArchitectureTest.java`: `nuri.api..` 가 `@Entity` 클래스에 의존 금지(백엔드 헌법 제3조 1항) — **컨트롤러의 엔티티 접근을 정적 차단.**
  - `business-suite/.../ArchitectureTest.java`: Service/Domain 접근 계층 규칙, `@Service` 네이밍, 도메인→서비스 역참조 금지(dto projection 예외), 서비스 슬라이스 간 순환 금지.
  - `business-suite/.../architecture/JpaArchitectureTest.java`: LAZY 강제(§3.2).
- **🔴 남은 실질 갭**: (a) 컨트롤러가 엔티티 "타입 의존"을 넘어 **DTO 변환/비즈니스 로직을 수행**하는지까지 잡는 규칙은 없다. (b) 모듈 방향 자체를 ArchUnit 슬라이스로 단언하는 규칙은 없다(Gradle 배선에만 의존). (c) `api-server/build.gradle:49` 에 "ArchUnit - disabled due to test engine conflicts" **낡은 주석**이 남아 있음(실제 테스트 클래스는 활성) — 정리 필요.

### 3.2. JPA N+1 방어와 지연 로딩 — 🟡 부분(전 연관관계 LAZY 강제, 쿼리단 게이트는 유보)
- **현황(강화됨, 2026-07-06)**: `@ManyToOne`/`@OneToOne` **100% LAZY**(EAGER 0건, 32개 연관)에 더해, **`JpaArchitectureTest` 를 `@OneToMany`/`@ManyToMany` 까지 확장**하여 **모든 JPA 연관관계의 LAZY 를 빌드타임 강제**한다(EAGER 컬렉션 = 카테시안/N+1 폭탄 회귀 차단). 컬렉션 7개 전부 LAZY 확인, 규칙 그린.
- **🟡 유보(방안2 본체 — 쿼리단 정적 게이트)**: "조회 메서드의 fetchJoin()/@EntityGraph/DTO 프로젝션 누락"을 잡는 정적 게이트는 **의도적으로 유보**한다. 리포지토리 실측 결과 **@EntityGraph 0건**, @Query 62개 중 fetch join 4건뿐, 엔티티 컬렉션 반환 파생 쿼리 다수 — 지금 하드 룰을 걸면 수십 개 기존 메서드에서 **대량 오탐/빌드 붕괴**가 발생한다(ArchUnit 은 바이트코드만 보므로 JPQL/QueryDSL 문자열의 join fetch 여부도 판별 불가). **선행 조건**: 컬렉션 페치 메서드에 @EntityGraph 또는 DTO 프로젝션 관례를 먼저 도입한 뒤 핵심 테이블(게시판/회원/권한) 대상으로 좁게 게이트화. 런타임 완화책(`default_batch_fetch_size:100`, `batch_size:25`)은 유지.

### 3.3. Java 21 Virtual Threads 도입의 안전성 — 🟡 부분(관측 배선 완료, 튜닝은 부하 결과 대기)
- **현황(정정)**: 가상 스레드는 "언급" 수준이 아니라 **완전 활성**이다 — `application.yml`의 `spring.threads.virtual.enabled: true`(Tomcat 요청 전역, false 프로파일 없음) + `AsyncConfig.logExecutor`의 `setVirtualThreads(true)`.
- **재평가된 리스크(2026-07-06)**:
  - ✅ **앱 코드에 pinning 유발 요인 없음**: 전 모듈 `src/main` 에 `synchronized` **0건**. pinning은 앱 코드가 아니라 PostgreSQL JDBC / HikariCP 내부 동기화 구간에서만 발생 가능하며, "`synchronized→ReentrantLock` 전환"으로 고칠 **앱 코드 대상이 존재하지 않는다.**
  - ✅ **부하 테스트 하네스 존재**: `.github/workflows/load-test.yml`(k6, load level 파라미터). 초판의 "부하테스트 부재"는 부정확했다.
  - ✅ **pinning 관측 배선**: `build.gradle` 에 게이트된 `jdk.tracePinnedThreads` 진단(`-Ptrace-pinned`/`TRACE_PINNED`, 기본 off) 추가. `load-test.yml` 이 k6 실행 중 이를 활성화하여 `backend.log` 에 pinning 스택을 캡처하고, "Report Virtual Thread Pinning" 단계가 감지 시 CI 경고 + 아티팩트 업로드.
- **🟡 잔여(부하 결과 의존)**: pinning 실제 발생 여부는 **부하 테스트 실행 후 `backend.log` 로 확인**해야 한다. pinning이 관측될 때에만 HikariCP 풀(prod 20)·캐리어 스레드 병렬도(`jdk.virtualThreadScheduler.parallelism`) 튜닝을 검토한다. (관측 없는 선제 튜닝은 근거가 없으므로 지양.)

---

## 4. 프론트엔드 아키텍처 점검 결과 및 문제점

### 4.1. Zod 스키마 파편화 및 SSOT — ⚠️ 전제 낡음(이미 일원화 완료)
- **초판 전제(무효)**: 클라이언트 파일들이 인라인 `z.object({...})` 를 개별 구현하여 SSOT가 붕괴, `generated-zod.ts` 파이프라인은 방치.
- **현재 사실(2026-06, 커밋 `65c8c6778`)**:
  - `frontend/src` 애플리케이션 코드의 인라인 **`z.object(` = 0건**(257건은 전부 `src/types/generated-zod.ts` 단일 파일 내부).
  - **17개 파일이 `@/types/generated-zod` 를 import**하고 `.extend(` 27회로 UI 전용 필드를 확장한다.
  - 초판이 지목한 `BoardRegistClient.tsx` 는 이미 `BoardSaveRequestSchema.extend({...})` 패턴을 사용 — **방안1이 처방한 컨벤션 그대로.**
  - 중앙 `lib/validation/schemas.ts` 가 생성 스키마 11개를 import·확장.
- **✅ ESLint 강제 추가(2026-07-06)**: 인라인 `z.object` 금지 규칙(`no-restricted-syntax`, error)을 `eslint.config.mjs` 에 추가하여 컨벤션을 "사실상(de-facto)"에서 "기계 강제"로 승격(생성 파일 `generated-zod.ts` 는 예외). src 인라인 0건이라 회귀만 차단한다. "최악의 문제" 라벨은 제거. ⚠️ 단 현재 `npm run lint` 자체가 ESLint 9 + eslint-config-next(FlatCompat) 호환 오류로 크래시하므로(내 변경과 무관, 원본 설정에서도 재현), 규칙의 런타임 검증은 lint 복구 후 가능하다.

### 4.1-b. Zod 코드젠 동기화 파이프라인 — 🟡 부분(배선 완료, 드리프트 재조정 필요)
- **현황**: `frontend/package.json` 의 `codegen:ts`/`codegen:file`/`codegen:verify` 는 `openapi-typescript` 로 `generated-api.d.ts`(TS 타입)만 생성한다. Zod 생성기는 `.agent/scripts/codegen-zod.js`(입력 `api-docs.json`, `__dirname` 기반이라 CWD 독립).
- **✅ 배선(2026-07-06)**: `codegen:zod`(= `node ../.agent/scripts/codegen-zod.js`) 와 드리프트 가드 `codegen:verify:zod`(= 재생성 후 `git diff --exit-code generated-zod.ts`) npm 스크립트를 추가.
- **⚠️ 드리프트 발견(별도 재조정)**: `codegen:zod` 를 실제 실행하면 `generated-zod.ts` 가 변경된다(예: `NetworkDto` 스키마 삭제, `MenuDto.useYn` 삭제, `FileDto` 순서 이동) — 커밋된 파일이 SSOT(`api-docs.json`) 대비 **stale**이다. 게다가 프론트가 삭제된 스키마를 참조 중(`lib/validation/schemas.ts` 의 `networkSchema`)이라 **단순 재생성은 프론트 빌드를 깨뜨린다.** 따라서 재생성물은 커밋하지 않았으며, "재생성 + 참조 정리 + 빌드 검증"은 별도 재조정 작업으로 분리한다(가드 `codegen:verify:zod` 가 이 드리프트를 지속 감지).

### 4.2. 하이드레이션 안전 및 리프 컴포넌트 격리 — 🟡 부분(격리 실천되나 불균일)
- **현황(계량)**: `src` 459개 파일 중 **210개(~46%)** 가 상단 `'use client'`. 라우트 `page.tsx` 122개 중 **79개(65%)** 가 통째로 클라이언트(예: 8줄짜리 `approvals/page.tsx` 도 client).
- **반증(격리 실천의 증거)**: 서버 페이지→클라이언트 아일랜드 컨벤션이 널리 쓰임(`*Client.tsx` 아일랜드 56개), `components/ui` 리프 프리미티브 34개가 올바르게 리프 격리(tabs/dialog/popover/checkbox/select/calendar 등).
- **🟡 결론**: 우려는 유효하나 "격리 실패"로 단정할 수는 없다. 검증 가능한 실제 신호는 **높은 전면-클라이언트 비율(page.tsx 65%)** 이다 → 79개 client `page.tsx` 를 리프 아일랜드로 밀어내리는 감사(audit)가 실질 개선안.

---

## 5. 유지보수 및 안정성 최적화 방안 (이행 현황 반영)

### 방안 1: 자동 생성 Zod 스키마 활용 강제화 — ✅ 정착 + 후속 배선 완료(드리프트 재조정 잔여)
`generated-zod.ts` + `.extend()` 컨벤션 정착(인라인 0건, 17개 소비처)에 더해 2026-07-06 후속 완료:
- ✅ 인라인 `z.object` 금지 ESLint 규칙(`no-restricted-syntax`) 추가 — 컨벤션을 기계 강제로 승격.
- ✅ `codegen:zod` + `codegen:verify:zod` npm 배선 — Zod 생성/드리프트 가드.
- **⚠️ 잔여(별도 작업)**: (a) `generated-zod.ts` 가 `api-docs.json` 대비 **드리프트** 상태 — 재생성 + 프론트 참조(`networkSchema` 등) 정리 + 빌드 검증이 함께 필요(단순 재생성 시 빌드 붕괴). (b) `npm run lint` 크래시(ESLint 9 / eslint-config-next FlatCompat) 복구 — 현재 lint 게이트가 동작하지 않아 신규 규칙도 실행 불가.

### 방안 2: fetchJoin() 검증용 빌드타임 ArchUnit/린트 게이트 — 🔴 미구현(핵심 잔여)
LAZY 강제(`JpaArchitectureTest`)는 됐으나, **쿼리 메서드의 fetchJoin/DTO 프로젝션 누락을 잡는 정적 게이트는 없다.** 초판의 방안2 본체는 그대로 미해결.
- **장점/단점**: (초판 서술 유효) 런타임 N+1 사전 차단 vs 동적 QueryDSL 오탐 가능.
- **도입 권고**: **선택적 도입**. 핵심 트래픽 테이블(게시판/회원/권한)에 좁게 시작. 정적 분석 한계를 감안해, 리포지토리 관례(Fetch 전용 메서드 네이밍/DTO 프로젝션 필수) + 부분 ArchUnit 조합 권장.

### 방안 3: MapStruct 제거 및 명시적 record 변환 — ✅ 완료 (2026-07-06)
- **현황**: **MapStruct 사용처 0**(`import org.mapstruct` 0건, `@Mapper`/`MapperImpl` 없음). record/정적 팩토리(`X.from(entity)`)가 이미 표준(예: `BoardDto`, `UserDto`, `SatisfactionDto`... 다수), `BaseAbstractService` 가 수동 `toDto/toDtoList/toPage` 를 중앙화. `foundation` 의 `GenericMapper` 는 MapStruct가 아닌 손수 작성 인터페이스.
- **✅ 정리 완료 (2026-07-06)**: `foundation`/`business-suite` build.gradle의 **미사용 MapStruct 의존성 6줄**(라이브러리 + processor + lombok-mapstruct-binding)을 삭제. 소스 마이그레이션 없이 전 모듈(foundation/business-suite/api-server, main+test) 컴파일 무영향 확인. 방안3 종결.

### 방안 4: Hibernate `@Filter` 기반 동적 소프트삭제 — 🟡 인프라 완성 + @FilterDef 중앙화, 확산은 도메인 판단
- **현황**: 동적 `@Filter` + `SoftDeleteAspect` + `@DisableSoftDelete` + `SoftDeleteDynamicTest` 구축 완료. **2026-07-06: `@FilterDef` 를 `nuri.business.domain/package-info.java` 로 중앙화**하여 Board 호스팅 결합을 제거(full `@SpringBootTest` 로 필터 동작 회귀 없음 확인). 적용 엔티티는 `Board`·`Comment`.
- **확산 관례(도입 권고)**: 새 소프트삭제 대상 엔티티는 `@Filter(name = "softDeleteFilter", condition = "use_yn = :useYn")` 한 줄만 추가하면 된다(@FilterDef 재선언 불필요). 단 **무분별 확산 금지** — `SoftDeleteAspect` 가 모든 서비스 읽기에 필터를 걸므로, 대상은 (a) 전용 `use_yn` 컬럼과 (b) "비활성=조회 제외" 비즈니스 의미를 가진 엔티티로 한정하고 엔티티별 조회 영향 테스트 후 추가한다. (마커 인터페이스 자동 적용은 Hibernate 가 인터페이스의 @Filter 를 스캔하지 않으므로 불가.)

---

## 6. 결론 및 현행 로드맵

초판 대비 **뼈대(모듈 분리·의존성 방향·명명·Fail-Fast)뿐 아니라, 지적됐던 상위 결함 다수가 이미 해소**되었다(Zod SSOT 일원화, `@Where`→동적 `@Filter` 전환, 컨트롤러-엔티티 ArchUnit 가드, LAZY 빌드 강제). 남은 과제는 **런타임 안정성**과 **정리성 부채**로 성격이 이동했다.

### 우선순위 기반 로드맵 (2026-07-06 갱신)
1. **🟡 런타임 안정성**: **가상 스레드 Pinning — 관측 배선 완료(2026-07-06), 부하 결과 대기.** `jdk.tracePinnedThreads` 진단을 k6 부하 테스트에 배선(backend.log 캡처 + CI 경고). 앱 코드 `synchronized` 0건이라 코드 완화 대상 없음. **다음 단계: load-test.yml 실행 → pinning 관측 시에만 Hikari 풀/스케줄러 병렬도 튜닝.**
2. **🟡 성능 게이트 (방안2)**: ✅ 모든 연관관계 LAZY 빌드 강제로 확장(2026-07-06, `JpaArchitectureTest` — EAGER 컬렉션 회귀 차단). 🟡 쿼리단 fetchJoin/DTO 정적 게이트는 유보 — @EntityGraph 0건 상태라 선행으로 @EntityGraph/DTO 프로젝션 관례 도입 후 핵심 테이블 대상 좁은 게이트화 권장.
3. **🟡 정리성**: ✅ (a) 미사용 MapStruct 의존성 6줄 삭제(방안3) **완료(2026-07-06)** · ✅ (b) `api-server/build.gradle` 낡은 "ArchUnit disabled" 주석 정리 **완료** · 🟡 (c) Zod `codegen:zod` npm 배선 + 드리프트 가드(방안1 후속) — 잔여.
4. **🟡 확산/정리 (중기)**: ✅ 소프트삭제 `@FilterDef` 중앙화(2026-07-06) · ✅ Zod `codegen:zod` 배선 + 드리프트 가드 + 인라인 금지 ESLint 규칙(2026-07-06). 🟡 `@Filter` 대상 확대(방안4)는 엔티티별 판단 후 진행.
6. **⚠️ 신규 발견 (별도 처리 필요)**: (a) `generated-zod.ts` 가 `api-docs.json` 대비 **드리프트**(재생성 시 `NetworkDto` 등 제거 → 프론트 참조 정리 + 빌드 검증 동반, 단순 재생성 금지). (b) **`npm run lint` 크래시**(ESLint 9 + eslint-config-next FlatCompat 순환 구조) — 프론트 lint 게이트가 현재 미동작, 복구 필요.
5. **🟡 감사 (중기)**: 79개 전면-클라이언트 `page.tsx` 의 `'use client'` 리프 다운 감사(§4.2).

> [!NOTE] **검증 근거**
> 본 현행화는 2026-07-06 코드 전수 대조(DB/JPA·백엔드·프론트엔드 병렬 검증)로 각 항목의 상태와 file:line 근거를 확보하여 갱신하였다. `char/varchar`, `@Where` 0건, `z.object` 인라인 0건, `EAGER` 0건, `spring.threads.virtual.enabled:true`, MapStruct 사용처 0건 등은 grep/카운트로 실측되었다.
