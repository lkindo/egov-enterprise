# 관측성 기본값 — 메트릭·JSON 로그·경보 예시

이 템플릿이 운영 관측을 위해 **이미 갖춘 것**과 **인수처가 정해야 하는 것**을 구분한다. 수집·보존 스택(PD-OPS-001)과
경보 수신처는 저장소가 정하지 않는다. 여기 적힌 수치는 모두 시작점이며 운영 트래픽으로 다시 정한다(GAP-OPS-001).

## 1. 템플릿이 기본 제공하는 것

| 축 | 제공 형태 | 정본 |
|---|---|---|
| 메트릭 노출 | 관리 포트 `api:9090/actuator/prometheus`. 컨테이너 네트워크 안에서만 연다(호스트 공개 금지) | [application-prod.yml](../../api-server/src/main/resources/application-prod.yml), [docker-compose.prod.yml](../../docker-compose.prod.yml) |
| 요청 제한(429) 카운터 | `security_ratelimit_rejected_total{bucket="login"\|"all"}` | [RateLimitFilter](../../business-core/src/main/java/nuri/business/security/filter/RateLimitFilter.java) |
| 로그인 실패 | 표준 요청 메트릭 `http_server_requests_seconds_count{uri="/api/v1/auth/login",status="401"}` | [로그인 통합 테스트](../../api-server/src/test/java/nuri/auth/AuthenticationControllerIntegrationTest.java) |
| 콘솔 로그 | 기본은 텍스트. `json-logs` 프로파일로 ECS JSON 전환 | [logback-spring.xml](../../api-server/src/main/resources/logback-spring.xml) |
| 경보 규칙 예시 | 429 지속·로그인 실패 급증 2건 | [prometheus-alert-rules.yml](../../config/observability/prometheus-alert-rules.yml) |

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

1. Prometheus 가 egov-net 안에서 `api:9090` 의 `/actuator/prometheus` 를 스크레이프하도록 설정한다.
2. `rule_files` 에 [prometheus-alert-rules.yml](../../config/observability/prometheus-alert-rules.yml) 을 넣는다.
3. 적재 전에 문법을 확인한다.

```bash
docker run --rm --entrypoint /bin/promtool -v "$PWD/config/observability:/rules:ro" \
  prom/prometheus:v2.55.1 check rules /rules/prometheus-alert-rules.yml
```

2026-09-14 실측 결과는 `SUCCESS: 2 rules found` 였다. Alertmanager 라우팅(수신자·채널·억제 규칙)은 인수처가 정한다.

| 경보 | 조건(시작점) | 먼저 볼 것 |
|---|---|---|
| `EgovRateLimitRejectionsSustained` | bucket별 분당 429가 30건을 넘는 상태가 10분 지속 | api 로그의 `[RATE-LIMIT]` 줄(ip·uri). 한도를 방금 낮췄다면 한도 부족을 먼저 의심한다 |
| `EgovLoginFailureSpike` | 분당 로그인 401이 20건을 넘는 상태가 5분 지속 | 같은 시각의 `bucket=login` 429 여부, 특정 계정 집중 여부 |

## 4. 드리프트 방지

Prometheus 경보는 메트릭 이름이나 라벨이 틀려도 오류를 내지 않고 조용해질 뿐이다. 그래서 다음 세 가지가 이 결속을 지킨다.

- [observability-alert-rules 계약](../../scripts/observability-alert-rules-contract.test.mjs)은 경보가 참조하는 메트릭·라벨·라벨 값을
  원천 코드와 테스트에 대조한다. `npm run test:operational-contracts` 로 실행되며 CI 는 required `secret-scan` 이 돌린다.
- `RateLimitFilterTest` 는 Prometheus 레지스트리의 실제 scrape 출력으로 카운터 이름을 고정한다.
- `AuthenticationControllerIntegrationTest` 는 실패한 로그인 요청이 `uri`·`status` 태그로 기록되는지 확인한다.
- `LogbackConsoleFormatTest` 는 텍스트·ECS·형식 재정의 세 경로의 encoder 와 실제 출력을 고정한다.

새 메트릭으로 경보를 만들려면 계약의 `METRIC_BINDINGS` 에 원천과, 노출 이름·태그를 실제로 확인한 테스트를 함께 등록한다.

## 5. 제공하지 않는 것

- 로그 수집·보존 스택과 보존 기간: [PD-OPS-001](pending-decisions.md), [로그 보존 정책](log-retention-policy.md)
- 대시보드, Alertmanager 설정, 온콜 책임
- 운영 규모에서 정한 임계값: [GAP-OPS-001](../../.agent/memory/known-gaps.md)
