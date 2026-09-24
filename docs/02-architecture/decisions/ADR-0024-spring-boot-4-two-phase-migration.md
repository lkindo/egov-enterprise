# ADR-0024 — Spring Boot 4.1 두 단계 전환

- 상태: Accepted
- 결정일: 2026-09-24
- 승인 범위: GAP-DEP-002 라인 결정 ⓐ(OSS 라인 전환)를 두 단계로 나눈 권장안 — 사용자 승인(2026-09-24 "권장안으로 진행")
- 관련: [GAP-DEP-002](../../../.agent/memory/known-gaps.md), [Boot 4 호환 실측](../../04-operations/readiness-followups.md#spring-boot-4-호환-실측), [SAST 예외 재검토](../../04-operations/sast-findings-review.md)

## 맥락

Spring Boot 3.5 라인의 OSS 지원은 2026-06-30에 끝났고 3.5.16이 마지막 공개 패치다. 2026-09-20 주간 NVD 검사에서
Spring Framework 6.2.19·Security 6.5.11·Integration 6.5.10의 CVSS 7 이상 16건이 나왔고, 6.2·6.5 라인에는 공개
수정판이 없다. 상용 지원은 도입 기관이 각자 선택할 축이라 이 저장소가 내릴 수 있는 결정이 아니다.

2026-09-23·24 프로브 실측에서 Boot 4.1.1로 올리는 비용은 두 축에 몰려 있었다. JUnit 6은 코드 비용이 거의 없었다.
Jackson 3은 본체 11파일·테스트 64파일에 걸치지만 Boot 4의 Jackson 2 호환 모듈로 뒤로 미룰 수 있었다. 호환 모듈을
붙인 상태에서 전체 테스트·하네스·실제 PostgreSQL 스키마 검증·PIT·격리 E2E가 유지되고 `api-docs.json`이 같았다.

## 결정

1. **1단계 — Boot 4.1.1 + Jackson 2 호환.** Spring Framework 7.0.9·Security 7.1.1·Hibernate 7.2·Tomcat 11·JUnit 6·
   Testcontainers 2·springdoc 3.1.1·Spring Boot Admin 4.1.2로 올린다. HTTP 변환기는 호환 모듈
   `spring-boot-jackson2`(Boot 4에서 deprecated)에 두고(`spring.http.converters.preferred-json-mapper: jackson2`),
   WebSocket(STOMP) 메시지 변환도 같은 매퍼에 둔다(`spring.websocket.messaging.preferred-json-mapper`). 앱의 Jackson
   설정은 `spring.jackson2.*`로 같은 값을 준다. API wire 계약은 바뀌지 않는다.
2. **테스트는 운영과 같은 변환기를 쓴다.** api-server의 테스트 `application.yml`은 main의 같은 이름 파일을 가리므로,
   매퍼 선택을 테스트 설정에도 두고 그 일치를 테스트로 고정한다. 선택이 테스트에만 빠지면 Boot 4 기본값(Jackson 3)이
   적용돼 테스트와 운영이 서로 다른 변환기를 검증한다.
3. **2단계 — Jackson 3 이행**은 별도 변경이다. 본체·테스트의 `com.fasterxml.jackson.databind` 사용, standalone
   MockMvc의 Jackson 2 변환기, 호환 모듈과 `spring.jackson2.*`·매퍼 선택 설정을 함께 걷는다. 4.1 라인의 OSS 지원
   종료(2027-07-31) 전 다음 라인 전환보다 먼저 끝낸다. 두 매퍼에서 해석이 갈리던 `MemoInstructionRequest`의
   `JsonNode` 위임 생성자는 1단계에서 미리 `Object` 위임으로 바꿔 두 매퍼 모두에서 같게 동작하게 했다.
4. **조용히 바뀌는 동작은 이 변경에서 막는다.** 테스트가 통과한 채로 달라지는 항목을 코드와 계약으로 고정한다.
   - Jackson 설정 키: `spring.jackson2.*`를 빠뜨리면 알 수 없는 필드 거부가 풀린다.
   - 추적: `spring-boot-starter-opentelemetry`가 없으면 Tracer가 생기지 않아 로그 traceId와 OTLP 내보내기가 사라진다.
   - Flyway: `spring-boot-starter-flyway`가 없으면 마이그레이션 자동 설정이 없다.
   - 스케줄러: Boot는 `TaskScheduler` 빈이 하나라도 있으면 기본 스케줄러를 만들지 않는다. WebSocket 브로커의
     스케줄러 때문에 `@Scheduled` 작업이 `MessageBroker-*`에서 돌았으므로, Boot 기본값과 같은 빌더로 `taskScheduler`를
     명시한다. Boot의 `DefaultTaskSchedulerConfiguration`은 `@ConditionalOnBean`이라 사용자 설정에서 import하면
     조용히 만들어지지 않으므로 쓰지 않는다.
   - Hibernate Validator 9: 컨테이너에 붙인 `@Valid`(HV000271, deprecated)를 원소 타입으로 옮긴다. Spring 7의 메서드
     검증은 원소 타입 애노테이션으로도 켜진다. 입력 계약 게이트는 원소 타입 `@Valid`를 요구하고 컨테이너 쪽은 거부한다.
   - Null 애노테이션: Spring 7이 deprecated로 둔 `org.springframework.lang`을 JSpecify로 옮긴다. JSpecify는 TYPE_USE
     전용이라 springdoc이 필드 선언에서 읽지 못하는 곳은 `@Schema(requiredMode)`로 문서 계약을 보존한다. 한정 이름
     중간에 애노테이션을 끼우는 형태(`pkg.@Nullable Type`)는 import 기반 스캐너가 의존을 놓치므로 쓰지 않는다.
5. **버전 고정 정리.** 4.1.1 BOM 값과 같아진 log4j2·opentelemetry·mariadb 고정, Jackson 3 좌표를 가리키게 된 jackson-bom
   고정, JUnit 5 강제 고정을 걷는다. Tomcat 고정은 11.0.26으로 옮긴다 — BOM의 11.0.24에 10.1.x에서 막았던 Critical
   3건이 그대로 걸린다. `-Werror -Xlint:deprecation`은 유지한다.
6. **바꾸지 않는 것.** API·DB 스키마, 인가 의미, 테스트·커버리지 임계값, required context 6개와 CodeQL 차단 기준은
   그대로다. SAST 오탐 예외는 보완 소스 해시만 재검토 후 재결속한다.

## 검증과 한계

검증 결과와 부정 검증은 변경 PR과 [실측 기록](../../04-operations/readiness-followups.md#1단계-적용-결과-2026-09-24)에 남긴다.
이 ADR은 다음을 증명하지 않는다.

- eGovFrame 5.0.0은 Spring 6 기준으로 빌드됐다. 런타임 확인은 본체가 쓰는 암호 계열(ARIA·비밀번호 인코더)과 컨텍스트
  기동 범위다.
- `spring-boot-jackson2`와 `spring-boot-starter-test-classic`은 이행용이다. 호환 모듈의 제거 버전은 확인하지 않았다.
- `spring-retry`는 Boot 4 BOM 관리에서 빠져 2.0.13을 명시한다. Framework 7 core retry로 옮길지는 별도 과제다.
- 16건 CVE의 소멸은 다음 주간 NVD 실행으로 확인한다. 운영 배포 증거는 도입 기관의 몫이다.

헌법 감사 범위는 백엔드 제6조(응답 계약 — `api-docs.json` 불변)와 제11조(보안 검증 보존 — 인가 관리자·JWT 로직 불변,
SAST 예외 재검토)이며 DB 헌법의 물리 스키마는 변경 대상이 아니다.
