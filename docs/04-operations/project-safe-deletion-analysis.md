# 프로젝트 전체 안전 삭제 분석 리포트 (Project-wide Dead-Code / Cruft Analysis)

> **작성 일자**: 2026-07-11 (Claude Code) · **범위**: 전 프로젝트 (frontend 500 파일 · backend 916 Java · 최상위 폴더/파일)
> **배경**: "더 이상 사용하지 않거나 불필요한, 삭제해도 영향 없는 파일/폴더" 식별 요청. 앞서 Gemini가 import 기반 판정으로 **활성 라우트 13개를 오삭제(런타임 404)** → 복원한 사고를 계기로, **자산 종류별 프레임워크-인지 방법론**으로 재분석했다.
> **핵심 원칙**: `tsc`·`compileJava`·`next build`는 **문자열 참조/프레임워크 배선을 검사하지 않는다**. 자동 "미사용" 판정은 프레임워크 코드에서 반드시 오판한다.

---

## 0. 방법론 — 자산 종류별 판정 기준 (하나의 기준으로는 오판)

| 자산 | "사용됨" 기준 | 자동판정 신뢰도 |
|---|---|---|
| FE 컴포넌트/유틸/훅/타입 | import 참조 | **높음** (0-import=死) |
| **FE 라우트 `page.tsx`** | 문자열 URL(`router.push`·`<Link>`·redirect)·**DB 메뉴 `modernRoute`**·동적구성·탭·직접URL | **낮음** — 개별 런타임 필요 |
| **BE Spring 빈** (@Service/@Component) | import + DI 주입 | 중 |
| **BE `*RepositoryImpl`** | **Spring Data 프래그먼트 규약**(`Impl` 접미사 자동배선) | **낮음** — 참조 0이어도 활성 |
| **BE @RestController/@Controller** | HTTP 매핑 | 낮음 — 참조 0이어도 활성 |
| **BE CommandLineRunner/@Scheduled/@EventListener/Filter** | 프레임워크 호출 | 낮음 |
| **BE @Entity** | JPA 리플렉션 | 낮음 |
| BE Config(@Configuration/@Bean) | Spring 로드 | 중 |
| BE DTO/Event/VO/순수 POJO | 코드 타입 참조 | **높음** (0-ref=死, Jackson도 타입참조 필요) |
| 테스트/스토리/목 | 러너 glob | 러너가 소비 |
| 생성 산출물(`generated-*`) | codegen/ambient | 삭제 금지 |

---

## 1. 🔴 최우선 — 보안 (미사용 이전의 문제)

**`ssh-key-2026-01-18.key`** — RSA 개인키(`-----BEGIN RSA PRIVATE KEY-----`)가 리포지토리에 **커밋·푸시**되어 있었다. 이는 시크릿 유출이다.

- **1차 조치(완료)**: git 추적 제거(`git rm --cached`) + `.gitignore`에 `*.key`/`*.pem` 추가.
- **✅ 히스토리 purge 완료 (2026-07-26, 사용자 승인)**: `git filter-repo --invert-paths --path ssh-key-2026-01-18.key` 를 미러 클론에서 수행하고 `main`·`template/reusable-base` 를 force-push. **원격 재클론 검증**: 키 파일 이력 0건 · 커밋 `11366ca48` 부재 · `main` 트리 해시 재작성 전과 동일(내용 무손실). 당시 상세 작업 저널은 2026-08-19 정리됐으며, 이 문서와 Git 이력을 영구 근거로 삼는다.
- **🔴 남은 필수 조치 — 키 로테이션(미완, 사용자만 가능)**: 히스토리 제거는 노출을 **되돌리지 못한다.** ① 저장소가 2026-07-26 **퍼블릭으로 전환**돼 그 사이 크롤링 가능성, ② GitHub 은 force-push 후에도 dangling 객체를 일정 기간 제공(Support 캐시 purge 요청 필요), ③ 포크·기존 클론 존재 가능성. 따라서 **해당 공개키를 `authorized_keys` 에서 제거한 서버 전수 확인 + 신규 키페어 발급 + 접속 로그 점검**이 반드시 선행돼야 한다(`docs/04-operations/crypto-key-rotation.md` 절차 연계). 파급 범위 실측: 저장소 내 사용처 **0건**(문서 언급뿐) → 외부 서버 접속용으로 추정.
- **재발 방지**: `.githooks/pre-commit` 의 gitleaks 스캔은 **gitleaks 가 설치된 환경에서만** 동작한다(미설치 시 무해 통과). 퍼블릭 저장소이므로 GitHub **Secret scanning + Push protection**(무료) 활성화를 함께 권장.

---

## 2. 백엔드 (916 Java) — 결과

**"참조 0" 후보 대부분이 프레임워크 배선 false positive였다:**

| false positive (활성) | 근거 |
|---|---|
| `*RepositoryImpl` ~22개 | Spring Data 프래그먼트 규약(`UserRepositoryImpl implements UserRepositoryCustom`, `UserRepository extends …Custom` 확인) |
| `MenuDataInitializer` | `implements CommandLineRunner`(기동 호출) |
| `MdcLoggingFilter` | @Component 서블릿 필터 자동등록 |
| Config 17·Controller/Advice 2 | @Bean 로드 / HTTP 엔드포인트 |
| Repository 인터페이스 7 | Spring Data 빈 생성(기능 死 여부는 별도) |
| `package-info.java`·testFixtures | 특수/테스트 |

**진짜 死코드(전 모듈 0-참조 확정) — 이번에 삭제:**
- Event 2: `CommentCreatedEvent`·`CommentDeletedEvent` (publish/subscribe 0)
- DTO 6: `BoardMasterBatchDeleteRequest`·`BoardMasterBatchStatusRequest`·`CommentSaveRequest`·`CommunityUserDto`·`StatsVO`·`SurveyResultDto`
- base 2: `GenericMapper`·`QuerydslSupport` (extends/구현 0, XML 참조 0)
- **검증**: `./gradlew compileJava compileTestJava` → **BUILD SUCCESSFUL**

> ### ⚠ 위 목록 정정 (2026-08-05 실측) — 10건 중 3건은 삭제되지 않았다
>
> 파일 실재 여부를 전수 확인한 결과 위 "이번에 삭제" 목록과 코드가 어긋난다.
> **체크박스와 코드가 갈릴 때 진실은 코드 쪽이다.**
>
> | 항목 | 실측 | 조치 |
> |---|---|---|
> | `GenericMapper` | **잔존해 있었다** | 2026-08-05 실제 삭제(PR #287) |
> | `BoardMasterBatchDeleteRequest` | **잔존 · 살아 있는 코드** | **삭제 금지** |
> | `BoardMasterBatchStatusRequest` | **잔존 · 살아 있는 코드** | **삭제 금지** |
> | 나머지 7건 | 삭제 확인됨 | — |
>
> `BoardMasterBatch*Request` 2건은 [BoardMasterApiController:90·100](../../api-server/src/main/java/nuri/api/controller/business/admin/content/board/BoardMasterApiController.java#L90)
> 이 `@Valid @RequestBody` 로 사용하며 `api-docs.json`·`generated-api.d.ts`·`generated-zod.ts` 에도
> 스키마가 실재한다. **이 목록을 근거로 삭제하면 API 가 깨진다.**
>
> 아울러 §45 의 "false positive(활성)" 판정 중 `MenuDataInitializer` 는 **오판**이다 —
> 근거로 든 `implements CommandLineRunner` 는 그 클래스가 **Spring 빈일 때만** 의미가 있는데
> `@Component` 가 주석 처리돼 있어 컨테이너가 생성하지 않는다. 대상 테이블(`NMENUINFO`/`NPROGRMLIST`)도
> 현행 스키마에 없고, 읽으려는 `egovframe-template-common-components-5.0.0/` 디렉터리도 저장소에 없다.
> 2026-08-05 에 삭제했다(PR #287).

---

## 3. 최상위 폴더/파일

| 항목 | 상태 | 조치 |
|---|---|---|
| `check-db-standard.js`·`refactor-db-standard.js`·`implementation_plan.md` | 추적됨·참조 0·2026-06 DB표준화 일회성 산출물 | **이번에 삭제** |
| `ssh-key-2026-01-18.key` | 개인키 | §1 참조(추적제거·gitignore 완료) |
| `replay_pid19132.log` | **미추적** | JVM 크래시 로그 — 로컬 `rm`(리포지토리 무관) |
| `db_columns.json` | 추적됨 | ✅ **보류 해소(2026-07-29) — 삭제 금지**. `migration-tool` 의 `MappingValidator` 가 `@Value("${migration.db-columns-path:db_columns.json}")` 로 **실소비**한다(타깃 컬럼 실재 검증). 2026-07-11 시점의 "참조 0" 은 소비처가 나중에 생겼기 때문. |
| `bin·build·database·graphify-out·logs·storage·test-results·test-uploads` | **0 tracked** | 빌드/런타임 산출물 — gitignore, 리포지토리 무관 |
| `.agent`(4.2M)·`.gemini`(796K) | 추적됨 | 헌법·스킬·태스크 = **운영 SSOT, 삭제 금지** |

---

## 4. 프론트엔드 (앞선 분석 요약)

- **안전삭제 컴포넌트 4개**(`command-menu`·`api-error-notifier`·`spinner`·`status-dot`) — 삭제·커밋(`5b06e4402`, 현 계보에서는 `ce699c92f`).
  - 🚨 **2026-07-29 정정 — 이 "완료" 는 절반이 거짓이었다.** `command-menu.tsx`·`api-error-notifier.tsx` 2개가 **HEAD 에 되살아나 있었다**. 원인은 2026-07-16 pull-sync 사고(옛 계보 1141커밋 머지 유입, 메모리 `egov-pull-sync-incident-2026-07-16`)로, 삭제 커밋 `5b06e4402` 는 **현재 HEAD 의 조상이 아니다**(`git merge-base --is-ancestor` → false). 부활 후 브랜딩 토큰화 sweep(`73aecdf3a`)이 死파일을 무의미하게 수정해 왔다. 2026-07-29 재삭제.
  - **교훈**: 삭제 완료를 문서에 기록할 때 커밋 해시만 남기면 부족하다. **해당 해시가 현 계보의 조상인지**와 **파일이 실제로 부재하는지**를 재확인해야 한다(계보 이탈 시 "완료" 기록이 그대로 거짓이 된다).
- **라우트 死후보 21개** — 자동판정 불가(탭 대체·orphaned-but-functional·직접URL). **개별 런타임 검증 필요**, 미착수. 예: `/admin/observability`는 링크 0이나 URL로 정상 동작.
- `generated-api.d.ts` — codegen 산출물, 삭제 제외.

---

## 5. 이번 세션 삭제 요약 (검증 완료)

| 대상 | 수 | 게이트 |
|---|---|---|
| 백엔드 死 DTO/Event/base | 10 | `compileJava compileTestJava` BUILD SUCCESSFUL |
| 루트 stale 일회성 산출물 | 3 | — |
| SSH 개인키(추적 제거) | 1 | + `.gitignore *.key` |
| (앞선) 프론트 死 컴포넌트 | 4 | `tsc` + `next build` 125/125 (`5b06e4402`) |

---

## 6. 권고 — 프로젝트 삭제 프로토콜

1. **자동 "미사용" 판정을 라우트·Spring 빈에 적용 금지.** import/컴파일만으로는 문자열 URL·DI·규약·리플렉션 배선을 못 본다.
2. **자산별 검증**: FE 컴포넌트=import 그래프 / FE 라우트=문자열URL+DB메뉴+런타임 / BE=어노테이션 분류(Controller·Runner·RepositoryImpl 규약 제외) / DTO·POJO=타입참조.
3. **소규모 배치 + 게이트**: 삭제 후 `tsc`+`next build`(페이지수 확인) / `compileJava compileTestJava`. 라우트는 추가로 런타임·잔존내비 재-grep.
4. **시크릿은 삭제가 아니라 로테이션+히스토리 purge.**

---

## 7. 2차 전수조사 (2026-07-29, Claude Code) — 328 파일 삭제

§0 방법론을 승계하되, 자동 스캔 결과 7건을 **전부 개별 검증**했다(위양성 2건 검출).

### 7.1 삭제 실행

| 구분 | 대상 | 수 | 근거 |
|---|---|---:|---|
| T1 | 로컬 미추적 잡파일 — `tsconfig.tsbuildinfo`·a11y 스캔 산출물 3·일회성 mjs 3·`playwright/.auth/*` 2 | 9 | `.gitignore:229-234` 가 이미 제외를 선언한 2026-07-25~26 세션 산출물. git 무관 |
| T2 | 부활 死코드 `command-menu.tsx`·`api-error-notifier.tsx` | 2 | §4 참조 — pull-sync 사고로 되살아남, import 0 |
| T3 | `.nyc_output/*.json` 24 · `scratch/` 5 · `artifacts/` 4 · `tools/restore_v2.js` · `restore-non-session-files.ps1` · `com.css_old.jsp` · `CommentEvent.java` | 33 | 전부 참조 0. `CommentEvent` 는 하위클래스 2종(`CommentCreatedEvent`·`CommentDeletedEvent`)이 §2 에서 삭제되며 **고아가 된 abstract 부모** |
| T4 | `api-server/src/main/webapp/**` (레거시 eGovFrame JSP 웹앱) | 289 | 아래 §7.2 |
| | **합계** | **328** | |

### 7.2 T4 — 레거시 webapp 폐기 근거 (war 패키징 대상이라 별도 실증)

삭제 전 5가지를 실측했다. 어느 하나라도 반증되면 보류할 사안이었다.

1. `WEB-INF/jsp/` 뷰 파일 **0개** → `InternalResourceViewResolver` 가 해석할 대상이 없다.
2. **jasper/JSTL 의존성 0** (`build.gradle`·`libs.versions.toml` 전수) → `index.jsp` 가 요구하는 `jakarta.tags.core` 태그라이브러리가 없어 **JSP 렌더링이 원리적으로 불가**.
3. 뷰 반환형 `@Controller` **0개** (`@ControllerAdvice` 1개뿐) → 뷰 이름을 반환하는 경로 자체가 없다.
4. `WebMvcConfig.addResourceHandlers` 는 `/css/**`·`/js/**`·`/images/**` 를 **`classpath:/static/`** 에 매핑한다(webapp 아님). 실제 정적자산은 `favicon.ico` 1개뿐.
5. webapp **외부**에서 webapp 경로·자산을 참조하는 코드 **0건**.
6. 반면 `bootWar` 산출물에는 **269개 엔트리로 실제 패키징**되고 있었다(2.77MB 死중량).

**남은 배선(이번 범위 밖 — 별도 판단 필요)**: `WebMvcConfig` 의 JSP 뷰 리졸버, `ApiSecurityConfig:202` 의 `/index.jsp` permit, `application-dev.yml`/`application-e2e.yml` 의 `prefix: /WEB-INF/jsp/`. 모두 **해석 대상이 없어 무해**하나 stale 이다. 보안 설정 변경은 독립 리뷰가 필요하므로 파일 삭제와 분리했다.

### 7.3 위양성 — 스캔이 死로 판정했으나 활성 (§0 방법론이 예측한 함정)

| 파일 | 실제 배선 |
|---|---|
| ~~`frontend/src/i18n/request.ts`~~ | 당시에는 next-intl 규약 배선이라 위양성이었다. **2026-08-15 ADR-0002로 한국어 UI를 확정한 뒤 플러그인과 함께 의도적으로 제거** |
| `frontend/src/config/project-modules.ts` | 재사용 base **매니페스트 SSOT**. `reusable-base-guide.md:108`·`getting-started.md:111` 이 계약으로 규정 |

### 7.4 삭제 보류 (0-참조이나 의도적 보존)

- `national-distribution-map.tsx` — `AdminStatsClient.tsx:191-197` 이 "지역 통계 집계 API 가 생기면 **재도입할 것**" 이라고 명시하며 카드만 제거한 상태.
- `TableSkeleton.tsx` — 현재 0-import 이나 재사용 프리미티브. 2026-07-22 감사 권고는 "삭제" 가 아니라 "`<TableBody>` 내부 전용임을 JSDoc 에 명시".
- FE 라우트 死후보 21개 — §4 그대로. **런타임 검증 없이 판정 금지**.

### 7.5 게이트 증적

| 게이트 | 결과 |
|---|---|
| `npx tsc --noEmit` (frontend) | exit 0 |
| `./gradlew compileJava compileTestJava` | **BUILD SUCCESSFUL** in 34s — `business-core:compileJava`·`business-app:compileJava` 실제 실행(UP-TO-DATE 스킵 아님) |
| `./gradlew :api-server:harnessTest` (헌법·표준 린터 13종, pre-push 기계강제) | **BUILD SUCCESSFUL** in 2m 26s |

---
*스냅샷(2026-07-11) + 2차 전수조사(2026-07-29). 삭제 착수 전 현재 코드/메뉴 재조회. 분석기: scratchpad `deadcode-analyzer.js`(FE)·`java-deadcode.js`(BE)·`deadscan.js`(2차). 메모리: `egov-unused-file-detection-pitfall`.*
