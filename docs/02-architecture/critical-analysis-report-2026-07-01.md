# eGov Enterprise — 비판적 분석 최종 보고서

> **작성일**: 2026-07-01
> **범위**: 프로젝트 전반(backend / frontend / database / tests / security / build-ci / repo-hygiene) + 에이전트 하네스/거버넌스(GEMINI.md, .agent, .gemini)
> **방법**: 47개 분석·적대적 검증 에이전트 × 10개 도메인 실제 소스 정독 + 직접 교차검증. 모든 항목은 `file:line` 증거 기반이며, 검증에서 기각·강등된 항목은 제외.
> **상태 표기**: 🔴 Critical / 🟠 High / 🟡 Medium. "✅ 완료"는 2026-07-01 세션에서 처리된 항목.
> **원천 데이터**: 전체 구조화 결과(검증/기각 내역 포함)는 워크플로 산출물 `tasks/wzl3fn042.output` 참조.

---

## 0. 총평 (Executive Verdict)

기능은 풍부하지만, **미조치 상태의 악용 가능한 보안 결함**과 **"광고된 엄격함 ≫ 실제 집행되는 엄격함" 격차**가 이 프로젝트의 결정적 부채다. 가장 치명적인 현실은 **커밋된 시크릿**이다 — 라이브 RSA 개인키(이번 세션에 제거 완료), 공인 IP의 OCI 운영 Postgres에 `egov123` 하드코딩, `globals.properties`의 Supabase 운영 비번, fail-open 기본값을 가진 대칭 JWT HMAC 서명키. 이들은 **임의 계정 토큰 위조 + 저장소 읽기 권한자에 의한 직접 DB 접근**을 허용한다.

앱 표면에서는 **프론트 admin 게이트가 위조 가능한 클라이언트 쿠키(`userRole`)에 의존**하고, JWT를 localStorage+비-httpOnly 쿠키에 저장하며, 백엔드는 **비밀번호 해시를 API 응답과 로그(INFO)로 유출**한다. 자랑하는 품질 게이트(뮤테이션 85%, 커버리지 50%)는 **사실상 비활성**이다.

진짜 엔지니어링 강점(실집행 ArchUnit, 쿼리카운트 N+1 가드, 비관적 락 동시성 테스트, 진짜 Zod SSOT, Testcontainers)도 분명히 존재한다 — 다만 그것들이 위 결함에 의해 가려져 있다.

**결론: 다른 무엇보다 크리덴셜 로테이션이 stop-the-line 우선순위다.** 나머지는 고칠 수 있으나, "문서가 약속한 규율"과 "코드가 강제하는 규율"의 간극을 메우는 것이 핵심 과제다.

---

## 1. 하네스/거버넌스 분석

**평결: 두꺼운 prose 거버넌스 + 얇지만 진짜인 집행 코어의 하이브리드. "순수 theater"는 과장이지만, 간판 게이트와 Claude 이식성은 실제 결함.**

### ✅ 진짜로 기계 집행되는 것 (이게 모델이 되어야 함)
- ArchUnit 규칙이 CI `gradlew ... check`에서 **빌드 실패로 강제** — 컨트롤러의 `@Entity` 의존 금지(헌법 3조), `@ManyToOne/@OneToOne` LAZY 강제(N+1 방어, 14조), 레이어링·순환참조 금지
- `checkstyle` `ignoreFailures=false`, `QueryCountGuardrail`(`@QueryCountGuard(max=15)`), 프론트 `codegen:verify`(OpenAPI drift를 `git diff --exit-code`로 차단), `ZeroDowntimeMigrationLinter`

### ❌ 가장 시끄럽게 광고하지만 inert한 것
- **뮤테이션 85% 게이트**: `build.gradle:184` `mutationThreshold = STRICT_MUTATION=='true' ? 85 : 0` — `STRICT_MUTATION`은 어디에도 설정 안 됨, pitest는 **어떤 CI에서도 호출 안 됨** → 항상 0
- **루트 50% 커버리지 게이트**: `jacocoRootCoverageVerification` 등록만 되고 **CI/Makefile 어디서도 호출 안 됨**. foundation(60%)만 실집행
- 숫자조차 불일치: 헌법 80% vs build.gradle/docs/skill 85%

### 🔴 Claude 이식성 갭 (운영상 중요)
- **`CLAUDE.md` 없음, `.claude/settings.json` 없음** (.gitignore는 존재하지도 않는 settings.json을 화이트리스트). 모든 거버넌스(L0/L1/L2 등급, 3대 헌법, Ralph Loop, **GEMINI.md §7 파괴적 DB 작업 승인 경계**, guardian 스킬)가 GEMINI.md/.agent에만 존재 → **Claude가 운전하면 전부 dark**
- 특히 **파괴적 `db-bridge.js`(임의 SQL 실행)** 가 바로 옆에 있는데, 파괴적 DB 승인 경계가 Claude에선 작동 안 함 → **2026-07-01 세션에서 실제로 드러난 갭**(외부 Gemini 에이전트와 동시 편집 충돌 위험을 수동 차단해야 했음)

**권고**: GEMINI.md+헌법을 import하는 `CLAUDE.md`와, 파괴적 DB/마이그레이션 명령에 대한 **deny 규칙을 담은 `.claude/settings.json`**을 추가해 에이전트 교체에도 안전 경계가 살아남게 한다. 33개 SKILL.md 중 강제 불가한 prose는 "advisory"로 명시 재라벨링.

---

## 2. 우선순위 리스크 (검증된 것만, 심각도순)

| # | 심각도 | 리스크 | 증거 | 상태 |
|---|---|---|---|---|
| 1 | 🔴 Critical | RSA 개인키 커밋 | `ssh-key-2026-01-18.key` (2048-bit, no passphrase) | **히스토리 제거+GitHub 반영 완료 ✅ / 로테이션 미완 🔴** |
| 2 | 🔴 Critical | OCI DB(`egov123`)·Supabase 비번·JWT 시크릿 평문 커밋 | `application.yml:37,83`, `globals.properties:24-25`, `application-e2e.yml:34` | 미조치 |
| 3 | 🔴 Critical | 프론트 admin 게이트가 위조 가능한 `userRole` 쿠키에 의존 | `frontend/src/middleware.ts:12,26` + `frontend/src/contexts/AuthContext.tsx:82` (클라가 `document.cookie`로 작성, JWT 미검증) | 미조치 |
| 4 | 🔴 Critical | JWT를 localStorage + 비-httpOnly 쿠키 저장 (XSS=계정탈취) | `frontend/src/contexts/AuthContext.tsx:77,80`, CSP `unsafe-inline/eval` | 미조치 |
| 5 | 🟠 High | 비밀번호 해시가 API 응답으로 유출 | `UserDto.java:34` (`pswd` `@JsonIgnore` 없음) → `UserApiController.java:43,102` | 미조치 |
| 6 | 🟠 High | Auth provider가 비번 해시를 INFO 로그로 출력(파일/Loki) | `EgovAuthenticationProvider.java:57,63-70` | 미조치 |
| 7 | 🟠 High | JWT 서명키 fail-open 기본값 | `application.yml:83` `${JWT_SECRET:4s3...}`, prod에 jwt블록 없어 상속 | 미조치 |
| 8 | 🟠 High | WebSocket CORS 와일드카드 | `WebSocketConfig.java:39` `setAllowedOriginPatterns("*")` | 미조치 |
| 9 | 🟠 High | CI 보안 게이트가 `continue-on-error` → CVE가 green으로 통과 | `ci.yml:84-86`(OWASP), `:142-145`(npm audit); .snyk 정책은 step 부재 | 미조치 |
| 10 | 🟠 High | 뮤테이션/커버리지 게이트가 절대 실패·실행 안 됨 | `build.gradle:184,233` (§1 참조) | 미조치 |
| 11 | 🟠 High | Soft-delete AOP가 트랜잭션 **밖**에 정렬 → 삭제행 노출 가능 | `SoftDeleteAspect.java:19` `@Order(20)`, 읽기경로에 `use_yn` 방어 술어 없음, 20개 중 2개 엔티티만 `@Filter` | 미조치 |
| 12 | 🟠 High | Flyway 마이그레이션 비자족적 → 신규환경/DR 불가 | CREATE TABLE 2개뿐, V1.6~1.10은 없는 테이블 ALTER, 스키마는 out-of-band 덤프 의존 | 미조치(완화: 전 프로파일 `ddl-auto:none`) |
| 13 | 🟠 High | DB 네이밍 SSOT가 문서뿐, 자동 집행 없음 | `meta_standard_*` 조회 소스 0개, `check-db-standard.js` 고아, `db_columns.json` 미참조 | 미조치 |
| 14 | 🟠 High | README 13개 문서 링크 전부 404 + 아키 문서가 없는 패키지(`nuri.server/suite`) 인용 | `README.md`, `docs/02-architecture/backend-architecture.md` (실제: `nuri.api/nuri.business`) | 미조치 |

---

## 3. 차원별 한 줄 평가

| 도메인 | 평가 |
|---|---|
| **backend-core** | 견실한 트랜잭션/예외/LAZY 규율 ↔ 비번해시 유출 + soft-delete 정렬 결함 |
| **backend-api** | 합리적 JWT 플러밍·BCrypt 마이그레이션 ↔ 커밋 시크릿 + CI가 actuator를 미인증 호출(규칙 모순) |
| **frontend** | 진짜 Zod SSOT·강한 보안헤더 ↔ **불안전한 auth 모델 2건(critical)** 이 망침 |
| **database** | 거버넌스가 대체로 희망사항 — 크리덴셜 유출·비자족 마이그레이션·미집행 네이밍 |
| **tests** | 크고 부분적으로 고품질(ArchUnit/동시성/쿼리가드) ↔ 중량 게이트는 theater |
| **security** | **영향 기준 최악 차원** — 다수의 상시 악용 가능 시크릿 노출 |
| **build-ci** | 기능 풍부 ↔ 커밋 키·비게이팅 보안스캔·계약 스텝 |
| **repo-hygiene** | RSA 키가 지배 + `foundation/src/main/java/graphify-out/cache`에 캐시 JSON 345개(4.1MB) 소스루트 오염 + 레거시 eGov webapp 243개 |
| **harness** | 두꺼운 prose + 얇은 집행코어; 간판 게이트·Claude 이식성이 실제 갭 |
| **docs** | 광범위 drift — 정문 README와 자칭 백엔드 SSOT 둘 다 없는 것 참조 |

---

## 4. 검증된 강점 (공정성)

theater가 아닌 진짜 자산들:

- **실집행 ArchUnit** (controller→`@Entity` 금지, LAZY 강제, 레이어링), `QueryCountGuardrail`, `BoardConcurrencyTest`(100스레드 비관적 락 검증), `ZeroDowntimeMigrationLinter`
- **진짜 Zod SSOT**: `generated-zod.ts`(자동생성, 수정금지 헤더) → `schemas.ts`가 import·확장. 강한 보안헤더(HSTS preload, frame-ancestors none), 두 `dangerouslySetInnerHTML` 모두 DOMPurify 래핑
- **백엔드**: 전 프로파일 `open-in-view:false`·`ddl-auto` 적절(prod none), BaseEntity 감사컬럼, 도메인 로직 엔티티 캡슐화, 중앙 ErrorCode/BusinessException, BCrypt 자동 마이그레이션, refresh token은 HttpOnly+SameSite 쿠키
- **CI**: 멀티모듈 build+test+check, 샤딩 Playwright(dockerized DB/API), 엔티티/마이그레이션 변경 시 `:foundation:test --no-build-cache` 스키마 무결성 게이트
- **repo**: node_modules·build/bin·hs_err 로그 모두 정상 ignore, 211줄 .gitignore는 실제로 잘 관리됨

---

## 5. 로드맵

### 🚑 이번 주 (Quick Wins, 고가치·저노력)
1. **크리덴셜 전량 로테이션** — RSA 키(제거됨, **로테이션만 남음**), OCI `egov123`, Supabase 비번, JWT 시크릿. `**/*.key,**/*.pem,graphify-out/,api-docs.json,db_columns.json` ignore + **gitleaks pre-commit** 추가
2. `UserDto/BoardDto.pswd`에 `@JsonProperty(access=WRITE_ONLY)` + `EgovAuthenticationProvider`의 해시 `log.info` 3곳 제거
3. `ci.yml`의 OWASP·npm audit에서 `continue-on-error` 제거(리포트 업로드는 `if:always()` 유지)
4. JWT를 localStorage/비-httpOnly 쿠키에 쓰지 말 것 + admin 라우트를 클라 `userRole` 쿠키로 게이팅 말 것(서버검증 또는 백엔드 403 의존)
5. 미인증 `DebugController` force-500 엔드포인트 + `graphify-out` 캐시(4.1MB) 트리에서 삭제
6. README 13개 깨진 링크 + `backend-architecture.md` 패키지명(`nuri.server→nuri.api`) 수정
7. **`CLAUDE.md`(GEMINI.md+헌법 import) + `.claude/settings.json`(파괴적 DB 명령 deny)** 추가

### 🏗️ 전략 (구조적)
- 시크릿을 **클래스로 제거**: 시크릿 스토어/배포시 주입, JWT_SECRET/DB_PASSWORD 미설정 또는 **알려진 기본값이면 startup fail-fast**, 공인 IP Postgres 방화벽 차단
- **광고-집행 격차 해소**: pitest를 diff-scoped 게이팅 CI job으로(STRICT_MUTATION=true), `jacocoRootCoverageVerification`+모듈별 검증을 check/CI에 연결, 80/85 숫자 단일화
- 마이그레이션을 권위 스키마로: 전 `tb_*` CREATE하는 Flyway baseline + 빈 Postgres에 Flyway→`ddl-auto:validate` 부팅 parity CI
- Soft-delete 전면 재설계: 필터를 트랜잭션 **안**에 바인딩(또는 Hibernate 6.4 `@SoftDelete`), 전 `use_yn` 엔티티에 공유 `@FilterDef`, 읽기경로에 명시적 `use_yn='Y'` 방어
- 집행 가능 규칙을 **코드로 승격**(no-pswd-serialization, HttpOnly 쿠키, 네이밍/타입 SSOT, AllowedOrigins=* 금지), 하네스를 **에이전트 이식 가능**하게
- 레거시 eGovFrame 표면(290개 webapp/JSP, CSRF 끈 `.do` 체인, 미사용 MapStruct 의존, ~470 junk) 제거 또는 명시적 스코프·잠금 결정

---

## 부록 A. 적대적 검증에서 기각·강등된 주장 (오탐 방지)

신뢰성을 위해, 1차 분석에서 제기됐으나 검증에서 **사실이 아님**으로 확인된 항목:

- React `cache()` staleness 버그 — **기각** (React 19 `cache()`는 server-render 스코프)
- jacoco "단일 test.exec 데이터 경쟁" — **기각** (모듈별 경로 분리됨; 실제 이슈는 aggregator가 rootProject build만 읽는 점, medium)
- prod/test 스키마 "절대 수렴 안 함" — **기각** (커밋된 덤프가 전 `tb_*` 수렴 입증)
- soft-delete 통합테스트가 "shipping bug를 가린다" — **기각** (운영 read 서비스가 `@Transactional`이라 일반 경로는 완화됨; 단 방어 술어 부재·2/20 커버리지는 여전히 유효 리스크)
- ".agent corpus는 순수 honor-system theater" — **강등** (entity-in-controller/LAZY/레이어링은 빌드 실패 ArchUnit으로 실집행)
- 6144m 테스트 힙 "OOM" — **강등** (크래시 로그는 compileJava `-Xmx1024m`발, 병렬 6GB 테스트 포크 아님)

---

## 부록 B. 후속 작업 후보

- [ ] 다른 시크릿(OCI/Supabase/JWT)도 git 히스토리 purge (SSH 키와 동일 방식)
- [ ] `CLAUDE.md` + `.claude/settings.json`(파괴적 DB 명령 deny) 생성
- [ ] Quick Win 1~7 실제 패치 적용
- [ ] 품질 게이트(뮤테이션/커버리지) CI 연결 또는 광고 문구 제거
