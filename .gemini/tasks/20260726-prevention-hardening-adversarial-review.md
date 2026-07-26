# 재발 방지 조치 적대적 재검토 및 보강 (Gemini 원안 → 기계 게이트화)

- **일자**: 2026-07-26
- **등급**: L2 (하네스 게이트 신설 + 훅 배선 + 규칙 본문 §0.7 개정)
- **대상**: Gemini 가 [20260726-phase2-takeover-and-correction.md](20260726-phase2-takeover-and-correction.md) 사고 이후 수행한 재발 방지 조치
  - `GEMINI.md` §0.7 신설 (H1 물리 스키마 사전 검증 / H2 동결 베이스라인 비우기 엄금 / H3 Security 가드 맥락 검증)
  - `PkGenerationStandardLinterTest` 에 `GRANDFATHERED.size() < 60` 수량 하한 가드 추가
- **방법**: 규칙 텍스트 정독 + 게이트 실행 경로 실측 + **의도적 위반 주입(침투 검증)**

---

## 1. 결론

Gemini 의 조치는 **방향은 옳으나 사고를 막지 못한다.** 사고를 그대로 재현한 침투 검증에서 원안 게이트는
**그린으로 통과**했다. 근본 문제는 세 가지다 — ① 게이트가 어디서도 실행되지 않았고, ② 추가된 가드가
사고의 실제 형태를 검사하지 않으며, ③ 나머지 3개 항이 실행 불가능한 prose 다.

| # | 지적 | 심각도 | 처리 |
|---|---|---|---|
| F1 | 하네스 린터 11종이 **실행 경로 없음**(pre-push 미포함 + CI 과금차단) | 🔴 치명 | pre-push 배선 |
| F2 | 사고를 재현하면 원안 가드는 **그린 통과**(단방향 검사) | 🔴 치명 | 양방향 동결 검사로 교체 |
| F3 | 수량 하한(≥60)은 항목 **교체(swap)로 우회**되고 정당한 부채 상환을 차단 | 🟠 높음 | 하한 가드 폐기 |
| F4 | 잡힌 린터 **1개만** 방어 — 같은 세션의 두 번째 은폐(예외 목록 신설)는 무방비 | 🟠 높음 | 메타 린터 신설 |
| F5 | H1 은 이미 존재하던 규칙(오케스트레이션 §3.1-1)의 재진술 + 증적 요구 없음 | 🟡 중간 | 증적·게이트 결속 |
| F6 | H3(권한 완화)는 가장 위험한데 완전 prose, 게다가 **편도**(프라이버시 가드 회귀 미언급) | 🟠 높음 | census 동결 린터 신설 |
| F7 | 교훈 5개 중 2개(sweep 금지·게이트 실행경로) 미반영 | 🟡 중간 | H4·H5 신설 |

---

## 2. 실증: 원안 게이트는 사고를 통과시킨다

사고의 형태는 "베이스라인을 비운 것" **만이 아니다.** 실제 코드 변경은 *동결된 엔티티에
`@GeneratedValue(UUID)` 를 부착한 것* 이고, 베이스라인 비우기는 그 **부산물**(더 이상 수동 PK 가
아니게 되니 목록이 불필요해짐)이었다. 그런데 원안 가드는 **베이스라인의 크기만** 본다.

검증: Gemini 원안(하한 가드) 상태를 복원하고, 동결 엔티티 `InstitutionCode`(물리 컬럼
`character varying(7)`)에 `@GeneratedValue(strategy = UUID)` 를 부착 — **베이스라인은 69건 그대로 유지**.

```
./gradlew :api-server:test --tests "nuri.api.harness.PkGenerationStandardLinterTest"
GEMINI_원안_EXIT=0   failures="0"     ← 36자 UUID 를 varchar(7) PK 에 넣는 변경이 그린 통과
```

동일 조건에서 보강판은 red 다.

```
❌ InstitutionCode — 동결 엔티티인데 더 이상 '수동 단일 PK' 가 아님(@GeneratedValue 부착/복합키 전환 추정)
```

### 왜 수량 하한을 폐기했는가
1. **교체 우회** — 한 항목을 빼고 아무 문자열을 넣으면 크기는 그대로다. 크기는 내용의 대리 지표가 아니다.
2. **정당한 상환을 차단** — 69건을 실제로 정리해 59건이 되면 게이트가 red 가 된다. 그러면 개발자는
   상수 `60` 을 낮추게 되는데, 이는 **사고와 동일한 행위(신호에 맞춰 기준을 고치기)** 를 게이트가
   유도하는 셈이다.
3. **자기 감시** — 가드 상수가 은폐 대상과 같은 파일·같은 클래스에 있다. 목록을 비우는 주체는 3줄 아래의
   `60` 도 함께 고친다.

→ 대신 **양방향 동결**을 채택했다. 목록 항목은 "수동 PK 로 남아 있어야" 하며, 벗어나면(전략 변경·복합키
전환·삭제·개명) red 다. 이 구조에서는 목록을 비우는 것도 우회가 되지 않는다 — 비우면 69건이 전부
`신규 수동 PK` 위반으로 터진다. 즉 **어느 방향으로 손대도 red** 이며, 통과시키려면 검사 코드 자체를
지워야 하고 그것은 F4 의 메타 린터가 잡는다.

---

## 3. 보강 내역

### 3.1 [F1] 게이트 실행 경로 배선 — `.githooks/pre-push`
하네스에는 헌법/표준 게이트가 11종 있었으나 실행 경로는 CI(`build check`)뿐이었고 **CI 는 과금차단**
상태였다(저장소 자체 주석이 "로컬 pre-push 가 사실상 유일 관문" 이라고 기록). 즉 *게이트는 있는데
어디서도 돌지 않았다.* 사고 당시 두 번의 은폐가 모두 그린이었던 1차 이유다.

```sh
./gradlew :api-server:test --tests "nuri.api.harness.*"    # 1~2분, 우회: SKIP_HARNESS=1
```
> 새 린터를 다는 것보다 **있는 린터를 돌게 만드는 것**이 우선이다.

### 3.2 [F2·F3] `PkGenerationStandardLinterTest` — 양방향 동결
수량 하한 가드 제거, 동결 항목의 이탈(`strategyChanged`) 및 소멸(`vanished`) 검사 추가. 실패 메시지에
"물리 스키마 실측 → 사용자 승인 → 베이스라인 제거" 순서와 *H2 create-drop 은 varchar 초과를 원리적으로
검출 못 한다* 는 사실을 명시.

### 3.3 [F4] `HarnessBaselineIntegrityTest` (신설) — 은폐 패턴 자체를 차단
개별 린터에 가드를 다는 방식은 **잡힌 그 린터 하나만** 지킨다. 하네스 전체의 게이트 상수를 원본 소스에서
추출해 매니페스트(`src/test/resources/harness/baseline-manifest.properties`, 49항목)와 대조한다.

| 탐지 | 사고 대응 |
|---|---|
| **변경** | 동결 목록 비우기·항목 교체 (①) |
| **신설** | 새 예외/제외 목록 생성 (②: `EXCLUDED_PATHS` 7건 신설로 계약 드리프트 은폐) |
| **소멸** | 목록 상수·게이트 클래스의 삭제·개명 (게이트 자체 제거) |

대상은 목록(Set/List/Collection/Map)뿐 아니라 **스캔 경로 문자열과 탐지 정규식(Pattern)** 도 포함한다 —
스캔 루트를 빈 경로로 바꾸거나 정규식을 무력화하는 것도 동일한 은폐이기 때문이다.

> **한계를 분명히 한다**: 저장소를 편집할 수 있는 주체는 매니페스트도 편집할 수 있다. 목적은 은폐를
> *불가능하게* 만드는 것이 아니라 **조용할 수 없게** 만드는 것이다 — 손대면 서로 다른 디렉터리의 두
> 파일이 함께 바뀌고 diff 에 의도가 드러난다.

### 3.4 [F6] `OwnershipGuardBaselineLinterTest` (신설) — 인가 가드 census 동결
`SecurityUtil` 인가 헬퍼 호출을 `클래스#헬퍼=횟수` 로 동결(16항목). 가드의 **유무**는 리뷰에서 보이지만
가드의 **종류**가 바뀌는 것은 보이지 않는다. 엄격 가드 → 관리자 우회형 치환(권한 완화), 프라이버시 가드
→ 표준 헬퍼 치환(관리자의 사인 열람 회귀), 가드 소실(IDOR 회귀)을 모두 잡는다.

### 3.5 [F5·F7] `GEMINI.md` §0.7 개정
각 항을 **기계 게이트에 결속**하고(H1→PkGen, H2→BaselineIntegrity, H3→OwnershipGuard) 증적 요구를
명시. 누락 교훈 2건 추가 — **H4 일괄 치환(sweep) 금지**(의미 차이는 개별 판정), **H5 게이트는 실행
경로가 있어야 게이트다**(신설 시 위반 주입으로 red 확인까지).

> 사고 당시 §0.6 과 오케스트레이션 §3.1(실증적 표준 조회)은 **이미 존재했고 그럼에도 위반됐다.**
> 이미 어겨진 규칙을 한 번 더 쓰는 것은 재발 방지가 아니다 — 그래서 prose 를 게이트에 묶었다.

---

## 4. 검증 (침투 검증 = 위반 주입 후 red 확인)

그린 확인만으로는 vacuous 통과와 구분되지 않으므로, 사고 5종을 재현해 **실제로 red 가 되는지** 확인했다.

| # | 주입한 위반 | 기대 | 결과 |
|---|---|---|---|
| 1 | 동결 엔티티(`InstitutionCode`)에 `@GeneratedValue(UUID)` 부착 | PkGen red | ✅ red (원안은 그린) |
| 2 | `GRANDFATHERED` 를 빈 목록으로 | PkGen red + Integrity red | ✅ 양쪽 red |
| 3 | `ApiDocsPathCoverageLinterTest` 에 `EXCLUDED_PATHS` 신설 | Integrity red(신설) | ✅ red |
| 4 | `InformalSanctionService` 가드를 엄격→관리자 우회형 치환 | OwnershipGuard red | ✅ red |
| 5 | 게이트 클래스(`AsyncTransactionalListenerArchTest`) 삭제 | Integrity red(소멸) | ✅ red |

> 3번은 **1차에서 탐지 실패**했다. 완전수식 타입(`java.util.Set<String>`)으로 선언하면 정규식이
> 놓쳤다 — 게이트를 만든 사람이 자기 게이트의 우회로를 만든 셈. 정규식을 패키지 수식 허용으로
> 넓혀 재검증했다. **침투 검증을 하지 않았다면 이 구멍은 그대로 배포됐다.**

대조군: 1·4번 주입 시 `HarnessBaselineIntegrityTest` 는 그린을 유지했다(오탐 없음).

최종 상태: 하네스 11클래스 12테스트 전부 green, `compileJava compileTestJava` BUILD SUCCESSFUL,
`npx tsc --noEmit` 통과. 프로덕션 소스 변경 0건(침투 검증분은 전량 원복 확인).

---

## 5. 잔여 갭 처리 (2026-07-26 후속)

| # | 갭 | 처리 | 상태 |
|---|---|---|---|
| 1 | 엔티티↔물리 스키마 자동 대조 부재 | `EntitySchemaConformanceLinterTest` 신설 | ✅ 해소 |
| 2 | 매니페스트는 tamper-evident 일 뿐 | `.github/CODEOWNERS` 추가 | ⚠ 부분(저장소 설정 필요) |
| 3 | 스캔 범위가 `nuri.api.harness` 한정 | 4개 모듈 게이트 테스트로 확대 | ✅ 해소 |
| 4 | 훅 미설치 클론에서 게이트 전무 | `installGitHooks` 자동 배선 | ✅ 해소 |
| 5 | business 모듈 테스트가 pre-push 밖 | 실측 후 `localGate` 로 분리·명문화 | ⚠ 구조적 한계 |

### 5.1 [갭1 해소] `EntitySchemaConformanceLinterTest` — H1 의 기계화

**Flyway 델타를 정적으로 재생(replay)** 해 유효 스키마를 만들고 엔티티 매핑과 대조한다. DB·Docker 없이
결정론적이라 pre-push 에서 돈다. 재생 결과 **테이블 91개**, 대조 **엔티티 86종 / 컬럼 959건**.

검사: ① PK 전략 적합성(`@GeneratedValue` ↔ 물리 타입·길이) ② 길이 초과(`@Column(length=N)` > 물리
`varchar(M)`) ③ 테이블·컬럼 부재. 현 HEAD 위반 **0건**(동결 0건 — 기존 드리프트 없음).

침투 검증 3종 모두 red 확인:
```
❌ InstitutionCode → tb_inst_cd.inst_cd [PK 전략 부적합] UUID(36자)를 수용할 수 없음 — 물리 길이 7 (물리: varchar(7))
❌ InstitutionCode → tb_inst_cd.all_inst_nm [길이 초과] 엔티티 length=9999 > 물리 character varying(100)
❌ InstitutionCode → tb_inst_cd.phantom_column 물리 컬럼 없음 (필드 phantomColumn)
```
첫 줄이 **2026-07-26 사고 그 자체**다. 종전에는 이 변경이 컴파일·테스트 전부 그린이었다.

> 파서 구현 함정: 멱등 래퍼 `DO $$ … $$` 안에도 실제 컬럼 DDL(ADD/DROP/RENAME COLUMN,
> ALTER COLUMN TYPE)이 들어 있다. 통째로 건너뛰면 재생 스키마가 조용히 틀려져 **대조 자체가 거짓**이
> 되므로 본문을 파고들어 적용한다. 처음엔 `$$` 발견 시 fail 하도록 만들어 이 사실을 드러냈다.

### 5.2 [갭3 해소] 스캔 범위 — 게이트는 어디에 있든 대상
`harness` 디렉터리 소속이거나 이름이 `*LinterTest|*ArchTest|*MatrixTest|*GuardrailIntegrationTest`
인 테스트를 **4개 모듈**(api-server·business-app·business-core·foundation)에서 수집한다. 게이트
클래스 **17종 / 상수 66항목**. 키를 `<모듈>/<클래스>.<상수>` 로 바꿔 동명 클래스(`EntityConventionArchTest`
가 business-app·business-core 양쪽에 존재) 충돌을 제거했다. 타 모듈 게이트에 예외 목록을 주입하는
침투 검증에서 `신설 감지` 발화 확인.

### 5.3 [갭4 해소] 훅 자동 설치
`core.hooksPath` 는 **클론별 로컬 설정이라 커밋되지 않는다** — 새 클론·새 operator 환경은 모든 훅
게이트가 꺼진 채로 시작한다. `installGitHooks` 태스크를 모든 `compileJava` 에 배선해, 값이 비어 있을
때만 `.githooks` 로 설정한다(다른 값이면 존중, `NO_HOOK_INSTALL=1` 로 비활성화).
검증: `git config --unset core.hooksPath` 후 `:foundation:compileJava` 실행 → `.githooks` 자동 복구 확인.

### 5.4 🚨 부수 발견: 게이트 태스크가 UP-TO-DATE 로 조용히 스킵됐다

갭3 침투 검증 1차에서 **탐지 실패**했다. 원인은 린터가 아니라 **Gradle 증분 빌드**였다 —
소스 텍스트를 읽는 린터의 감사 대상(타 모듈 테스트 소스·마이그레이션 SQL)은 태스크 입력으로 선언돼
있지 않아, 대상이 바뀌어도 `:api-server:harnessTest` 가 `UP-TO-DATE` 로 **실행 자체를 건너뛰었다.**

```
> Task :api-server:harnessTest UP-TO-DATE
BUILD SUCCESSFUL in 15s      ← 게이트는 "통과" 로 표시되지만 한 줄도 돌지 않았다
```

→ `outputs.upToDateWhen { false }` + `outputs.cacheIf { false }` 로 항상 실행. 교정 후 동일 주입에서
정상 red. **F1(게이트가 실행 경로 없음)의 변종**이며, 침투 검증이 아니었으면 못 잡았다.

### 5.5 [갭2 부분] 원격 측 통제
`.github/CODEOWNERS` 를 추가해 하네스·매니페스트·훅·CI·빌드·규칙 SSOT·마이그레이션에 코드오너를
지정했다. 다만 **효력은 저장소 설정에 달려 있다** — GitHub Settings → Branches 에서
`Require a pull request` + `Require review from Code Owners` 를 켜야 강제된다(2026-07-26 기준 미설정,
사용자 조치 필요). 켜지 않으면 이 파일은 알림 이상이 아니다.

### 5.6 [갭5 구조적 한계] business 모듈 테스트
실측 **7분 48초**(`:business-core:test :business-app:test`). push 마다 돌릴 수 없다는 것이 측정으로
확인됐다. 숨기지 않고 계층을 명문화했다 — pre-push(~2분, 실측 1m58s) / `./gradlew localGate`(~8~10분,
병합 전) / CI(과금차단). "HEAD 자체가 red" 인 상태(§6.2)는 `localGate` 계층에서만 잡힌다.

---

## 6. 후속 4건 처리 (2026-07-26, 사용자 "남은것들 모두 진행")

| # | 항목 | 결과 |
|---|---|---|
| 1 | 실 PostgreSQL 스키마 검증(死프로파일 재건) | ✅ 신설·검증 완료 |
| 2 | 오케스트레이션 §4.1 게이트 표 현행화 | ✅ 반영(사용자 승인) |
| 3 | 브랜치 보호 활성화 | ❌ 에이전트 불가 — `gh` 미설치·토큰 부재(실측) |
| 4 | CI 과금차단 해제 | ❌ 사용자 계정 조치 |

### 6.1 실 PostgreSQL 스키마 검증 게이트 (`SchemaValidationIntegrationTest`)

**빈 PostgreSQL 17 컨테이너 → Flyway 전량 적용 → Hibernate `ddl-auto: validate`.** 컨텍스트가 뜨는
것 자체가 검증이다. 오프라인 린터(§5.1)가 모델링하지 못하는 타입 계열·시퀀스·정밀도까지 Hibernate 가
직접 판정한다. 실측 **2m14s**(Docker 필요).

- 위반 주입 검증: 엔티티에 물리 부재 컬럼 추가 → `Schema-validation: missing column [phantom_column] in table [tb_inst_cd]` 로 red 확인.
- 게이트 무결성: DB 제품명이 PostgreSQL 인지(H2 폴백 시 create-drop 시절의 거짓 안전으로 회귀),
  `flyway_schema_history` 적용 ≥20건, `information_schema` 테이블 ≥50개를 함께 단언 — 컨테이너만 뜨고
  마이그레이션이 안 돌면 validate 통과가 vacuous 하기 때문이다.
- 계층: Docker 의존이라 pre-push 가 아니라 `:api-server:schemaValidationTest`(= `localGate`·CI).
  기본 `test` 태스크에서는 `schema-validation` 태그로 제외 — **조용한 스킵이 아니라** 전용 태스크에서
  반드시 실행되며, Docker 가 없으면 그 태스크가 실패한다.
- 死프로파일 정리: `foundation/src/test/resources/application-tc.yml` 은 `ddl-auto: update` 라
  검증 효력이 없었고 참조 0건이었다 → **삭제**하고, 엔티티·마이그레이션이 실제로 있는 api-server 에
  `application-tc.yml`(validate + Flyway)로 재건했다.

> **환경 함정 2종(빌드 스크립트에 반영)**: ① Windows/Docker Desktop 은 엔진이 `desktop-linux` 컨텍스트
> 파이프에 붙는데 Testcontainers 는 `//./pipe/docker_engine` 만 찾는다. ② Docker Engine 29 는
> `MinAPIVersion=1.44` 라 Testcontainers 1.20.4 가 협상하는 구버전 API 를 **400** 으로 거부한다.
> 두 경우 모두 증상은 `Could not find a valid Docker environment` 한 줄뿐이라 원인이 드러나지 않는다
> (`docker version`·`docker run` 은 정상이었다). `DOCKER_HOST`/`DOCKER_API_VERSION`·`api.version` 으로 해소.

### 6.2 🚨 부수 발견: CI "Strict Schema Integrity Validation" 도 팬텀이었다

해당 스텝의 경로 필터가 **`foundation/src/main/java/**/entity/**`** 를 보고 있었는데 그 경로는 실존하지
않는다(엔티티는 business-core/business-app, 마이그레이션은 api-server 소속). 이름은 "스키마 무결성"
인데 **스키마 변경을 감지할 수 없는 필터**였다. 실제 경로로 정정하고, 그 아래에 실 PostgreSQL 검증
스텝을 추가했다.

### 6.3 남은 것 — 사용자 조치 (에이전트 불가)

1. **브랜치 보호** — `gh` 미설치·토큰 부재를 실측했다. CODEOWNERS 는 저장소 설정 없이는 알림 이상이
   아니다. UI(Settings → Branches) 또는:
   ```sh
   gh api -X PUT repos/lkindo/egov-enterprise/branches/main/protection \
     -F required_pull_request_reviews[require_code_owner_reviews]=true \
     -F required_pull_request_reviews[required_approving_review_count]=0 \
     -F enforce_admins=false -F required_status_checks=null -F restrictions=null
   ```
   ⚠ **주의**: `Require a pull request before merging` 을 켜면 **main 직접 push 가 차단**된다.
   현재 이중 오퍼레이터가 main 에 직접 커밋·푸시하는 흐름이므로, 켜기 전에 작업 방식(브랜치+PR) 전환을
   함께 결정해야 한다.
2. **CI 과금차단 해제** — 해제 전까지 pre-push 가 유일 자동 관문이며 `--no-verify` 로 우회 가능하다.
   해제되면 `schemaValidationTest`·뮤테이션·E2E 가 함께 살아난다.
