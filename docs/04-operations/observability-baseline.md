# 관측성 기본값 — 메트릭·JSON 로그·경보 예시

이 템플릿이 운영 관측을 위해 **이미 갖춘 것**과 **인수처가 정해야 하는 것**을 구분한다. 수집·보존 스택(PD-OPS-001)과
경보 수신처는 저장소가 정하지 않는다. 여기 적힌 수치는 모두 시작점이며 운영 트래픽으로 다시 정한다(GAP-OPS-001).

## 1. 템플릿이 기본 제공하는 것

| 축 | 제공 형태 | 정본 |
|---|---|---|
| 메트릭 노출 | api 서비스 관리 포트(9090)의 `/actuator/prometheus`. 컨테이너 네트워크 안에서만 연다(호스트 공개 금지) | [application-prod.yml](../../api-server/src/main/resources/application-prod.yml), [docker-compose.prod.yml](../../docker-compose.prod.yml) |
| 요청 제한(429) 카운터 | `security_ratelimit_rejected_total{bucket="login"\|"all"}` | [RateLimitFilter](../../business-core/src/main/java/nuri/business/security/filter/RateLimitFilter.java) |
| 로그인 실패 | 표준 요청 메트릭 `http_server_requests_seconds_count{uri="/api/v1/auth/login",status="401"}` | [로그인 통합 테스트](../../api-server/src/test/java/nuri/auth/AuthenticationControllerIntegrationTest.java) |
| 콘솔 로그 | 기본은 텍스트. `json-logs` 프로파일로 ECS JSON 전환 | [logback-spring.xml](../../api-server/src/main/resources/logback-spring.xml) |
| 첨부 점검 상태 | `nuri_attachment_integrity_enabled`·`nuri_attachment_integrity_healthy_age_seconds`·`nuri_attachment_integrity_last_run_unhealthy`·`nuri_attachment_integrity_observation_healthy` — 점검 비활성화 상태에도 등록 | [AttachmentIntegrityMetrics](../../business-core/src/main/java/nuri/business/service/file/AttachmentIntegrityMetrics.java), [상태 저장소](../../business-core/src/main/java/nuri/business/service/file/AttachmentIntegrityReportStore.java) |
| 내구 작업 상태 | `nuri_durable_work_jobs{status=...}`·`nuri_durable_work_oldest_due_age_seconds{status=...}`·`nuri_durable_work_enabled`·`nuri_durable_work_observation_healthy`·`nuri_durable_work_observation_age_seconds` — 커밋된 작업을 읽기 전용으로 집계 | [DurableWorkMetrics](../../business-core/src/main/java/nuri/business/service/system/job/DurableWorkMetrics.java), [DurableJobRepository](../../business-core/src/main/java/nuri/business/domain/system/job/DurableJobRepository.java), [후속 작업 재처리](durable-work-recovery.md) |
| 내구 작업 실패 카운터 | `nuri_durable_work_failed_total{type=...}` — 실행기가 재시도 예산 소진에 따른 FAILED 전이를 기록한 보조 신호. 재기동 전 누적 실패와 시도 예산이 이미 소진된 임대 회수는 상태 gauge로 확인 | [DurableWorkDispatcher](../../business-core/src/main/java/nuri/business/service/system/job/DurableWorkDispatcher.java) |
| OTLP 메트릭 push | 기본 꺼짐. `OTLP_METRICS_EXPORT_ENABLED=true` 와 `OTLP_METRICS_URL` 로 켠다(Boot 4 자체 기본값은 켜짐이라 설정으로 끈다) | [application.yml](../../api-server/src/main/resources/application.yml), [OtlpMetricsExportOptInTest](../../api-server/src/test/java/nuri/api/config/OtlpMetricsExportOptInTest.java) |
| 경보 규칙 예시 | 429 지속·로그인 실패 급증·첨부 점검 상태 4건·내구 작업 상태 3건, 총 9건 | [prometheus-alert-rules.yml](../../config/observability/prometheus-alert-rules.yml) |

⚠ 요청 제한 필터는 HTTP 관측 필터보다 먼저 응답을 끝낸다. 그래서 **429 는 `http_server_requests` 에 나타나지 않는다.**
429 추세는 반드시 전용 카운터로 본다.

## 2. JSON 로그 켜기

수집기(Filebeat·Fluent Bit·Loki 등)를 붙일 때 운영 오버레이의 프로파일에 `json-logs` 를 더한다.

```yaml
# docker-compose.prod.yml — api.environment
SPRING_PROFILES_ACTIVE: prod,json-logs
```

- 형식은 ECS(Elastic Common Schema)이며 MDC 의 `traceId`·`spanId` 가 함께 실린다. `logging.structured.format.console`
  에 `logstash`·`gelf` 를 주면 그 형식을 쓴다.
- `prod` 를 빼지 않는다. `ConfigSafetyLinterTest` 가 운영 오버레이에 `prod` 가 있는지 검사한다.
- 프로파일 이름을 잘못 적으면 **텍스트 로그로 남는다**. 로그가 사라지는 실패는 나지 않는다. 켠 뒤 `docker logs` 첫 줄이 `{` 로 시작하는지 확인한다.
- 환경변수 값으로 형식을 고르게 하지 않은 이유는 [logback-spring.xml](../../api-server/src/main/resources/logback-spring.xml) 머리주석에 있다.
  logback 은 값으로 appender 를 고를 수 없어, 오타가 나면 로그를 통째로 잃는 설계가 된다.

## 3. 경보 규칙 적재

1. Prometheus 가 egov-net 안에서 api 서비스 관리 포트(9090)의 `/actuator/prometheus` 를 스크레이프하도록 설정한다.
2. `rule_files` 에 [prometheus-alert-rules.yml](../../config/observability/prometheus-alert-rules.yml) 을 넣는다.
3. 적재 전에 고정 digest의 Prometheus 2.55.1 `promtool`로 문법과 합성 시계열의 발화·해제를 확인한다.

```bash
npm run verify:alerts
```

[실행기](../../scripts/run-prometheus-alert-tests.mjs)는 로컬 Docker daemon에서
`prom/prometheus@sha256:2659f4c2ebb718e7695cb9b25ffa7d6be64db013daba13e05c875451cf51b0d3`를 사용한다.
규칙 디렉터리를 읽기 전용으로 연결하고 네트워크 없이 `check rules`와
`test rules`를 차례로 실행한다. [합성 시계열](../../config/observability/prometheus-alert-rules.test.yml)은
12개 테스트 그룹으로 임계값·지속 시간 전후의 침묵과 발화, 상태 해제, 복제본 집계를 검사한다.

2026-10-01 로컬 검증은 `SUCCESS: 9 rules found`와 12개 테스트 그룹 통과였다. 운영 Prometheus 적재,
실제 장애 주입, Alertmanager 전달은 실행하지 않았다. 수신자·채널·억제 규칙은 인수처가 정한다.

| 경보 | 조건(시작점) | 먼저 볼 것 |
|---|---|---|
| `EgovRateLimitRejectionsSustained` | bucket별 분당 429가 30건을 넘는 상태가 10분 지속 | api 로그의 `[RATE-LIMIT]` 줄(ip·uri). 한도를 방금 낮췄다면 한도 부족을 먼저 의심한다 |
| `EgovLoginFailureSpike` | 분당 로그인 401이 20건을 넘는 상태가 5분 지속 | 같은 시각의 `bucket=login` 429 여부, 특정 계정 집중 여부 |
| `EgovAttachmentIntegrityNoHealthyRun` | 마지막 PASS 또는 최초 활성화 후 26시간 초과 상태가 5분 지속 | `health.json`의 최초 활성화·PASS 시각과 `latest.json`의 결과. 활성화 후 한 번도 실행되지 않은 상태도 포함한다 |
| `EgovAttachmentIntegrityDisabled` | `nuri_attachment_integrity_enabled=0`인 상태가 5분 지속 | `ATTACHMENT_INTEGRITY_ENABLED` 설정과 기관의 점검 정책 |
| `EgovAttachmentIntegrityUnhealthy` | 최근 실행이 DRIFT·INCOMPLETE·FAILED·REPORT_FAILED인 상태가 5분 지속 | `latest.json`의 결과와 저장소 상태. PASS 시각을 미완료 실행 시각으로 덮지 않는다 |
| `EgovAttachmentIntegrityObservationFailed` | 활성 점검의 상태 복원·재저장 또는 결과 기록 실패가 5분 지속 | 진단 디렉터리 권한·링크·디스크와 `health.json`의 형식·크기. 비활성화는 별도 경보가 본다 |
| `EgovDurableWorkFailed` | 커밋된 FAILED 작업이 1건 이상인 상태가 5분 지속 | `DWORK_READ`로 실패 작업을 조회하고 원인을 고친 뒤 `DWORK_RETRY`로 재처리한다 |
| `EgovDurableWorkDueBacklog` | PENDING·RETRY의 예정 시각 또는 RUNNING의 임대 만료 시각이 15분 이상 지난 상태가 5분 지속 | 실행기·전달 채널과 시도 예산. 미래 예약·재시도 대기·유효 임대는 제외한다 |
| `EgovDurableWorkObservationFailed` | 집계 실패 또는 마지막 정상 집계 후 90초 초과 상태가 5분 지속 | DB 연결·읽기 권한·집계 제한 시간과 갱신 실행 경로. 이전 정상 집계 값은 유지한다 |

첨부 상태 파일은 진단 디렉터리의 고정 이름 `health.json`에 집계 값만 저장한다. 최초 활성화 시각·마지막 PASS
시각·최근 실행 실패 여부는 재기동 후에도 유지되므로, 미실행 유예가 다시 시작되거나 DRIFT가 PASS로 바뀌지 않는다.
`last-complete.json`은 완주한 DRIFT도 담으므로 마지막 정상 PASS의 근거로 쓰지 않는다. 상태 파일은 4 KiB 상한,
링크를 따르지 않는 읽기, 원자 교체를 사용한다. 비활성화 상태에서는 네 상태 gauge를 0으로 노출하고 파일을
읽거나 쓰지 않는다. 잘못된 상태 파일과 복원 후 쓰기 실패는 정상 관측으로 처리하지 않는다.

내구 작업 집계는 기본 30초마다 수행하고, 스크레이프는 DB를 조회하지 않는다. 상태 라벨은
`PENDING`·`RUNNING`·`RETRY`·`SUCCEEDED`·`FAILED` 다섯 개로 한정하며 작업 ID·업무 유형·본문을 넣지 않는다.
실행기가 꺼져 있어도 상태 집계는 계속되므로 오래된 FAILED와 만료 임대가 남는다. 이미 시도 예산을 소진한
RUNNING이 FAILED로 전환되어 전이 카운터가 오르지 않는 경로도 상태 gauge에 반영된다. DB 조회 실패 시 이전 값과
마지막 정상 집계 시각을 보존하고 관측 실패를 함께 노출한다. 공유 DB의 복제본 값은 `max by (application)` 또는
`max by (application, status)`로 집계하여 중복 합산하지 않는다.

## 4. 드리프트 방지

Prometheus 경보는 메트릭 이름이나 라벨이 틀려도 오류를 내지 않고 조용해질 뿐이다. 다음 검증이 이 결속을 지킨다.

- [observability-alert-rules 계약](../../scripts/observability-alert-rules-contract.test.mjs)은 경보가 참조하는 메트릭·라벨·라벨 값을
  원천 코드와 테스트에 대조한다. `npm run test:operational-contracts` 로 실행되며 CI 는 required `secret-scan` 이 돌린다.
- `RateLimitFilterTest` 는 Prometheus 레지스트리의 실제 scrape 출력으로 카운터 이름을 고정한다.
- `AuthenticationControllerIntegrationTest` 는 실패한 로그인 요청이 `uri`·`status` 태그로 기록되는지 확인한다.
- [AttachmentIntegritySchedulerTest](../../business-core/src/test/java/nuri/business/service/file/AttachmentIntegritySchedulerTest.java)는 실제 Prometheus 노출 이름과 비활성화·미실행·초기 실패·PASS 후 DRIFT 재기동·상태 파일 오류를 확인한다.
- [DurableWorkIntegrationTest](../../api-server/src/test/java/nuri/api/schema/DurableWorkIntegrationTest.java)는 격리 PostgreSQL의 누적 FAILED·재기동·미래 예약과 만료 임대·소진된 시도 예산·DB 조회 실패 및 스크레이프의 조회 부재를 확인한다.
- `LogbackConsoleFormatTest` 는 텍스트·ECS·형식 재정의 세 경로의 encoder 와 실제 출력을 고정한다.

required CI의 [`secret-scan`](../../.github/workflows/ci.yml)은 Node 운영 계약과 `npm run verify:alerts`를 모두
호출하도록 연결되어 있다. 경보 계약은 메트릭·라벨·실제 scrape 근거 삭제와 복제본 `max`의 `sum` 치환뿐 아니라,
고정 이미지 digest·`test rules` 호출·package 명령·required CI 실행 단계가 빠져도 red가 되는지 검사한다.
2026-10-01 로컬 Node 계약 6개, 첨부 스케줄러 테스트 8개, 격리 PostgreSQL 내구 작업 테스트 13개도 통과했다.
실제 `promtool`에서도 FAILED 임계값을 의도적으로 999로 바꾸면 발화 기대가 실패했고, 원복 후 9개 규칙·12개 그룹이
다시 통과했다. 이 로컬 결과는 required CI 실행 결과나 운영 수집·전달 성공의 증거를 대신하지 않는다.

새 메트릭으로 경보를 만들려면 계약의 `METRIC_BINDINGS` 에 원천과, 노출 이름·태그를 실제로 확인한 테스트를 함께 등록한다.

## 5. 제공하지 않는 것

- 로그 수집·보존 스택과 보존 기간: [PD-OPS-001](pending-decisions.md), [로그 보존 정책](log-retention-policy.md)
- 대시보드, Alertmanager 설정, 온콜 책임
- 운영 규모에서 정한 임계값: [GAP-OPS-001](../../.agent/memory/known-gaps.md)
