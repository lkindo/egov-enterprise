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
| 70, 71 | `querydsl-jpa` / `querydsl-apt` 5.1.0 | **high** (CVSS 8.2, CVE-2024-49203) | 취약 범위(`<= 5.1.0`)에 **실제로 포함되며 패치 버전이 없다**. 그러나 **취약 패턴이 저장소에 없다** — 취약 조건은 사용자 입력을 `PathBuilder` 로 경로화해 `OrderSpecifier` 에 넣는 것인데, `PathBuilder` 사용처 **0건**이고 유일한 `OrderSpecifier` 사용처([BoardRepositoryImpl.java:71](../../business-app/src/main/java/nuri/business/domain/board/BoardRepositoryImpl.java#L71))는 `condition.getOrderBy()` 를 **화이트리스트 `switch`** 로 컴파일타임 Q-클래스 경로에만 매핑한다. ⚠ **QueryDSL 로 정렬을 추가할 때 이 조항을 다시 읽을 것** |
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

## 5. 남은 과제

1. **알림 상태 정리** — 위 65건은 GitHub 상에서 여전히 `open` 이다. `inaccurate` 사유로 닫으려면
   **사용자 승인이 필요하다**(외부에 드러나는 보안 상태 변경이고, 대량 dismissal 은 그 자체로
   §0.7-H2 가 경계하는 행위다). 이 문서가 그 판단의 증적이다.
2. **그래프 노이즈 축소** — `dependency-submission` 이 pitest·testCompile·annotationProcessor 등
   전 configuration 을 제출해 요청측 좌표까지 알림이 된다. 런타임 classpath 로 한정하면
   위양성이 구조적으로 줄어든다. 다만 **테스트 전용 의존성의 CVE 가시성을 잃는 대가**가 있어
   상충하므로 단독 결정하지 않는다.
3. **`spring-ai` 재검토** — `1.0.0-M5`(정식 이전 마일스톤)가 `foundation` 의 `api` 스코프로
   전 모듈·배포 아티팩트에 실려 있다. 그런데 `ApiServerApplication` 은 `OpenAiAutoConfiguration` 을
   **명시적으로 제외**하고 있고, 실사용처는 테스트 픽스처의 목(mock) 2개뿐이다
   ([TestAiConfig.java](../../business-core/src/testFixtures/java/nuri/business/test/config/TestAiConfig.java)).
   webflux 12건을 포함해 상당수 알림의 유입원이며, 제거하면 공급망 표면이 줄어든다.
   **다만 AI 기능 도입 계획이 있는지는 제품 결정이므로 사용자 판단이 필요하다.**

---
*근거 데이터: `dependabot/alerts` API(2026-08-07) + `:module:dependencies` 전 모듈 실측 + `dependency-graph/sbom`*
