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

- **이번 조치(완료)**: git 추적 제거(`git rm --cached`) + `.gitignore`에 `*.key`/`*.pem` 추가.
- **남은 필수 조치(승인 필요·파괴적)**: ① **키 로테이션**(이미 노출 — `docs/04-operations/crypto-key-rotation.md` 절차 연계), ② **git 히스토리 purge**(`git filter-repo`/BFG + force-push — 이미 origin에 존재), ③ 물리 파일 삭제(현재 로컬 permission-denied로 잔존, gitignore돼 재커밋은 방지됨).

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

---

## 3. 최상위 폴더/파일

| 항목 | 상태 | 조치 |
|---|---|---|
| `check-db-standard.js`·`refactor-db-standard.js`·`implementation_plan.md` | 추적됨·참조 0·2026-06 DB표준화 일회성 산출물 | **이번에 삭제** |
| `ssh-key-2026-01-18.key` | 개인키 | §1 참조(추적제거·gitignore 완료) |
| `replay_pid19132.log` | **미추적** | JVM 크래시 로그 — 로컬 `rm`(리포지토리 무관) |
| `db_columns.json` | 추적됨·참조 0 | **보류**(참조 데이터 가능성 — 용도 확인 후) |
| `bin·build·database·graphify-out·logs·storage·test-results·test-uploads` | **0 tracked** | 빌드/런타임 산출물 — gitignore, 리포지토리 무관 |
| `.agent`(4.2M)·`.gemini`(796K) | 추적됨 | 헌법·스킬·태스크 = **운영 SSOT, 삭제 금지** |

---

## 4. 프론트엔드 (앞선 분석 요약)

- **안전삭제 컴포넌트 4개**(`command-menu`·`api-error-notifier`·`spinner`·`status-dot`) — **삭제·커밋 완료**(`5b06e4402`).
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
*스냅샷(2026-07-11). 삭제 착수 전 현재 코드/메뉴 재조회. 분석기: scratchpad `deadcode-analyzer.js`(FE)·`java-deadcode.js`(BE). 메모리: `egov-unused-file-detection-pitfall`.*
