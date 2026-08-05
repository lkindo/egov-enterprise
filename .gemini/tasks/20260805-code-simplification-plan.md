# 코드 간결화 · 불필요 코드 최소화 — 전 소스 범위 및 단계별 실행 계획

- Date: 2026-08-05
- Grade: L2 (Architecture & Strategy)
- Status: **실측 완료 · 계획 수립 완료 · 착수 승인 대기**
- 관계: [20260804-code-simplification-strategy.md](20260804-code-simplification-strategy.md)(요약 26줄 stub)를 **대체**한다.
  그 문서의 수치(1,609 파일 / 195,930 LOC)는 빌드 산출물·마크다운·SQL 을 포함한 값이라
  "최적화 대상 소스" 의 크기가 아니다. 아래는 대상 코드만 다시 실측한 값이다.

---

## 0. 먼저 — 이 요청의 전제 하나를 실측으로 정정한다

요청은 "**불필요 코드 및 과도한 주석**" 을 함께 겨냥했다. 그런데 실측하면 **과도한 주석은 이 저장소의 문제가 아니다.**

| 신호 | 실측값 | 판정 |
|---|---:|---|
| 주석처리된 코드 (`// foo();` 형태) | **8줄** (Java 3 · TS 5) | 없음 |
| TODO / FIXME / XXX / HACK | **2건** | 없음 |
| 자명한 한 줄 javadoc (`/** 조회 */` 류) | 27건 | 미미 |
| getter/setter 위 javadoc | 14건 | 미미 |
| `@param x x` 형태 이름 반복 javadoc | **0건** | 없음 |
| 수동 getter/setter 선언 | **0건** (Lombok 전면 채택, 387파일) | 없음 |
| 주석 비율 — Java main | 4,771 / 39,296 = **12.1%** | 정상 범위 |
| 주석 비율 — FE (generated 제외) | 3,745 / 61,153 = **6.1%** | 오히려 낮음 |

그리고 더 중요한 것: **이 저장소의 주석 상당수는 "무엇을" 이 아니라 "왜" 를 남긴 판단 기록이다.**
`GEMINI.md §0.7-H1~H5` 가 요구하는 근거(왜 이 예외가 있는가·왜 이 값을 좁혔는가)가 코드 주석에 박혀 있고,
[wave2-carryover.md](../../docs/04-operations/wave2-carryover.md) 는 그 기록이 사라져서 다음 오퍼레이터가
같은 실수를 반복한 사고를 명시적으로 다룬다.

> **따라서 주석 총량 감축은 이 계획의 목표가 아니다.** 지우면 코드 리뷰 정확성이 **올라가는 게 아니라 내려간다.**
> 대신 주석 관련 작업은 **41건의 자명한 javadoc 제거**로 한정한다(Phase 1).

같은 이유로 "불필요 코드" 도 이미 대부분 청산돼 있다 — 단일-impl 인터페이스 39개는 2026-07 에 정리됐고
(현재 `*Service.java` 66 : `*ServiceImpl.java` 2), 미사용 프론트 의존성은 **77개 중 0건**이다.

**남은 부피는 쓰레기(litter)가 아니라 구조(structure)다.** 계획은 그쪽을 겨냥한다.

---

## 1. 범위 (Scope) — 실측 기준선

### 1.1 대상 코드 규모 (2026-08-05 실측)

| 영역 | 파일 | LOC | 비고 |
|---|---:|---:|---|
| BE main (5개 gradle 모듈) | 631 | **39,296** | foundation 2,998 / business-core 17,471 / business-app 11,347 / api-server 6,266 / migration-tool 1,214 |
| BE test + testFixtures | 362 | **45,857** | **main 을 초과한다** (1.17배) |
| FE `src` (generated 제외) | 520 | **61,153** | 이 중 `'use client'` 165파일 · 40,037 LOC |
| **소계 (최적화 대상)** | **1,513** | **146,306** | |
| FE generated (`generated-api.d.ts` 17,111 / `generated-zod.ts` 3,817) | 2 | 20,928 | **대상 제외** — 자동 산출물 |

부수 지표: 엔드포인트 326개 · 컨트롤러 65개(4,924 LOC) · DTO 119파일(4,795 LOC) · `@Test` 1,715개 · `useState` 494개.

### 1.2 범위 밖 (Non-goals) — 명시적으로 하지 않는 것

1. **주석 총량 감축** — §0 근거. 41건 자명 javadoc 외에는 손대지 않는다.
2. **예외·동결 목록 축소로 게이트를 조용하게 만들기** — `GRANDFATHERED`·`EXCLUDED_*`·`*_WHITELIST` 편집 금지(§0.7-H2).
   "간결화" 라는 이름으로 신호를 지우는 것은 이 프로젝트가 2026-07-26 사고로 이미 대가를 치른 안티패턴이다.
3. **동일 패턴 일괄 치환(sweep)** — N개소를 같은 방식으로 바꾸려면 각 호출부가 왜 동일한지를 먼저 증명한다(§0.7-H4).
4. **generated 파일 편집** — 20,928 LOC. 손대면 `codegen:verify` 가 red 가 되고, 그것이 정상이다.
5. **테스트 삭제로 LOC 줄이기** — 아래 Phase 2 는 **중복 제거**이지 커버리지 감축이 아니다. `@Test` 총수는 유지한다.

### 1.3 성공 기준 — LOC 가 아니라 리뷰 가능성

이 저장소는 이미 정리돼 있어 **극적인 삭제량이 나오지 않는다.** 정직한 추정은 **146,306 LOC 중 9,000~13,000 (6~9%)** 이다.
따라서 성공은 삭제량이 아니라 아래 3개로 측정한다.

| 지표 | 현재 | 목표 |
|---|---:|---:|
| 600줄 초과 파일 수 | FE 10 / BE 1 | FE ≤ 3 / BE 0 |
| 교차 중복 8줄 윈도우 | FE 320 · BE main 115 · BE test 222 | 각 50% 이하 |
| FE 클라이언트 컴포넌트 LOC 비중 | 40,037 / 61,153 = **65%** | ≤ 45% |

---

## 2. 실측된 최적화 표적 (Inventory)

### 2.1 진짜 죽은 코드 — 소량이지만 확실

참조 0건 Java 클래스를 스캔하면 **51건**이 나오지만, **그중 48건은 위양성**이다.
Spring 은 컴포넌트 스캔·이름 규약으로 배선하므로 "직접 참조 0건" 은 사(死)의 증거가 아니다.
`*RepositoryImpl`(Spring Data 커스텀 프래그먼트) 24건은 전부 대응 인터페이스가 3~33회 참조되며 **살아 있다.**

| 분류 | 건수 | 대상 |
|---|---:|---|
| **A. 스테레오타입 없는 참조 0건 클래스** | **3** | `foundation/.../core/mapper/GenericMapper.java` · `business-core/.../domain/file/exception/FileErrorCode.java` · `business-core/.../service/menu/MenuDataInitializer.java` |
| **B. 참조 0건 Repository 인터페이스** | **5** | `BkmkMenuRepository` · `SiteMapRepository` · `BoardUseQueryRepository` · `MainImageDomainRepository` · `DiaryRepository` |
| **C. 참조 0건 FE 모듈** | **2** | `app/components/ui/national-distribution-map.tsx` · `config/project-modules.ts` (`*.stories.tsx` 2건은 Storybook 정상 자산이라 제외) |
| **D. 불필요 `'use client'`** | 17 → **실질 ~8** | `error.tsx` 9건은 **Next 규약상 필수**라 제외. 잔여 8건도 context·3rd-party(recharts) 사유가 있을 수 있어 개별 검증 필요 |

> ⚠ B 는 "아무도 주입하지 않는 저장소" 라 사(死)가 맞지만, **삭제 전 도메인 판정이 선행**돼야 한다 —
> `DiaryRepository`·`MainImageDomainRepository` 는 [pending-decisions.md](../../docs/04-operations/pending-decisions.md) §7 의
> **미결 D-5(미노출 백엔드 API 4종)** 와 겹친다. 제품이 "구현" 을 택하면 삭제가 아니라 배선 대상이다.

### 2.2 구조적 중복 — 여기가 실제 부피

**(a) 모듈 간 테스트 파일 클론 — 6파일 868 LOC, 3개는 바이트 동일**

| 파일 | core | app | 차이 |
|---|---:|---:|---:|
| `ArchitectureTest.java` | 110 | 110 | **0줄** |
| `architecture/JpaArchitectureTest.java` | 114 | 114 | **0줄** |
| `architecture/EntityConventionArchTest.java` | 53 | 53 | **0줄** |
| `support/SchemaDumper.java` | 126 | 126 | 6줄 |
| `config/TestQueryDslConfig.java` · `support/BusinessIntegrationTestSupport.java` | — | — | 미측정 |

**(b) 도메인 near-clone — `InstitutionCode` 계열 4파일 561 LOC**
`InstitutionCodeDto`(104) ↔ `InstitutionCodeRecptnDto`(131) 는 차이가 **31줄**뿐이고,
`InstitutionCode`(153) ↔ `InstitutionCodeRecptnLog`(173) 도 8줄 윈도우 48개가 겹친다.

**(c) FE 교차 중복 — 320 윈도우 / 63파일**

| 중복 쌍 | 윈도우 |
|---|---:|
| `SurveyManageCreateClient` ↔ `SurveyManageDetailClient` | 53 |
| `SurveyStatsClient` ↔ `SurveyDetailClient` | 47 |
| `InsertScrapClient` ↔ `SelectScrapDetailClient` | 36 |
| `CommunityHubClient` ↔ `SmsHubClient` | 21 |

### 2.3 거대 파일 — 리뷰 정확성의 직접 저해 요인

| 파일 | LOC | useState |
|---|---:|---:|
| `admin/system/monitoring/MonitoringHubClient.tsx` | 1,387 | — |
| `admin/user/UserOrgHubClient.tsx` | 1,384 | **22** |
| `admin/system/banner/BannerAdminClient.tsx` | 963 | — |
| `admin/security/authority/SecurityHubClient.tsx` | 876 | 12 |
| `admin/system/common-code/CommonCodeClient.tsx` | 860 | 10 |
| `admin/system/menus/MenuAdminClient.tsx` | 739 | 10 |
| `admin/work-hub/WorkHubClient.tsx` | 654 | 13 |
| `business-core/.../service/menu/MenuService.java` | 664 | — |

> 참고로 폼 관리는 이미 표준화돼 있다 — `useAppForm` 26개소 vs 수동 `handleChange` **1개소**.
> 테이블도 `StandardDataTable` 59개소 vs 자체 `<table>` 9개소. **패턴 부재가 아니라 적용 누락**이 문제다.

### 2.4 DTO — record 전환 여지 (실측 정정 2026-08-05)

DTO 119파일 4,795 LOC 중 이미 `record` 는 12건이고, **80건이 Lombok(`@Getter`/`@Builder`) 클래스**(3,977 LOC)다.

> ⚠ **초안의 "파일당 30~50% 축약" 은 과대 추정이었다.** `@Schema`·검증 애노테이션이 record 에서도
> 그대로 남는다는 점을 계산에서 빠뜨렸다. 실측하면 아래와 같다.

| 구성 | 줄 수 | record 전환 시 |
|---|---:|---|
| Lombok 애노테이션 | **318** | **소멸 (확정 감소분)** |
| `@Schema` 문서화 | 514 | **유지** — OpenAPI 계약 |
| 검증 애노테이션(`@Size`·`@NotBlank` 등) | 495 | **유지** |
| `private` 필드 선언 | 686 | 파라미터로 이동 (줄 수 동일) |
| 빈 줄 | 764 | 일부만 소멸 |
| **합계** | **3,977** | **확정 318줄(8.0%) · 낙관 700줄(17.6%)** |

**전환 걸림돌 (실측)**

| 항목 | 건수 | 의미 |
|---|---:|---|
| `@Setter`/`@Data` 보유 | **80건 중 64건** | record 는 불변 → `dto.setXxx()` 호출부 전량 재작성 필요 |
| `@Builder` 보유 | 76건 | Lombok `@Builder` 는 record 에서도 동작하나 호출부 확인 필요 |
| 저장소 전체 `.builder()` 호출부 | 1,195 | 폭발 반경 상한 |
| 저장소 전체 `setXxx(` 호출부 | 565 | 폭발 반경 상한 |
| `extends` 사용 (record 불가) | **0** | 차단 요인 없음 |
| `@Entity` 혼재 (record 불가) | **0** | 차단 요인 없음 |

**이 항목의 실익은 축약이 아니라 불변성이다.** 80건 중 64건이 `@Setter` 로 열려 있다는 것은
DTO 가 계층을 통과하는 도중 임의 변조 가능하다는 뜻이며, [백엔드 헌법 제3조](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)의
계층 격리 취지와 어긋난다. LOC 8% 를 근거로 이 작업을 정당화하면 비용 대비 효과가 맞지 않는다 —
**정당화 근거는 "가변 DTO 64건의 불변화"** 이며, 축약은 부산물이다.

### 2.5 제품 결정 대기 (에이전트 단독 불가)

| 항목 | 규모 | 출처 |
|---|---:|---|
| `business-core` 내 샘플 도메인 (banner 231 · popup 287 · community 367 · **survey 1,868** · consult 353) | 55파일 **3,106 LOC** | pending-decisions §1-B |
| 미노출 백엔드 API 4종 (휴일·상담·ISG·메인이미지) | 미측정 | pending §7 D-5 |
| 설문 껍데기 5라우트 | 미측정 | pending §7 D-4 |
| eGov 잔재 33파일 | — | 단, ARIA 암호·`EgovPasswordEncoder` 는 **'전환기 필연'으로 이미 판정**(pending §6) — 제거 대상 아님 |

---

## 3. 단계별 실행 계획

**설계 원칙**: 위험도 오름차순으로 배치하되, **각 Phase 를 기계 게이트에 결속**한다(§0.7-H5).
게이트 없는 리팩터는 "간결해졌다" 는 주관적 보고만 남기고 회귀를 숨긴다.

---

### Phase 0 — 측정 고정 (L1 · 선결)

**무엇**: 이 문서의 수치를 재현 가능한 스크립트로 고정한다 — `scripts/code-census.mjs`.
LOC·주석비율·중복윈도우·클라이언트비중·600줄초과 파일수를 JSON 으로 출력.

**왜 먼저인가**: 이후 모든 Phase 의 성과를 "몇 줄 지웠다" 가 아니라 **§1.3 지표의 전후 델타**로 증명하기 위해서다.
기준선 없이 착수하면 Phase 4 종료 시점에 무엇이 개선됐는지 주장할 근거가 없다.

**게이트**: 없음(리포트 전용). CI 복구 시 PR 코멘트로 델타 출력하는 것을 후속 과제로 남긴다.
**예상 감축**: 0 (측정 인프라). **위험**: 없음.

---

### Phase 1 — 확정 사(死)코드 및 자명 주석 제거 (L1)

| 작업 | 대상 | 판정 방식 |
|---|---|---|
| 1-1 | §2.1-A 클래스 3건 | **개별** 판정. `MenuDataInitializer` 는 조건부 로딩(`@ConditionalOn*`) 여부 확인 필수 |
| 1-2 | §2.1-B 死 Repository 5건 | **개별** 판정. D-5 와 겹치는 2건은 **보류하고 Phase 5 로 이관** |
| 1-3 | §2.1-C FE 모듈 2건 | `national-distribution-map` 은 대시보드 재도입 계획 확인 후 |
| 1-4 | §2.1-D `'use client'` ~8건 | `error.tsx` 9건 제외. 제거 후 `next build` 로 RSC 경계 확인 |
| 1-5 | 자명 javadoc 41건 · 주석처리 코드 8줄 · TODO 2건 | TODO 2건은 삭제가 아니라 **이슈화 또는 해결** |

**⚠ 일괄 처리 금지**: 1-1~1-3 은 총 10건뿐이므로 **한 건씩 근거를 남기고 삭제**한다.
"참조 0건" 은 삭제 사유가 아니다 — Spring 배선·리플렉션·설정 문자열 참조를 각각 배제해야 사유가 된다.

**게이트**: `./gradlew compileJava compileTestJava` + `npx tsc --noEmit` + `./gradlew :api-server:harnessTest` + `next build`
**예상 감축**: **400~600 LOC** (측정 기반). **위험**: 낮음.

---

### Phase 2 — 테스트 자산 중복 제거 (L1)

**무엇**: §2.2-(a) 의 모듈 간 클론 6파일(868 LOC)을 공유 자산으로 승격한다.

**어떻게**: 단순 삭제 금지. ArchUnit 테스트는 **모듈별로 스캔 대상 패키지가 달라야** 의미가 있다 —
`business-core` 의 `ArchitectureTest` 를 지우면 그 모듈의 아키텍처 검증이 통째로 사라진다.
→ **규칙 본문을 공유 `testFixtures` 로 올리고, 스캔 루트만 모듈이 주입**하는 형태로 전환한다.

**함께 처리**: [wave2-carryover.md §2 A-1 잔여②](../../docs/04-operations/wave2-carryover.md#L140) —
`business-core`/`business-app` testFixtures 의 `TestSecurityConfig`(`anyRequest().permitAll()`)가 여기 같은 위치에 있다.
중복 정리와 보안 부채 해소를 한 번에 처리한다.

**게이트**:
- 삭제 전후 **`@Test` 총수 1,715 유지** 확인 (커버리지 감축이 아님을 증명)
- `./gradlew :business-core:test :business-app:test` 양쪽 그린
- **위반 주입 red 확인** — 공유 ArchUnit 규칙이 각 모듈에서 실제로 발화하는지(§0.7-H5).
  그린만 확인하면 "스캔 루트가 비어서 통과" 와 구분되지 않는다.
- `HarnessBaselineIntegrityTest` 매니페스트 갱신

**예상 감축**: **~450 LOC** + 규칙 변경 시 2곳 동기화 부담 해소. **위험**: 중 (vacuous 통과 주의).

---

### Phase 3 — 도메인 near-clone 수렴 및 DTO 축약 (L1/L2)

**3-A. `InstitutionCode` 계열 (561 LOC)** — DTO 쌍은 차이가 31줄뿐이다.
공통 상위 타입 추출 또는 단일 타입 + 구분 필드로 수렴. ⚠ `tb_inst_cd_rcptn_log.etc_cd` 는
pending §3-E 의 **미결 항목**(원천 스펙 미확정)이라 그 필드는 건드리지 않는다.

**3-B. DTO 80건 record 전환** — **목적은 축약(확정 8.0% · 낙관 17.6%)이 아니라 가변 DTO 64건의 불변화**(§2.4).
**반드시 배치(batch)로 나눠 진행하며 일괄 변환 금지**(§0.7-H4). record 는 Lombok 클래스와 아래가 다르다:
- **불변** — `@Setter` 보유 64건의 `setXxx()` 호출부를 **건별로 확인**해야 한다. 저장소 전체 setter 호출은 565개소이며
  이 중 몇 개가 대상 DTO 를 가리키는지는 배치 착수 시 개별 실측한다. **여기가 이 Phase 의 실제 비용이다.**
- Jackson 역직렬화 — 기본 생성자 부재, `@JsonCreator` 필요 여부가 케이스마다 다름
- Hibernate — `@Entity` 는 record 불가 (실측 결과 DTO 80건 중 `@Entity` 혼재 **0건** · `extends` **0건** → 차단 요인 없음)
- springdoc — 스키마 생성 결과가 달라지면 **`generated-api.d.ts` 가 바뀐다**

> **배치 우선순위**: `@Setter` 없는 16건(순수 읽기 DTO) → 호출부가 좁은 것 순. 64건을 한 번에 열지 않는다.

**게이트 (필수)**:
- `pnpm -C frontend codegen:verify` + `codegen:verify:zod` — **계약 드리프트 0 확인**.
  이 게이트가 Phase 3 의 안전선이다. DTO 형태가 바뀌었는데 스펙이 안 바뀌면 그게 이상한 것이다.
- `OpenApiDocumentationTest` · `RequestResponseSchemaValidationTest`
- 각 배치마다 해당 컨트롤러 테스트 직접 실행

**예상 감축**: **500~900 LOC** (3-A 200~300 + 3-B 318~700). **위험**: 중~높음 (API 계약 + 호출부 폭발 반경).

---

### Phase 4 — FE 클라이언트 편중 시정 및 거대 컴포넌트 분할 (L2) ★ 최대 효과

**문제**: FE 61,153 LOC 중 **40,037(65%)가 `'use client'`** 다. [FE 헌법 제3조](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)의
**서버 컴포넌트 우선** 원칙과 정면으로 어긋나며, 번들 크기·초기 렌더·리뷰 난이도에 동시에 작용한다.

**4-1. 데이터 페칭의 서버 이관** — Hub/Admin Client 들이 `useEffect` + `useState` 로 초기 데이터를 가져오는 패턴을
서버 컴포넌트 fetch → props 주입으로 전환. `useState` 494개 중 상당수가 여기서 소멸한다.

**4-2. 거대 파일 분할 (§2.3, 7파일 6,863 LOC)** — 우선순위:
`UserOrgHubClient`(1,384 / useState 22) → `MonitoringHubClient`(1,387) → `BannerAdminClient`(963) → 나머지.
`UserOrgHubClient` 는 [pending §5-A](../../docs/04-operations/pending-decisions.md)에 이미 등재된 항목이다.

**4-3. 교차 중복 수렴 (§2.2-c, 320 윈도우/63파일)** — survey·scrap·hub 계열의 공통 훅/레이아웃 추출.
⚠ **각 쌍이 왜 동일한지 먼저 증명**한다(§0.7-H4). `SurveyManageCreate` ↔ `SurveyManageDetail` 은
생성/수정이라 검증 규칙이 다를 수 있고, 그 차이를 지우면 기능 회귀다.

**4-4. 잔여 표준 패턴 적용** — 자체 `<table>` 9개소 → `StandardDataTable`, 수동 `handleChange` 1개소 → `useAppForm`.

**선결 조건 — 2026-08-05 해소됨**: 종전에는 "E2E 22티어가 CI 과금 차단으로 돌지 않아 회귀를 잡을 게이트가 없다"
는 이유로 전면 착수를 보류했다. **그 전제가 틀렸다** — PR #287 에서 CI 전체가 실제로 돌았고
**8개 잡 전부 success**(backend-build · frontend-build · secret-scan · mutation-test · e2e-tests 3샤드 · e2e-merge-reports).
E2E 는 이번 세션의 FE 변경(`HubSkeleton` 서버 컴포넌트 전환 등)을 실제로 통과시켰다.
→ **안전망이 작동함이 증명됐으므로 Phase 4 착수 조건은 충족이다.**
(`npx tsc --noEmit` 은 여전히 타입만 본다 — 렌더 회귀는 E2E 가 잡는다.)

**4-4 는 실측 결과 사실상 비어 있다 (2026-08-05 정정)**

계획은 4-4 를 "저위험 착수 지점" 으로 잡았으나 실제 대상이 거의 없다:

| 계획 서술 | 실측 |
|---|---|
| 자체 `<table>` 9개소 → `StandardDataTable` | **실제 대상 1~2건뿐.** 9건 중 `standard-data-table.tsx`·`components/ui/table.tsx` 는 **그 표준 컴포넌트 자신**이고, 2건은 테스트, `MonitoringHubSkeleton`·`monitoring/hub/page`·`survey/hub/page` 는 스켈레톤/정적, `SecurityMatrixVisualizer` 는 데이터 테이블이 아니라 매트릭스 시각화라 `StandardDataTable` 이 맞지 않는다 |
| 수동 `handleChange` 1개소 → `useAppForm` | **0건.** 유일한 매치가 `components/ui/__tests__/input.test.tsx` 즉 **테스트 파일**이다 |

→ **4-4 를 착수 지점으로 삼지 말 것.** Phase 4 의 실질은 4-1·4-2·4-3 이다.

**파일럿 대상 확정 — `MonitoringHubClient.tsx` (2026-08-05 구조 실측)**

| 후보 | LOC | useState | useEffect | useQuery | 최상위 하위 컴포넌트 |
|---|---:|---:|---:|---:|---|
| **`MonitoringHubClient`** | **1,387** | **4** | **0** | 9 | **6개** (`SampleDataBadge` 160 · `NavButton` 1008 · `StatusIndicator` 1035 · `HarnessDashboardOverview` 1070 · `SkillDetailView` 1155 · `TestDetailView` 1284) |
| `UserOrgHubClient` | 1,384 | 22 | 3 | 4 | 4개 (`SortableDeptNode` 114 · `NavButton` 1285 · `OrgPolicyPanel` 1322 · `InfoBlock` 1370) |

**`MonitoringHubClient` 를 먼저 하는 이유**: `useEffect=0`·`useState=4` 라 상태 결합이 얕고,
하위 컴포넌트 6개가 이미 같은 파일 안에 **최상위로 선언**돼 있어 **로직 변경 없는 순수 이동**으로
약 380줄(1008~1387)을 뽑아낼 수 있다. 파일럿이 요구하는 "순수 분할" 조건에 정확히 맞는다.
`UserOrgHubClient` 는 `useState=22` 로 본체가 엉켜 있어 분할 시 상태 경계 판정이 선행돼야 한다(2순위).

> ⚠ 추출 시 주의: `HarnessDashboardOverview` 가 `SampleDataBadge`(160행)를 참조하므로
> 단순히 꼬리 380줄만 잘라내면 깨진다. 공유 하위 컴포넌트를 함께 옮기거나 export 해야 한다.

**게이트**: `npx tsc --noEmit` + `next build`(RSC 경계) + `pnpm -C frontend test:e2e` 해당 티어 + Storybook 렌더
**예상 감축**: **4,000~8,000 LOC**. **위험**: 높음.

---

### Phase 5 — 제품 결정 의존 (사용자 승인 필수)

착수 전 결정이 필요하며, **에이전트가 단독으로 진행하지 않는다.**

| 결정 항목 | 규모 | 질문 |
|---|---:|---|
| `business-core` 샘플 도메인 (§2.5) | 3,106 LOC | 코어에 남길 것인가 / `business-app` 이관인가 / 삭제인가 (pending §1-B) |
| 미노출 API 4종 · 설문 껍데기 5라우트 | 미측정 | 구현할 것인가 삭제할 것인가 (pending §7 D-4·D-5) |
| `template/reusable-base` 채택 | — | 채택 시 §2.5 의 상당 부분이 브랜치 분리로 자동 해결 (pending §1-A) |

**예상 감축**: 3,100 LOC 이상 (결정에 전적으로 의존). **위험**: 결정에 따름.

---

## 4. 요약 — 단계별 기대치

| Phase | 내용 | 예상 감축 | 위험 | 선결 조건 |
|---|---|---:|:---:|---|
| 0 | 측정 고정 (`code-census.mjs`) | 0 | 없음 | — |
| 1 | 확정 사코드 10건 + 자명 주석 41건 | 400~600 | 낮음 | Phase 0 |
| 2 | 모듈 간 테스트 클론 + `permitAll` 부채 | ~450 | 중 | Phase 0 |
| 3 | `InstitutionCode` 수렴 + DTO record 80건 (**주목적: 불변화**) | 500~900 | 중~높음 | 계약 게이트 |
| 4 | FE 클라이언트 편중 + 거대 파일 7개 | 4,000~8,000 | **높음** | **CI 빌링 복구** |
| 5 | 샘플 도메인·미노출 API | 3,100+ | 결정 의존 | **사용자 결정** |
| | **합계** | **약 8,500~13,000 (6~9%)** | | |

> **왜 6~9% 인가**: 이 저장소는 이미 정리돼 있다. 주석처리 코드 8줄·TODO 2건·미사용 의존성 0건·
> 수동 getter 0건이 그 증거다. **"30% 감축" 같은 수치를 약속하는 계획은 이 저장소에서는 거짓이거나,
> 게이트·테스트·판단 근거를 지워서 만든 숫자다.** 실질 이득은 LOC 가 아니라
> **§1.3 의 세 지표(거대 파일·중복 윈도우·클라이언트 비중)** 에 있다.

---

## 4.5 실행 기록

### Phase 0 — 완료 (2026-08-05)
`scripts/code-census.mjs` 신설. 기준선 `.gemini/tasks/code-census-baseline.json` 저장.
**기준선**: BE main 631파일 39,927 · BE test 362파일 46,219 · FE 520파일 61,673 = **147,819 LOC** /
600줄 초과 FE 10·BE 1 / 클라이언트 비중 **65.2%** / 교차중복 FE 334·BE main 115·BE test 360.

> 이 스크립트가 §1.3 지표의 SSOT 다. 앞선 §1·§2 의 bash 실측치와 수치가 미세하게 다른 것은
> 계산 방식 차이(testFixtures 포함 여부·개행 계수) 때문이며, **이후 모든 델타는 이 스크립트 기준**으로 센다.

### Phase 1 — 완료 (2026-08-05) · 실측 **−393 LOC**

| 항목 | 계획 | 실제 | 사유 |
|---|---|---|---|
| 1-1 사코드 클래스 | 3건 | **3건 삭제** | `GenericMapper`(구현 0) · `FileErrorCode`(+ i18n 메시지 F001~F003 2개 로케일, `GlobalExceptionHandler` 가 code 를 messageSource 키로 쓰므로 함께 死) · `MenuDataInitializer`(`@Component` 주석처리 + 대상 테이블 `NMENUINFO`/`NPROGRMLIST` 부재 — 현행은 `tb_menu_info` + 외부 SQL 파일 미존재) |
| 1-2 死 Repository | 5건 (2건 보류 예정) | **5건 전부 삭제** | `MainImageDomainRepository` 는 死 도메인이 아니라 **중복 저장소**였다 — `MainImageRepository` 가 `findByRfltYn` 을 동일하게 갖고 `MainImageService` 가 그쪽을 쓴다. D-5 결정을 막지 않아 보류 불요 |
| 1-3 FE 사코드 | 2건 | **1건 삭제 · 1건 보류** | `project-modules.ts` 는 `797baa7e4 feat(framework): 재사용 프레임워크化` 산물로 `isRouteEnabled()` 가 [pending §1-A] 결정의 설계 자산이다 → **삭제 시 결정 선택지 소실**(§0.7-H2)이라 Phase 5 이관. `national-distribution-map.tsx` 는 `MOCK_MAP_DATA` 목업이라 삭제 |
| 1-4 `'use client'` | ~8건 | **3건 제거** | 17건 중 `error.tsx` 9 = Next 규약 필수, `dynamic({ssr:false})` 3 + `next-themes` 1 = 필수, `standard-chart-wrapper` 는 `useId`·`useChartColors` 사용(**초기 스캔 정규식이 놓쳤다**). 실익은 `HubSkeleton` 1건에만 있었다 — 임포터 10 중 **6이 서버 컴포넌트**라 클라이언트 번들에서 빠진다. `HubMetrics`·`BoardPreview` 는 실익 0 이나 지시어가 불필요해 함께 제거 |
| 1-5 자명 javadoc | 41건 | **17건 제거 · 32건 유지** | `@Schema(description=…)` 과 **문구가 일치하는 것만** 기계 판정으로 제거. 나머지 32건은 `dmndId`·`ocrnYmd` 같은 축약 필드의 **유일한 정보원**이라 유지. 유지분에는 `/** 그룹생성일시 (V2_19: group_crt_ymd → group_crt_dt 리네임 동기화) */` 같은 **마이그레이션 이력**이 포함돼 있었다 — 일괄 제거였다면 소실됐을 것이다(§0.7-H4 가 막은 사례) |
| 1-5 주석처리 코드 | 8줄 | **3줄 제거** | `DeptJobService` 죽은 import 2 + `OnlinePollParticipateClient` 1. `EgovFileScrty:115` 는 **vendored eGov 코드**라 제외(상류 대비 diff 노이즈). TS 4건은 응답 형태·경로 변경 사유를 적은 **"왜" 주석**이라 유지 |
| 1-5 TODO | 2건 | **0건 처리** | 1건은 `XXXX.pdf` 오탐, 1건(`standard-chart-wrapper` 명암비 3:1)은 **추적 중인 접근성 부채**라 유지 — 지우는 것은 부채 은폐다 |

**게이트 증적 (전부 그린)**
```
./gradlew compileJava compileTestJava   → BUILD SUCCESSFUL in 1m 51s
npx tsc --noEmit                        → exit 0
./gradlew :api-server:harnessTest       → BUILD SUCCESSFUL in 1m 50s  (린터 13종)
pnpm codegen:verify + :zod              → 드리프트 0 (API 계약 무변경)
pnpm run build (next build)             → exit 0 (RSC 경계 이상 없음)
```

**델타 (code-census --diff)**
```
BE main   631→623 파일 · 39,927→39,644 LOC
FE        520→519 파일 · 61,673→61,563 LOC
클라이언트 165→161 파일 · 40,202→39,626 LOC · 비중 65.2%→64.4%
합계      147,819→147,426 LOC  (−393)
```

> **부수 발견 — 이전 분석의 오보**: [project-safe-deletion-analysis.md §51-54](../../docs/04-operations/project-safe-deletion-analysis.md)
> 는 10건을 "이번에 삭제" 로 보고했으나 실측하면 **3건이 잔존**했다. 그중 `GenericMapper` 는 이번에 삭제했고,
> **`BoardMasterBatchDeleteRequest`·`BoardMasterBatchStatusRequest` 2건은 살아 있다** —
> `BoardMasterApiController:90·100` 에서 `@RequestBody` 로 쓰인다. 그 문서의 삭제 목록이 틀렸다.
> (같은 문서 §45 가 `MenuDataInitializer` 를 "false positive(활성)" 로 분류한 것도 오판이다 —
> `@Component` 가 주석처리돼 있어 Spring 이 빈으로 만들지 않으므로 `CommandLineRunner` 는 호출되지 않는다.)

### Phase 2 — 완료 (2026-08-05, 커밋 `798c25a72`) · 실측 **−936 LOC**

**계획이 과소 추정이었다(~450 → 실측 936).** 초기 스캔이 `src/test` 만 비교해
`src/testFixtures` 를 통째로 놓쳤기 때문이다 — 거기에 **18파일 604 LOC 가 FQN 까지 동일하게 복제**돼 있었다.

| 대상 | 처리 | 근거 |
|---|---|---|
| `business-app/src/testFixtures` 18파일 | **전량 삭제**, business-core 것을 재노출 | 18/18 바이트 동일. 게다가 api-server 가 **양쪽 testFixtures 를 동시에 의존**해 같은 FQN 클래스 18개가 클래스패스 순서로 서로를 가리고 있었다 |
| ArchUnit 3종 (110+114+53) | 규칙 본문만 testFixtures 로 승격, 모듈에는 `@AnalyzeClasses` + `ArchTests.in(...)` | **단순 이동은 vacuous 통과가 된다** — Gradle `test` 는 자기 모듈 산출물만 스캔하므로 공유 자산의 테스트는 어디서도 실행되지 않는다 |
| `TestQueryDslConfig` | **양쪽 삭제** | 두 모듈 모두 참조 0건 |
| `SchemaDumper` | **app 사본 삭제** | 차이 6줄이 전부 "정본/파생" javadoc. `testing-guide.md:501` 이 business-core 를 정본으로 명시 |
| `BusinessIntegrationTestSupport` | **core 사본 삭제** (방향 반대) | business-app 테스트 4건이 사용, business-core 0건 |

**동결 목록 갱신의 성격** — `TestSecurityConfig#chainBean` 등 2→1.
⚠ **위반이 상환된 것이 아니다.** `anyRequest().permitAll()` 은 business-core 사본에 그대로 살아 있다
(A-1 잔여② 미해소). 줄어든 것은 **중복**뿐이며, 부채는 1건으로 남아 계속 신호를 낸다.
사유를 린터 클래스와 매니페스트 양쪽에 남겼다(§0.7-H2).

> **게이트가 설계대로 작동한 사례 2건**
> ① `TestSecurityChainOverrideLinterTest` 가 사라진 스캔 루트를 만나 *"조용한 skip 은 false-green 입니다"* 로
>    하드 실패 → 그 red 가 갱신을 강제했다.
> ② `HarnessBaselineIntegrityTest`(메타 게이트)가 동결 목록 변경을 잡아 매니페스트 동시 갱신을 강제했다.

> **내가 저지른 실수 1건 (기록)**: 생성 파일 `baseline-manifest.actual.properties` 를 매니페스트에
> **통째로 복사해 자기 문서 헤더와 각 항목의 변경 이력 주석 168줄을 날렸다.**
> 이는 [wave2-carryover.md §5](../../docs/04-operations/wave2-carryover.md) 가 이미 기록한
> "하네스 매니페스트 헤더 소실" 결함의 **재발**이다(그 문서가 경고한 그대로 반복했다).
> 원본을 복원하고 2줄만 외과적으로 고쳤다. 매니페스트 헤더 자체가 §0.7-H2 가드레일의 본문이므로,
> **actual 파일 복사 시 데이터 라인만 가져올 것** — 이 지침은 매니페스트 헤더에도 이미 적혀 있었다.

**게이트 증적 (전부 그린)**
```
./gradlew compileJava compileTestJava        → BUILD SUCCESSFUL
./gradlew :api-server:harnessTest            → BUILD SUCCESSFUL (린터 13종 + 매니페스트 무결성)
./gradlew :business-core:test :business-app:test → BUILD SUCCESSFUL
   실행 1,097건 · 실패 0 · 스킵 2  (커버리지 무감축 확인)
ArchUnit 실행 건수: business-core 8 / business-app 8  — 통합 전과 동일
위반 주입 red(§0.7-H5): business-app 엔티티에 FetchType.EAGER 주입
   → business-app 만 associationsMustBeLazy FAILED, business-core green
   → 규칙 공유 후에도 모듈별 스캔 범위가 보존됨을 증명
```

**누적 델타 (Phase 0~2)**
```
BE main   631→623 파일 · 39,927→39,644 LOC
BE test   362→343 파일 · 46,219→45,283 LOC
FE        520→519 파일 · 61,673→61,563 LOC
합계      147,819→146,490 LOC  (−1,329)

§1.3 지표:  BE test 중복 윈도우 360→78 (−78%, 목표 −50% 초과 달성)
            중복 관련 파일 63→35
            FE 클라이언트 비중 65.2%→64.4%
```

> ⚠ **작업 중 사고 1건**: Phase 2 진행 중 다른 오퍼레이터가 `git reset --hard HEAD~1` 을 수행해
> **미커밋 상태이던 Phase 2 작업이 전량 소실**됐다(reflog: `reset: moving to HEAD~1`).
> Phase 0·1 은 커밋돼 있어 무사했다. 전량 재작업 후 **게이트 통과 직후 즉시 커밋**했다.
> 교훈: 공유 워킹트리에서는 검증 완료를 기다리지 말고 **게이트가 그린이 되는 즉시 커밋**할 것.

### Phase 3 — **분석 완료 · 실행 보류 (2026-08-05)**

코드 변경 없음. 실측 결과 **계획의 두 항목 모두 위험/이득 비가 나빠서** 착수하지 않았다.
아래는 그 판단 근거이며, 재개 시 이 실측부터 다시 확인할 것.

**3-A `InstitutionCode` 계열 수렴 — 기각**

`InstitutionCodeRecptnDto`(131줄)는 `InstitutionCodeDto`(104줄)의 **엄격한 상위집합**이다
(공통 22필드 + 추가 7필드: `ocrnYmd`·`jobSn`·`chgSeCd`·`procSe`·`etcCd`·`crtDt`·`frstRgtrId`).
상속으로 ~90줄을 줄일 수 있으나 **기각한다**:

1. **헌법이 이 실패 양식을 이미 규정한다.** [BE 헌법 제5조 3항](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)은
   "Lombok `@SuperBuilder` 상속 필드 섀도잉 — **빌드는 성공하나 런타임에 값이 유실되는 결함**"을 명시 차단한다.
   두 DTO 모두 `@Builder` 를 갖고 있어 상속 시 부모 필드가 빌더에서 조용히 유실된다.
2. **저장소에 DTO 상속 선례 0건.** 도입은 새 패턴이며 계약 레이어에 상속을 들이는 결정이다.
3. **springdoc 스키마 형태가 바뀔 수 있다** → `generated-api.d.ts` 드리프트.
4. `etcCd` 는 [pending §3-E](../../docs/04-operations/pending-decisions.md) 의 **미결 항목**(원천 스펙 미확정)이다.

> 얻는 것 ~90줄, 거는 것 런타임 값 유실 + 계약 드리프트 + 새 패턴 도입. **나쁜 거래다.**
> 엔티티 쌍(`InstitutionCode` 153 / `InstitutionCodeRecptnLog` 173)은 물리 테이블이 다르므로
> (`tb_inst_cd` / `tb_inst_cd_rcptn_log`) 애초에 수렴 대상이 아니다.

**3-B DTO record 전환 — 1차 배치 11건 준비 완료, 미적용**

| 실측 | 값 |
|---|---:|
| `@Setter` 없는 DTO (1차 배치 후보) | **11건** (계획의 "16건" 은 개산이었다) |
| 그 11건의 총 LOC | 316 |
| **11건의 getter 호출부** | ~~**0개소**~~ → **정정: 합계 561개소**(상한치) — 아래 참조 |
| 하네스 린터 결속 | `UserSignupRequest` 1건만 (`SignupContractLinterTest`) → **배치에서 제외** |

> ### ⚠ 측정 오류 정정 (2026-08-05) — "getter 호출부 0개소" 는 **틀렸다**
>
> 초기 측정 스크립트가 필드명 추출에 실패해 **11건 전부 0** 을 냈다.
> **11/11 이 0 이라는 것 자체가 이상 신호였는데 검증하지 않았다.**
> 그 잘못된 수치가 "비용 0 의 깨끗한 전환" 이라는 결론을 만들었고, 그 결론을 근거로 4건을
> 실제로 전환했다가 **컴파일러가 사실을 확정했다** — `LoginRequest` 하나만으로도
> `AuthServiceImpl` 에 getter 호출이 5개소(42·45×2·50·56·64행) 있었다. 전환분은 되돌렸다.
>
> **참값 (필드명을 awk 로 확실히 추출해 재측정)**
>
> | DTO | getter 호출 | DTO | getter 호출 |
> |---|---:|---|---:|
> | `TemplateDto` | 195 | `FileDto` | 54 |
> | `CodeDto` | 128 | `TokenResponse` | 34 |
> | `LoginRequest` | 103 | `MenuUIContext` | 18 |
> | `LogDto` | 14 | `StatsDto` | 8 |
> | `BoardStatsResponse` | 5 | `PasswordChangeRequest` | 2 |
> | `SummaryStatsDto` | 0 | **합계** | **561** |
>
> (`getUserId()`·`getUseYn()` 처럼 여러 타입이 공유하는 이름 때문에 **과대 계상된 상한치**다.
> 정확한 수는 수신자 타입까지 봐야 하지만, 방향은 바뀌지 않는다 — 0 이 아니라 수백이다.)

**결론: 이 11건은 전환하지 않는다.**
- 이 11건은 **이미 불변**이다(`@Setter` 없음, 다수 `private final`). 얻는 것은 **LOC 316 뿐**이고
  §2.4 가 이 Phase 의 정당화 근거로 삼은 **'불변화' 이득은 0** 이다.
- 비용은 `getX()` → `x()` 개명인데, `getUserId()`·`getUseYn()` 같은 **공용 이름의 수신자를
  건별로 가려내야** 한다. 이것이 정확히 §0.7-H4 가 금지하는 sweep 이며, 그 경로에
  `AuthServiceImpl` 같은 보안 핵심 코드가 들어 있다.
- **LOC 316 을 위해 인증 경로 수백 개소를 건드리는 것은 나쁜 거래다.**

**재개 시 — 이 Phase 의 진짜 목표는 따로 있다**

`@Setter` 보유 **64건의 불변화**다. 여기가 §2.4 가 말한 실익이며(DTO 가 계층 통과 중
임의 변조 가능한 상태), 그 작업은 LOC 가 아니라 **정확성**을 근거로 정당화된다.
착수 시 `setXxx(` 호출 565개소 중 대상 DTO 를 가리키는 것을 **건별 실측**할 것 —
그리고 **이번처럼 측정 스크립트의 0 을 믿지 말 것.** 균일한 0 은 결과가 아니라 고장 신호다.

---

## 5. 착수 시 준수 사항 (체크리스트)

- [ ] 각 Phase 착수 전 해당 헌법 조항 직접 조회 (BE 3·8·16조 / FE 3·6조 / DB 2조)
- [ ] 삭제는 **건별 근거 기록** — "참조 0건" 만으로는 사유가 되지 않는다(Spring 배선·리플렉션·설정 문자열 배제 필요)
- [ ] 예외·동결 목록(`GRANDFATHERED`·`EXCLUDED_*`) **편집 금지** (§0.7-H2)
- [ ] 일괄 sweep 금지 — N개소 변경 시 각 호출부의 동일성 선(先)증명 (§0.7-H4)
- [ ] 게이트 신설·수정 시 **위반 주입 red 확인**까지 수행 (§0.7-H5)
- [ ] 커밋은 `git commit --only -- <경로>` (공유 워킹트리 규율)
- [ ] Phase 종료마다 `code-census.mjs` 델타를 이 문서에 추기

---

## 부록 — 실측 재현 명령

```bash
# LOC (모듈별)
find business-core/src/main -name "*.java" -exec cat {} + | wc -l

# 주석 비율
find <path> -name "*.java" -exec cat {} + | grep -cE '^\s*(//|/\*|\*|\*/)'

# 참조 0건 클래스 (위양성 필터 필수 — 본문 §2.1 참조)
grep -rlw "<ClassName>" --include=*.java <modules> | grep -v "<self>"

# 중복 윈도우 (정규화 8줄 해시)
node scripts/code-census.mjs   # Phase 0 산출물
```

*Last Updated: 2026-08-05 (신규 수립 — 전 소스 실측 기반)*
