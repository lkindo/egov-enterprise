# Dependabot 취약점 알림 census (2026-08-07)

> 열린 알림 **84건**을 "숫자"가 아니라 **실제로 해석되는 버전**을 기준으로 전수 판정한 기록이다.
> 판정을 재현하는 절차와 그 결과, 그리고 **조치하지 않기로 한 항목의 사유**를 함께 남긴다.
> 사유 없이 목록만 정리하면 그것은 신호 은폐다(GEMINI.md §0.7-H2).

---

## 1. 왜 전수 재판정이 필요했나

알림 84건(maven 69 · npm 15)의 심각도 분포는 high 20 / medium 52 / low 12 였다.
그러나 **알림이 지목한 버전과 이 저장소가 실제로 해석하는 버전이 달랐다.**

`gradle/actions/dependency-submission` 이 GitHub 의존성 그래프에 제출하는 데이터에는
현재 해석되지 않는 좌표가 섞여 들어온다. 실측으로 확인한 두 기전:

| 기전 | 증거 |
|---|---|
| **(a) 요청측 좌표 기록** — 충돌 해소 *이전*의 요청 버전이 그래프에 남는다 | `spring-webflux:6.1.15` 는 전 모듈 전 configuration 에서 **요청측 24회 / 해석측 0회**. 실제 해석은 항상 `6.2.19`. `spring-webmvc:6.2.11`(39/0), `jackson-databind:2.18.2`(80/0) 동일 |
| **(b) 낡은 스냅샷 잔존** — 2026-08-02 최초 제출(당시 Boot 3.4.x) 시점의 항목이 퇴역하지 않음 | `spring-boot:3.4.2`·`logback-core:1.5.12` 는 현재 빌드 어디에도 **0회 등장**(모듈 트리·`buildEnvironment` 모두). SBOM 에는 여전히 존재 |

SBOM 실측: maven `group:name` 495종 중 **137종이 버전 분기**를 보이며,
`jackson-bom`·`jackson-parent`·`oss-parent` 같은 **POM 메타데이터 노드**까지 패키지로 등록돼 있다.
알림 생성일도 이를 뒷받침한다 — maven 69건 중 **61건이 2026-08-02** 하루에 생성됐다.

> ⚠ 이 절은 "알림이 틀렸으니 무시하라"는 뜻이 **아니다**. 그래프가 부정확하다는 사실 자체가
> 판정을 흐리므로, 알림을 믿는 대신 **로컬 해석값을 직접 측정해 대조**해야 한다는 뜻이다.

---

## 2. 재현 절차

```bash
# 1) 전 모듈 전 configuration 의 의존성 해석 결과를 수집
for m in foundation business-core business-app api-server migration-tool; do
  echo "##### MODULE $m"; ./gradlew ":$m:dependencies"
done > alldeps.txt

# 2) 열린 알림을 취약 범위와 함께 조회
gh api repos/lkindo/egov-enterprise/dependabot/alerts --paginate \
  -q '.[] | select(.state=="open")
      | [.number, .security_advisory.severity, .dependency.package.name,
         .security_vulnerability.vulnerable_version_range,
         (.security_vulnerability.first_patched_version.identifier//"-")] | @tsv'
```

**해석값 판별 규칙**: gradle 출력의 `a:b:X -> Y` 에서 해석값은 **Y**(화살표 오른쪽)다.
화살표가 없으면 그 값 자체다. 왼쪽(X)은 *요청값*이며 해석값이 아니다.

> 이 구분을 놓치면 오판한다. 실제로 초기 조사에서 `spring-boot-starter-actuator:3.4.0` 을
> "미해결"로 집계했으나 원문은 `3.4.0 -> 3.5.16` 이었다. 같은 오류를 두 번 냈다.

**판정**: 해석값이 알림의 `vulnerable_version_range` 에 **포함되는가**로 가른다.
`first_patched_version` 만 비교하면 안 된다 — 취약 범위가 다른 마이너 라인에 한정된 경우
(예: webflux `<= 6.1.26` 인데 우리는 6.2.19) `first_patched_version` 이 `null` 로 오기 때문이다.

---

## 3. 판정 결과

### 3.1 조치 완료 — 버전 상향 (알림 24건 해소)

BOM 이 관리하는 3종은 BOM 속성으로, 관리하지 않는 3종은 Gradle constraint 로 올렸다.
constraint 에 `force` 가 아닌 **`require`(하한)** 를 쓴 이유는 상위 라이브러리가 더 높은 버전을
요구할 때 우리 선언이 **끌어내리는 상한**이 되지 않게 하기 위해서다.

| 패키지 | 이전 | 이후 | 유입 경로 | 알림 |
|---|---|---|---|---|
| `jackson-databind` | 2.21.4 | **2.21.5** | Boot BOM (jackson-bom) | 3건 |
| `log4j-core` | 2.24.3 | **2.25.4** | egovframe-rte-fdl-logging 5.0.0 (BOM 이 2.25.3→2.24.3 으로 끌어내리고 있었다) | 4건 |
| `opentelemetry-*` | 1.49.0 | **1.62.0** | micrometer-tracing-bridge-otel | 2건 |
| `commons-configuration2` | 2.11.0 | **2.15.0** | egovframe-rte-fdl-property 5.0.0 | 1건 |
| `com.sun.mail:jakarta.mail` | 1.6.7 | **1.6.8** | commons-email 1.6.0 | 1건 |
| `httpclient` | 4.5.12 | **4.5.13** | googleauth 1.5.0 (2FA) | 1건 |

npm 은 `frontend/package.json` 의 `pnpm.overrides` 범위를 갱신했다(12건 해소):
`fast-uri` 3.1.5 · `postcss` 8.5.23 · `js-yaml` 4.3.1 · `tmp` 0.2.7 · `hono` 4.12.27 ·
`@hono/node-server` 2.0.5(신규) · `ip-address` 10.3.1(신규) · `brace-expansion` 5.0.7(신규).

> `brace-expansion` 은 락에 1.1.18 / 2.1.2 / 5.0.6 **세 인스턴스가 공존**한다.
> 그래서 `>=3.0.0 <5.0.7` 로 5.x 라인만 좁혀 잡았다 — 무범위 override 였다면 1.x 까지
> 5 로 끌어올려 깨졌을 것이다(이 저장소는 js-yaml 에서 이미 그 사고를 겪었다).

### 3.2 조치 불필요 — 해석값이 취약 범위 밖 (65건)

알림이 지목한 취약 범위에 **현재 해석 버전이 들어가지 않는다**. §1 의 (a)(b) 기전 때문이다.

| 패키지 | 해석값 | 취약 범위(예) | 알림 |
|---|---|---|---|
| `spring-webflux` | 6.2.19 | `>= 6.1.0, <= 6.1.21` | 12 |
| `spring-webmvc` | 6.2.19 | `>= 6.2.0, <= 6.2.18` | 11 |
| `logback-core` | 1.5.34 | `< 1.5.34` | 6 |
| `spring-expression` | 6.2.19 | `>= 6.2.0, <= 6.2.18` | 3 |
| `spring-boot` | 3.5.16 | `>= 3.4.0, <= 3.4.15` | 2 |
| `spring-boot-starter-actuator` | 3.5.16 | `>= 3.4.0, <= 3.4.13` | 2 |
| `jackson-core` | 2.21.5 | `>= 2.15.0, <= 2.18.5` | 2 |
| `commons-compress` | 1.27.1 | `>= 1.3, < 1.26.0` | 2 |
| `micrometer-core` | 1.15.12 | `>= 1.14.0, <= 1.14.14` | 1 |
| `postgresql` | 42.7.13 | `>= 42.7.4, < 42.7.12` | 1 |
| `spring-core` / `spring-web` / `spring-retry` / `commons-lang3` | 최신 | — | 각 1 |
| §3.1 상향으로 범위 밖이 된 것 | — | — | 24 |

**`spring-webflux` 는 그 위에 더 강한 사실이 있다** — 이 저장소는 WebFlux 를 쓰지 않는다.
`Mono`/`Flux`/`WebClient`/`reactive` 전수 grep 0건이며, `spring-ai-retry:1.0.0-M5` 가
전이로 끌어올 뿐이다. 즉 12건은 *버전이 안전할 뿐 아니라* **호출 경로 자체가 없다**.

### 3.3 조치하지 않음 — 사유 명시 (7건)

| # | 패키지 | 심각도 | 사유 |
|---|---|---|---|
| 70, 71 | `querydsl-jpa` / `querydsl-apt` 5.1.0 | **high** (CVSS 8.2, CVE-2024-49203) | → **§8 에서 해소**. 원본 `com.querydsl` 은 5.1.0 이 마지막이라 패치가 없었고, 유지보수 포크 `io.github.openfeign.querydsl` 로 이관했다. |
| 4 | `uuid` 8.3.2 (npm, dev) | medium | 패치가 **11.1.1** — 3메이저 도약이다. 취약 API 는 `buf` 를 외부에서 넘기는 `v3()/v5()/v6()` 뿐이고, 8.3.2 는 `proxy-agent` 계열 dev 도구의 전이 의존이라 해당 호출 경로가 없다 |
| 6 | `esbuild` 0.27.7 (npm, dev) | low | 취약 조건이 "**dev server 구동 중 Windows**"인데 esbuild dev server 를 띄우는 경로가 없다(vitest/storybook 은 번들러로만 사용). 0.x 마이너는 파괴적 변경 관례라 위험 대비 이득이 없다 |
| 2 | `elliptic` 6.6.1 (npm, dev) | low | **패치 버전이 존재하지 않는다**(`first_patched_version: null`) |
| — | `artemis-project`, `jsoup` | medium | 전 모듈 전 configuration 해석 결과에 **존재하지 않는다**. 그래프에만 남은 항목 |

---

## 4. 조치 후 상태

| 구분 | 건수 |
|---|---|
| 해석값이 취약 범위 밖 (기존 + 이번 상향) | **77** |
| 사유를 명시하고 남긴 것 | **7** |
| 합계 | 84 |

**검증 증적**
- `./gradlew compileJava compileTestJava` → `BUILD SUCCESSFUL in 2m 13s`
- `./gradlew :api-server:harnessTest :api-server:test` → `BUILD SUCCESSFUL in 4m 19s`
  - 결과 XML 실측: harnessTest **tests=30 failures=0 errors=0**, test **tests=462 failures=0 errors=0**
  - ⚠ 빌드 로그에 `19 up-to-date` 가 찍혀 UP-TO-DATE 스킵을 그린으로 오독할 여지가 있어,
    결과 파일의 수정 시각(10:37 / 10:39, 확인 시각 10:40)까지 대조해 **이번 실행분임을 확인**했다.
- `npx tsc --noEmit` → exit 0
- `pnpm codegen:verify` / `codegen:verify:zod` → 드리프트 없음(276 schemas)
- 상향 결과 실측(전 모듈 전 configuration 재수집 후 해석값 대조): 6종 전부 목표치 이상

> **otel 1.49→1.62 마이너 도약의 검증 범위**: 우리 코드는 `io.opentelemetry` 를 직접 참조하지
> 않으며(전수 grep 0건) otel 관련 설정도 없다. 즉 위험은 `micrometer-tracing-bridge-otel` 과의
> 바이너리 호환성뿐이고, 그것은 Spring 컨텍스트를 띄우는 api-server 테스트 462건이 통과함으로써
> 확인됐다. **런타임 트레이싱 실동작은 검증하지 않았다**(수집 스택 부재) — 도입 시 재확인 필요.

---

## 5. 알림 상태 정리 (사용자 승인 후 실행)

§3.2 의 65건과 §3.3 의 `artemis-project`/`jsoup` 2건, 합계 **67건을 `inaccurate` 사유로 닫았다**.
각 건에는 **판정 근거를 코멘트로 남겼다** — 해석값, 취약 범위, 재현 절차 문서 경로.
사유 없이 닫으면 그것이 곧 신호 은폐이므로, 코멘트 없는 dismissal 은 하지 않는다.

> ⚠ **1차 시도는 코멘트가 첫 줄에서 잘렸다.** `dismissed_comment` 는 **280자 제한**이며,
> 개행이 포함된 값을 Windows shell 경유로 넘기면 재파싱 과정에서 첫 줄만 전달된다.
> "성공 65 / 실패 0" 이 찍혔지만 실제 저장된 코멘트는 한 문장뿐이었다.
> 저장 결과를 되읽어 확인하지 않았다면 **근거 없는 대량 dismissal** 로 끝날 뻔했다.
> 이미 `dismissed` 인 알림은 코멘트만 갱신할 수 없어(HTTP 409) **재개방 후 재-dismiss** 로 정정했다.
> 교훈: 외부 상태를 바꾸는 API 는 **반환값이 아니라 저장된 상태를 되읽어** 확인한다.

조치 후 상태: `open` 84 → **17**(querydsl 2 · npm 15). npm 12건은 이 변경이 기본 브랜치에
병합되면 자동으로 닫힌다(Dependabot 은 기본 브랜치를 스캔한다).

## 6. `spring-ai` 제거 (사용자 승인 후 실행)

`spring-ai 1.0.0-M5`(정식 이전 마일스톤)를 **제거했다**. 판단 근거는 전부 실측이다.

| 확인 항목 | 결과 |
|---|---|
| 프로덕션 코드 사용처 | **0건** (`ChatClient`/`ChatModel`/`EmbeddingModel`/`VectorStore`/`OpenAiApi` 전수 grep) |
| 유일한 코드 참조 | `TestAiConfig`(테스트 픽스처) — 그마저 **참조처가 자기 선언뿐인 死코드** |
| 오토컨피그 취급 | `ApiServerApplication` · `application-dev.yml` · `application-test.yml` · `application-e2e.yml` 이 각각 **명시적으로 배제** |
| 전이 유입 | `spring-ai-retry` → `spring-webflux` (알림 12건의 유입원). WebFlux 는 이 저장소가 쓰지 않는다 — `Mono`/`Flux`/`WebClient` 전수 grep **0건** |

즉 이 의존성의 **존재 이유가 전부 "억제"** 였다. `foundation` 의 `api` 스코프라 전 모듈과 배포
아티팩트에 실리면서 공급망 표면과 CVE 알림만 넓히고 있었다.

제거 범위: 카탈로그 5줄 · `foundation`/`business-core`/`api-server` build.gradle 7줄 ·
`ApiServerApplication` 의 `exclude` · yml 9곳의 억제 설정 · `TestAiConfig.java` 삭제.

> ⚠ **AI 기능을 도입하기로 하면 정식 릴리스(1.0.0 GA 이상)로 되살릴 것.** M5 를 그대로 되돌리지 말 것.

### 6.1 제거가 드러낸 것 — 프로덕션 의존성 2종이 AI 의존성에 얹혀 있었다

제거하자 컴파일이 **두 번** 깨졌다. 둘 다 선언이 없는 채로 `spring-ai` 전이에 의존하고 있었다.

**(1) `spring-retry`** — `:foundation:compileJava`

```
AsyncConfig.java:9: error: package org.springframework.retry.annotation does not exist
AsyncConfig.java:23: error: cannot find symbol  @EnableRetry
```

| 사용처 | 무엇 |
|---|---|
| `AsyncConfig` | `@EnableRetry` |
| `MailAsyncProcessor` | `@Retryable` / `@Backoff` / `@Recover` |
| `SmsAsyncProcessor` | `@Retryable` / `@Backoff` / `@Recover` |

`business-app` 은 이미 `libs.spring.retry` 를 선언하고 있었다 — **`foundation` 만 빠져 있었고**,
그 구멍을 `spring-ai-retry` 가 메우고 있었다.

**(2) `spring-messaging`** — `:business-core:compileTestFixturesJava`, `:business-app:compileJava`

```
NotificationService.java:28: error: cannot find symbol  SimpMessagingTemplate
TestMessagingConfig.java:7: error: package org.springframework.messaging.simp does not exist
```

| 사용처 | 무엇 |
|---|---|
| `NotificationService` (business-app) | `SimpMessagingTemplate` 로 STOMP 알림 발행 |
| `TestMessagingConfig` (business-core testFixtures) | 위 타입의 목(mock) 빈 |

`api-server` 에 `spring-boot-starter-websocket` 이 있지만 **`implementation` 스코프라 하위
모듈로 전파되지 않는다**. 실제로 쓰는 `business-app`·`business-core` 에는 선언이 없었다.

---

즉 **메일·SMS 재시도와 실시간 알림 — 프로덕션 회복탄력성 기능 두 가지가 쓰지도 않는 AI
의존성에 얹혀 있었다.** spring-ai 가 `spring-ai-retry` 를 떼거나 다른 이유로 제거되는 순간
조용히 깨질 구조였다. 카탈로그에 `spring-messaging` 을 신설하고, 쓰는 모듈이 직접 선언하도록
바로잡았다(버전은 둘 다 Boot BOM 관리).

> 이것이 미사용 의존성을 걷어내야 하는 실질적 이유다. 안 쓰는 라이브러리는 자리만 차지하는 게
> 아니라 **다른 것의 버팀목 노릇을 하며 의존 관계를 감춘다.** 감춰진 의존은 제거 시점이 아니라
> 무관한 변경 시점에 터진다 — 그때는 원인이 훨씬 멀리 있다.

**제거 확인**: 전 모듈 전 configuration 재수집 결과 `spring-ai` **0회**, `spring-webflux` **0회**.
`spring-messaging` 36회 · `spring-retry` 67회로 정상 해석된다.

## 7. 남은 과제

**그래프 노이즈 축소** — `dependency-submission` 이 pitest·testCompile·annotationProcessor 등
전 configuration 을 제출해 요청측 좌표까지 알림이 된다. 런타임 classpath 로 한정하면
위양성이 구조적으로 줄어든다. 다만 **테스트 전용 의존성의 CVE 가시성을 잃는 대가**가 있어
상충하므로 단독 결정하지 않는다.

---
*근거 데이터: `dependabot/alerts` API(2026-08-07) + `:module:dependencies` 전 모듈 실측 + `dependency-graph/sbom`*

---

## 8. querydsl 근본 해소 (2026-08-07)

§3.3 에서 "취약 패턴이 없으므로 조치하지 않는다"고 판정했던 2건을 **실질적으로 해소**한다.

### 8.1 유지보수 포크로 이관

같은 advisory(GHSA-6q3q-6v5j-h6vg)가 포크에서는 **패치돼 있다**.

| 패키지 | 취약 범위 | 패치 |
|---|---|---|
| `com.querydsl:querydsl-jpa` (원본) | `<= 5.1.0` | **없음** — 5.1.0 이 마지막 릴리스 |
| `io.github.openfeign.querydsl:querydsl-jpa` | `< 5.6.1` | **5.6.1** |
| 〃 | `>= 6.0.0.M1, < 6.10.1` | **6.10.1** |

**5.x 라인을 고른 이유** — 이관 비용을 실측으로 확인했다.

- 포크 `5.6.1` jar 의 자바 패키지가 **`com/querydsl/jpa` 로 동일** → `com.querydsl` 을 import 하는
  소스 **94개 파일을 건드리지 않는다**
- `jakarta` classifier 존재 확인(`querydsl-jpa-5.6.1-jakarta.jar` HTTP 200)이며
  실제로 Jakarta EE 변형이다(jar 상수풀 실측: `jakarta/persistence` **382회** vs `javax/persistence` 8회)
- 6.x/7.x 는 API 변경을 동반하므로 이번 범위에서 제외한다(7.5 의 `querydsl-jpa` 는 `jakarta`
  classifier 자체가 없다 — HTTP 404. jakarta 네이티브로 전환됐다는 뜻이라 별도 이행 계획이 필요하다)

변경 범위는 3개 모듈(`foundation`/`business-core`/`business-app`)의 **groupId 6줄**이며,
카탈로그 항목(`querydsl-jpa`/`querydsl-apt`)으로 SSOT 를 세웠다.

### 8.2 ⚠ 라이브러리 상향으로는 부족하다 — 게이트를 함께 세운다

§3.3 의 판정("취약 패턴이 저장소에 없다")은 **그 시점의 관측**이었고, 재발 방지책은 문서에 적은
*"QueryDSL 로 정렬을 추가할 때 이 조항을 다시 읽을 것"* 한 줄뿐이었다.

**GEMINI.md §0.7 이 못박은 대로, prose 로만 존재하는 규칙은 그 규칙을 어길 주체를 막지 못한다.**
즉 이 census 문서는 위반 재유입을 막는 장치를 만든 게 아니라, **새 prose 부채를 하나 만든 것**이었다.

그래서 `QuerydslDynamicPathLinterTest` 를 신설해 관측을 강제로 바꾼다.

| 금지 | 사유 |
|---|---|
| `PathBuilder` 임의 사용 | 문자열이 식별자가 되는 문. 타입 안전한 Q-클래스가 있는데 쓸 이유가 없다 |
| `Expressions.*Path(비리터럴 인자)` | 변수를 경로명으로 넘기면 그 값이 식별자로 엮인다. 리터럴은 허용 |

동적 정렬이 필요하면 **화이트리스트 `switch`/`Map` 으로 사용자 입력을 컴파일타임 Q-클래스 경로에
매핑**한다 — 현행 `BoardRepositoryImpl#searchArticles` 가 그 형태이며 이 게이트를 통과하는 유일한 방식이다.

**실행 경로**: `nuri.api.harness.*` 필터에 걸리므로 `./gradlew :api-server:harnessTest` 로 실행되며
**pre-push 에서 기계 강제**된다(§0.7-H5 — 실행 경로 없는 게이트는 게이트가 아니다).

### 8.3 게이트 검증 — 그린만으로는 증명이 아니다

위반을 의도적으로 주입해 red 가 되는 것까지 확인했다(§0.7-H5).

| # | 조건 | 결과 |
|---|---|---|
| ① | 무변경 | **green** — 생산 소스 **585개 스캔**, 위반 0 |
| ② | `PathBuilder` 주입 | **red** (EXIT=1) |
| ③ | `Expressions.stringPath(condition.getOrderBy())` 주입 | **red** (EXIT=1) |
| ④ | `Expressions.stringPath("crtDt")` 리터럴 | **green** — 오탐 없음 |

①의 "585개 스캔"을 함께 기록하는 이유: 스캔 대상이 0이어도 그린이므로, **건수를 보지 않으면
vacuous 통과와 구분되지 않는다.** 게이트 자체에도 `scanned == 0` 이면 실패하는 방어를 넣었다.

> ⚠ 주석 안의 `PathBuilder` 언급까지 위반으로 세면 **이 린터의 javadoc 자체가 위반**이 되는
> 자기모순이 생긴다. 그래서 주석을 걷어낸 뒤 매칭한다(도입 시 실측으로 확인).

### 8.4 메타 게이트가 신설 게이트를 차단했다 — 그리고 이전 누락을 드러냈다

`HarnessBaselineIntegrityTest` 가 신설 린터의 상수 4종을 **"매니페스트에 없는 동결/예외 목록"**
으로 판정해 red 를 냈다. 설계대로 작동한 것이다 — 목록의 무단 신설은 신호 은폐의 대표 수법이므로,
새 목록은 **의도적으로 등재**해야 통과한다.

매니페스트를 갱신하되 산출 파일을 그대로 덮어쓰지 않고 **차이를 먼저 대조**했다.
"빨간 신호를 없애려고" 손대는 것과 구분되지 않으면 그 자체가 §0.7-H2 위반이다.

| 항목 | 결과 |
|---|---|
| 신설 | **4건** — 전부 `QuerydslDynamicPathLinterTest` 의 탐지 패턴 상수 |
| 소멸 | **0건** ✅ |
| 게이트 클래스 census | 32 → **34**, 추가만 2건 · 삭제 **0건** ✅ |

> **부수 발견**: 함께 등재된 2건 중 하나는 `UnreachableServiceLinterTest` 였다.
> 2026-08-06 에 신설하고 **매니페스트에 올리지 않은 채로 남아 있었다.**
> 메타 게이트는 신규 클래스를 INFO 로만 알리고 차단하지 않기 때문에(`추가는 허용, 갱신 권장`)
> 지금까지 드러나지 않았다. 이번 갱신으로 함께 등재된다.
>
> ⚠ 즉 **게이트 클래스 census 는 "삭제"만 막고 "누락"은 막지 못한다.** 게이트를 새로 만들고
> 매니페스트에 올리지 않으면, 나중에 그 게이트를 지워도 census 에 없으니 소멸 감지에 걸리지 않는다.
> 신설 게이트는 반드시 같은 커밋에서 매니페스트에 등재할 것.

---

## 9. Storybook 제거 (2026-08-07, 사용자 승인)

§3.3 에서 "dev 전용·도달 경로 없음"으로 남겨 뒀던 `elliptic`·`esbuild` 2건을 해소한다.
**둘 다 override 로는 닫을 수 없었다** — `elliptic` 은 패치 자체가 존재하지 않고,
`esbuild` 는 상위가 Storybook 의 webpack 사슬이었다.

### 9.1 헌법 제14조 개정이 선행 조건이었다

> 종전 조문: *"모든 핵심 UI 컴포넌트는 **Storybook**을 통해 검증하며…"*

Storybook 제거는 프론트엔드 헌법이 요구하는 검증 수단을 없애는 일이므로 **조문 개정 없이는
불가**했다. 개정 근거는 조문과 실태의 괴리다.

| 조문이 요구하는 것 | 실측 |
|---|---|
| "모든 핵심 UI 컴포넌트" | `components/ui/` **21개 중 2개**(`button`·`card`, 9.5%) |
| 지속적 검증 | 스토리 2개는 **2026-03-31 한 커밋에서 생성 후 4개월간 추가 0건** |
| 실행 | **CI 미실행**. `storybook:test` 는 `@storybook/test-runner` 미설치로 **실행 자체가 불가** |
| 고유 커버리지 | 스토리가 있는 그 2개는 **단위 테스트도 보유** — Storybook 단독 영역 **0** |

즉 *"Storybook 으로 검증한다"* 는 문장이 **실제 검증 공백을 가리고 있었다.**
반면 대체 수단은 실제로 돈다 — 컴포넌트 단위 테스트 **28개**, E2E spec **26개**,
시각 회귀 스냅샷 4개가 전부 CI 게이트다. **조문을 실태에 맞춰 내린 것이 아니라,
작동하지 않는 수단을 걷어내고 작동하는 수단을 명문화**했다.

### 9.2 제거 효과

| 지표 | 이전 → 이후 |
|---|---|
| `elliptic` | 1종 → **0종** (유입 경로 소멸) |
| `crypto-browserify` / `browserify-sign` / `node-polyfill-webpack-plugin` | 각 1종 → **0종** |
| 락파일 전체 패키지 | 1924 → **1498종** (**426종 감소**) |

`node-polyfill-webpack-plugin` 의 소비자는 **Storybook 단 하나**였고, 그것이
`crypto-browserify → browserify-sign/create-ecdh → elliptic` 으로 이어지고 있었다.

### 9.3 esbuild 는 남았고, 상향으로 해소했다

제거 후 `esbuild` 의 유입원은 Storybook 이 아니라 **vitest/vite** 로 바뀐다 —
개정된 제14조가 명문화한 검증 수단이므로 제거 대상이 아니다.

그래서 **가정 대신 실증했다**. `vite 8.2.0` 의 peer 범위가 `^0.27.0 || ^0.28.0` 이라
0.28.1 을 허용한다(패키지 메타 실측). override 를 걸고 돌린 결과:

- `npx tsc --noEmit` → **EXIT=0**
- `pnpm vitest run` → **EXIT=0, Test Files 57 passed / Tests 226 passed**

> 종전 census(§3.3)는 esbuild 를 *"0.x 마이너는 파괴적 변경 관례라 위험 대비 이득이 없다"* 며
> 미포함으로 뒀다. 그것은 **추정이었고 실측이 아니었다.** peer 범위를 확인하고 테스트를 돌리는
> 데 든 비용은 몇 분이다. 위험을 추정으로 단정해 조치를 미룬 판단을 정정한다.

### 9.4 되살릴 경우의 조건

컴포넌트 카탈로그를 비개발자와 공유하는 자산으로 운영하기로 하면 이 판단은 재검토 대상이다.
그때는 **webpack 이 아닌 Vite 빌더**(`@storybook/nextjs-vite`)로 도입해 위 취약 사슬을
다시 들이지 말 것. 헌법 제14조 개정 주석에도 같은 단서를 남겼다.

---

## 10. `@lhci/cli` 상시 의존 해제 (2026-08-07, 사용자 승인)

마지막 남은 알림 `uuid`(medium, development)를 해소한다.

### 10.1 ⚠ 먼저 정직하게 — 이것은 "취약점을 고친 것"이 아니다

`uuid` 8.3.2 의 패치는 **11.1.1** 뿐이고, `@lhci/cli` 는 **최신 0.15.1 에서도 `uuid ^8.3.1` 을 고정**한다.
즉 상향 경로는 실제로 존재하지 않는다.

이 변경으로 알림이 사라지는 이유는 **취약점이 고쳐져서가 아니라, 그 패키지가 의존성 그래프에서
빠지기 때문**이다. 도구는 온디맨드(`npx`)로 계속 쓸 수 있으므로 **실행 시점에는 여전히 uuid 8.3.2 가
내려온다.** 이 사실을 흐리지 않기 위해 명시한다.

정당화는 위험 평가에 있다 — 취약 API 는 **외부 `buf` 를 넘기는 `v3()/v5()/v6()`** 뿐이고,
`@lhci/cli` 는 그런 호출을 하지 않는다. 즉 **원래부터 위험이 0 이었고, 사라지는 것은 위험이 아니라
알림**이다. 상시 devDependency 로 안고 있을 이유가 없다는 것이 이 변경의 실제 근거다.

### 10.2 판단 근거 — 앞선 census 서술을 정정한다

§3.3 은 `@lhci/cli` 를 *"설정은 있으나 CI 호출이 없다"* 며 사실상 껍데기로 취급했다.
**그 서술은 부정확했다.** 실측한 `lighthouserc.json` 은 제대로 짜인 설정이다.

- `numberOfRuns: 3`, 대상 `/admin`
- `categories:performance` **≥ 0.85**, `categories:accessibility` **≥ 0.90** — 둘 다 `error` 레벨
- `startServerCommand` 가 참조하는 `start:3001` 스크립트도 **실존**한다 → 지금 돌려도 작동한다

그럼에도 제거가 맞는 이유는 셋이다.

| # | 근거 |
|---|---|
| 1 | **접근성은 이미 실행되는 게이트가 있다** — `@axe-core/playwright` 가 E2E 3개 spec(`01-core-base`·`04-quality-resilience`·`23-security-auth-supplement`)에서 CI 3샤드로 돈다. `eslint-plugin-jsx-a11y` 도 정적으로 잡는다. Lighthouse 의 a11y 임계값은 **중복**이다 |
| 2 | Lighthouse 가 단독으로 지키는 것은 **성능 점수(Core Web Vitals)** 하나인데, 4개월간 실행 0회 · 산출물 0건이다. **도구를 안고 있는 것이 공백을 메우지는 않는다** |
| 3 | **로컬에 상주할 이유가 없다.** `treosh/lighthouse-ci-action`(★1,286, 2026-03 활성)은 액션 컨테이너 안에서 LHCI 를 실행하므로 `lighthouserc.json` 만 있으면 된다 |

즉 "제거냐 존치냐"는 잘못된 이분법이었다. **설정 자산과 도구 역량은 그대로 두고 상시 의존만 끊는다.**

### 10.3 변경 내용

| 항목 | 변경 |
|---|---|
| `@lhci/cli` devDependency | **제거** → 락파일에서 `uuid` **완전 소멸**(문자열 0건) |
| `lighthouse*` 스크립트 3종 | `lhci autorun` → `npx --yes @lhci/cli@0.15.1 autorun` (온디맨드) |
| `lighthouserc.json` | **유지**. `upload.target` 만 변경 |

> ⚠ **`upload.target` 을 반드시 바꿔야 했다.** 종전 값 `temporary-public-storage` 는 리포트를
> **Google 호스팅 공개 URL** 에 올린다 — `/admin` 관리자 화면 렌더 결과가 링크를 아는 누구에게나
> 보인다. 지금까지는 실행되지 않아 드러나지 않았지만, **CI 로 옮기는 순간 매 푸시마다 실제로 발생**한다.
> `filesystem` + `.lighthouseci/`(루트 `.gitignore:205` 가 이미 제외)로 바꿨다.

### 10.4 남는 공백 — 해결한 척하지 않는다

이 변경으로 **프론트엔드 런타임 성능은 여전히 아무도 재지 않는다.** 번들 애널라이저는 크기만,
k6 는 백엔드만 본다. 이것은 취약점 문제가 아니라 별개의 관측 공백이며, 이번 작업이 해결하지 않았다.

메우려면 `treosh/lighthouse-ci-action` 을 CI 잡으로 추가하면 된다 — `configPath` 로 현행
`lighthouserc.json` 을 그대로 참조할 수 있으므로 추가 설정이 필요 없다. **제품 판단 사항으로 남긴다.**

---

## 11. 하네스 구멍 3건 (2026-08-08)

§1~§10 작업 중 **게이트를 우회할 수 있는 경로 3개**가 드러났다. 셋 다 "선언은 있으나
실행 경로가 없다" 는 같은 형태이며, 그중 2개를 메웠다.

### 11.1 ✅ 스택 PR 무검증 — `ci.yml` 의 base 브랜치 제한

`ci.yml` 이 `pull_request: branches: [main, master]` 로 제한돼 **다른 작업 브랜치 위에 쌓은
PR 은 체크가 단 하나도 등록되지 않았다.** 실측(#319): `gh pr checks 319` → *"no checks reported"*.

> ⚠ 위험한 지점은 **"체크가 없다"가 "실패가 없다"로 읽힌다**는 것이다.
> `fail > 0` 만 보고 병합을 판정하는 도구·사람은 **검증 0인 PR 을 통과로 취급**한다.

**조치**: `branches` 필터 제거. 실행 횟수는 늘지만, 검증되지 않은 변경이 main 으로 들어오는
경로를 남기는 것보다 낫다.

### 11.2 ⛔ E2E·mutation 이 required check 가 아니다 — **미해결**

룰셋 `main protection` 의 required 는 **`backend-build`·`frontend-build`·`secret-scan` 3종뿐**이다.
즉 **E2E 가 빨개도 룰셋은 병합을 막지 않는다.**

§1~§10 에서 6개 PR 이 전부 8/8 로 병합됐지만, 그것을 막아준 것은 저장소 규칙이 아니라
**병합 스크립트가 전 체크의 결론을 직접 센 것**이었다. 스크립트를 안 쓰거나 `gh pr merge` 를
직접 치면 그 보호는 없다.

이는 `orchestration-protocol.md` §4.1 의 *"UI 변경은 CI 초록이 유일한 증거"* 와 정합하지 않는다 —
증거로 삼겠다고 선언한 것이 **강제되지 않는다.**

**신뢰성 근거는 확보했다**: 최근 `ci.yml` 15회에서 `e2e-tests (1/3)`·`(2/3)`·`(3/3)`·
`mutation-test` **전부 15/15 success**. 불안정하지 않으므로 required 로 올려도 정상 PR 을 막지 않는다.

> **조치 보류 — 저장소 설정 변경 권한이 필요하다.** 에이전트의 룰셋 PUT 은 차단됐다.
> `e2e-merge-reports` 는 **의도적으로 제외**한다 — `if: always() && needs.e2e-tests.result != 'skipped'`
> 조건이 있어 스킵될 수 있고, 스킵된 required 체크는 영원히 pending 으로 남아 병합을 잠근다.

적용할 required 목록(기존 3종 **유지 + 추가만**):

```
backend-build · frontend-build · secret-scan          (기존)
e2e-tests (1/3) · e2e-tests (2/3) · e2e-tests (3/3)   (추가)
mutation-test                                          (추가)
```

### 11.3 ✅ 게이트 클래스 census 가 '누락'을 못 막았다

`HarnessBaselineIntegrityTest` 는 신규 게이트 클래스를 *"추가는 허용, 갱신 권장"* 이라는
**INFO 로그 한 줄**로만 알렸다. 그 결과 census 는 **'삭제' 만 막고 '누락' 은 막지 못했다** —
게이트를 새로 만들고 등재하지 않으면 census 밖에 남고, **그러면 나중에 그 게이트를 지워도
'소멸 감지'에 걸리지 않는다.** 즉 **게이트를 조용히 없앨 수 있는 경로**였다.

메타 게이트가 자기 보호 범위에 구멍을 가지면 그 아래 게이트 전부가 그만큼 약해진다.
이 린터가 표방하는 *"은폐를 불가능하게가 아니라 조용할 수 없게"* 라는 목적 자체가 무너진다.

> 가설이 아니라 실측이다. `UnreachableServiceLinterTest`(2026-08-06 신설)가 두 달 가까이 그
> 상태였고, **무관한 작업**(2026-08-07 querydsl 린터 추가) 중에 **우연히** 드러났다.
> **우연히 드러나는 구멍은 다음에는 드러나지 않는다.**

**조치**: 탐지 종류에 **'누락'** 을 추가하고 INFO → 위반으로 승격. 신설 게이트는 **같은 커밋에서
매니페스트에 등재**해야 통과한다.

**검증**(§0.7-H5 — 그린만으로는 증명이 아니다):

| # | 조건 | 결과 |
|---|---|---|
| ① | 현행(누락 0) | **green** |
| ② | 미등재 게이트 클래스 주입 | **red** (EXIT=1) — *"누락 감지 — …매니페스트에 등재되지 않았습니다: api-server/TempInjectedLinterTest"* |

---

## 12. 후속 — 같은 형태가 배포 이미지에서도 발견됐다 (2026-08-08)

§11 의 하네스 구멍을 메운 뒤 `zap-scan` 을 실제로 돌려보다가, **프론트엔드 도커 이미지가
4개월간 기동 불가**였다는 것이 드러났다. `docker build` 는 성공하므로 CI 는 계속 초록이었고,
이미지를 *띄우는* 유일한 경로(`zap-scan`)가 고장나 있어 아무도 보지 못했다.

이 문서(§1~§11)와 같은 뿌리 — **선언은 있는데 실행 경로가 없거나 죽어 있다** — 이지만
주제가 의존성 알림이 아니라 배포·CI 사각지대이므로 별도 문서로 분리했다.

→ **[verification-blindspots.md](verification-blindspots.md)**
   (발견의 연쇄 · 워크플로 실행 이력 전수 · 반복 형태 7건 · 재발 방지)


---

## 13. OWASP 스캔 첫 유효 결과 판정 (2026-08-09)

[#374](https://github.com/lkindo/egov-enterprise/pull/374) 로 CVE 스캔이 **처음으로 모듈을
실제 검사**하기 시작했다. 종전에는 루트만 스캔했고 루트가 보는 것은 빌드 도구 11종뿐이라
결과가 늘 "0건" 이었다 — 그 0 이 "안전" 으로 읽히던 지점이다.

| 모듈 | 스캔한 의존성 | 취약점 | CVSS≥7 |
|---|---:|---:|---:|
| (루트) | 11 | **0** | 0 |
| business-core | 219 | 53 | 7 |
| business-app | 220 | 53 | 7 |
| api-server | 279 | 53 | 7 |
| migration-tool | 90 | 44 | 2 |

모듈 간 중복을 제거하면 **고유 (JAR, CVE) 33쌍**이다. CVSS≥7 이 모듈당 7건으로 보이는 것은
swagger-ui JAR 하나가 번들 JS 2개(`swagger-ui-bundle.js`·`swagger-ui-es-bundle.js`)로
각각 잡히기 때문이며, 고유 기준으로는 **6건**이다.

### 13.1 CVSS ≥ 7.0 전건 판정

판정 근거는 전부 **리포트 본문의 설명과 영향 버전 범위**에서 인용했다 — 기억이나 추정이 아니다.

| JAR | CVE | CVSS | 판정 | 근거 |
|---|---|---:|---|---|
| kotlin-stdlib 1.9.25 | CVE-2026-53914 | 9.8 | **비해당** | 설명이 *"code execution was possible via unsafe deserialization in **the build cache metadata**"*. **Kotlin 빌드 캐시** 취약점이다. 이 저장소는 Kotlin 을 컴파일하지 않으며 kotlin-stdlib 은 Spring Boot BOM 이 핀한 런타임 전이 의존성이다 — 공격 경로 자체가 없다 |
| tomcat-embed-core 10.1.57 | CVE-2026-66299 | 7.5 | **비해당 · 상향 대상 없음** | 설명이 *"Apache Tomcat's **WebSocket chat example**… Users who have followed the security guidance to **remove the examples web application are not affected**"*. 임베디드 톰캣에는 examples 웹앱이 애초에 없다. 게다가 수정판 10.1.58 은 **Maven Central 미배포**(실측: 10.1.57 이 최신) — 올릴 대상이 존재하지 않는다 |
| tomcat-embed-websocket 10.1.57 | CVE-2026-66299 | 7.5 | **비해당** | 위와 동일 CVE·동일 사유 |
| swagger-ui 5.18.3 (번들 DOMPurify) | CVE-2026-65898 | 7.2 | **운영 미노출** | DOMPurify < 3.4.11 의 stored XSS. `application-prod.yml` 에서 `springdoc.api-docs.enabled: false` · `springdoc.swagger-ui.enabled: false` — 운영에 swagger-ui 가 뜨지 않는다. §13.2 참조 |
| opentelemetry-semconv 1.32.0 | CVE-2026-39883 | 7.0 | **오탐(언어 불일치)** | 설명이 *"OpenTelemetry-**Go** is the Go implementation… Darwin ioreg command… BSD kenv"*. CPE 에 `:go:` 가 박혀 있다. 우리 아티팩트는 **Java** 다 |
| opentelemetry-semconv 1.32.0 | CVE-2026-24051 | 7.0 | **오탐(언어 불일치)** | 위 CVE 가 *"the fix for CVE-2026-24051"* 로 지목한 선행 건. 동일하게 Go 구현 대상 |

> **결론: 즉시 조치가 필요한 항목은 0건이다.** 다만 그 0 은 §1 과 같은 종류의 0 이 아니다 —
> 이번엔 **279개 의존성을 실제로 검사한 뒤** 6건을 하나씩 근거를 들어 배제한 결과다.

### 13.2 조치하지 않은 것과 그 사유

- **swagger-ui (springdoc 2.8.5 → 2.8.16)**: 번들 DOMPurify 관련 22건을 한 번에 지울 수 있다.
  그러나 springdoc 은 `api-docs.json` 을 생성하는 주체이고, 이 파일은 **프론트 codegen 드리프트
  게이트**(`codegen:verify`/`codegen:verify:zod`, pre-push HARD 차단)의 입력이다.
  버전 상향이 스펙 출력을 바꾸면 게이트가 걸리므로 **단독 태스크로 분리**한다.
  운영에 노출되지 않는다는 점에서 긴급도는 낮다.
- **tomcat**: 올릴 버전이 존재하지 않는다(10.1.58 미배포). 10.1.58 배포 시 재판정.
- **kotlin-stdlib · opentelemetry-semconv**: Spring Boot BOM 관리 대상이다. 오탐/비해당을
  이유로 BOM 을 거스르는 강제 핀을 넣지 않는다 — 그 함정은 §2026-08-05 jackson 오버라이드에서
  이미 겪었다(우리가 끌어내리는 상한이 된다).

### 13.3 스캔은 여전히 게이트가 아니다 — 의도된 상태다

`dependency-check.yml` 의 스캔 스텝은 `continue-on-error: true` 이고 워크플로 이름도
**"(advisory)"** 다. `build.gradle` 의 `failBuildOnCVSS = 7` 은 따라서 **워크플로를 막지 않는다.**
막는 것은 `Verify report was actually produced` 스텝 하나이며, 이것이 지키는 것은
"취약점이 없다" 가 아니라 **"스캔이 실제로 돌았다"** 이다.

게이트로 승격하려면 §13.1 의 6건에 억제(suppression)를 넣어야 하는데,
그것은 **판정 근거를 문서에 남긴 뒤에만** 정당하다(§0.7-H2 — 목록 편집은 수정이 아니다).
이 절이 그 근거다. 승격 여부는 사용자 판단 사항으로 남긴다.

### 13.4 재현 절차

```bash
# CI 아티팩트에서 리포트를 받아 XML 을 직접 읽는다 (HTML 요약을 믿지 않는다)
gh run download <run-id> -n owasp-security-report -D ./dc
# 모듈별 스캔 의존성 수 · 취약점 수 · CVSS>=7 건수
python - <<'PY2'
import xml.etree.ElementTree as ET, glob, os
for f in sorted(glob.glob("./dc/**/dependency-check-report.xml", recursive=True)):
    root = ET.parse(f).getroot(); ns = {'d': root.tag.split('}')[0].strip('{')}
    vs = root.findall('.//d:vulnerability', ns)
    hi = sum(1 for v in vs
             if (v.find('.//d:cvssV3/d:baseScore', ns) is not None
                 and float(v.find('.//d:cvssV3/d:baseScore', ns).text) >= 7.0))
    print(os.path.relpath(f, "./dc").split(os.sep)[0],
          len(root.findall('.//d:dependency', ns)), len(vs), hi)
PY2
```

> 로컬 `./gradlew dependencyCheckAnalyze` 는 `NVD_API_KEY` 가 없으면 익명 레이트리밋에 걸려
> 사실상 완주하지 못한다(§W0-09). 판정은 **CI 아티팩트**를 기준으로 한다.
