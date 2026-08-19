# E2E 밖의 검증 선택 가이드

Playwright E2E는 브라우저 사용자 흐름을 검증하지만 서비스 분기, DB 물리 스키마, 동시성, 부하, 의존성 취약점까지 대신하지 않는다. 이 문서는 현재 저장소에 실제로 연결된 검증 층을 고르는 보조 지도다. 전체 테스트 구조와 명령은 [테스트 가이드](testing-guide.md), 병합 강도는 [.github/required-checks.json](../../.github/required-checks.json)을 따른다.

## 검증 층 선택

| 확인할 것 | 우선 검증 | 현재 진입점 | 남는 한계 |
|---|---|---|---|
| 순수 도메인 분기·변환 | JUnit 단위 테스트 | 해당 모듈 `test --tests ...` | Spring wiring·DB dialect |
| service·repository·web 계약 | Spring 통합/MockMvc | 모듈별 `test`, `@IntegrationTest` | 대부분 H2이므로 PostgreSQL 물리 정합 |
| Flyway ↔ JPA 물리 스키마 | PostgreSQL Testcontainers | `./gradlew :api-server:schemaValidationTest` | 운영 데이터·실제 cutover |
| 아키텍처·인가·계약 규칙 | ArchUnit·정적 하네스 | `./gradlew :api-server:harnessTest` | 동적 공격·미스캔 경로 |
| 테스트의 결함 탐지력 | PIT mutation | 관련 Gradle PIT task, required `mutation-test` | 로컬 기본 실행은 CI strict 강도와 다를 수 있음 |
| 브라우저 흐름·접근성·console | Playwright | 관련 spec, CI E2E shard | 미방문 화면·백그라운드 내부 상태 |
| API 부하·지연 분포 | k6 | `test/load-tests/`, [부하 테스트 가이드](../04-operations/load-test-guide.md) | 대상 환경·계정·데이터 조건 |
| 시크릿·의존성 취약점 | gitleaks·pnpm audit·Dependency-Check | CI/주간 workflow | 외부 DB·network 실패 시 unverified 가능 |

## 변경 유형별 판단

### 비동기 이벤트·스케줄 작업

- 요청 성공만 확인하지 말고 listener의 영속 효과 또는 외부 adapter 호출을 관측한다.
- 현재 사용 중인 Spring event와 executor 경계에 맞는 테스트를 작성한다.
- 고정 `sleep`으로 통과 시간을 맞추지 말고, 완료 신호 또는 제한된 polling을 사용한다.
- MQ, Outbox, GreenMail 같은 도구는 실제 의존성과 실행 경로를 도입한 경우에만 문서와 테스트에 적는다.

### 동시 쓰기

- 동일 자원 갱신, 중복 생성, idempotency가 요구되는 경로만 병렬 테스트 대상으로 고른다.
- thread 수나 허용 지연을 임의의 전역 기준으로 만들지 말고 도메인 불변식과 대상 환경 용량을 근거로 정한다.
- 단위 mock 대신 실제 transaction·constraint가 필요한 경우 격리된 PostgreSQL 통합 테스트를 사용한다.

### 외부 연동 장애

- client timeout, 오류 매핑, 재시도 가능성, 멱등성을 계약으로 분리한다.
- 실제 client가 주입 가능한 경계에서 5xx·timeout·잘못된 payload를 재현한다.
- WireMock·MockWebServer·Resilience4j는 현재 저장소에 있다는 가정으로 예시 코드를 복사하지 않는다. 필요하면 의존성·테스트·CI 비용을 함께 설계한다.

### 대용량·성능

- 기능 테스트에서 임의 `System.gc()`와 heap 차이 한 번으로 memory leak을 판정하지 않는다.
- query count·batch/chunk 경계는 JPA 성능 테스트, 사용자 지연·처리량은 k6로 분리한다.
- threshold는 실제 SLO와 환경 정보를 가진 script/config를 정본으로 두고 문서에 다른 숫자를 복제하지 않는다.

### 보안

- controller annotation 존재만 확인하지 말고 미인증·권한 부족·타인 객체·관리자 우회 불가 경로를 음성 테스트한다.
- URL 수준 인가와 service 소유권 검증을 별도 방어선으로 확인한다.
- 정적 하네스는 실제 exploit·CSRF/CORS/cookie 동작을 완전히 증명하지 않으므로 관련 MockMvc 또는 E2E를 조합한다.

### DB migration

- H2 `create-drop` green을 Flyway/PostgreSQL 정합 증거로 사용하지 않는다.
- Expand와 Contract의 구버전 호환은 release 단위로 분리해 검증한다.
- `schemaValidationTest`는 빈 DB에 현재 migration을 적용하는 증거이며 운영 데이터 backfill·lock·rollback을 대신하지 않는다.

## 실행 예시

```bash
# 표적 백엔드 테스트
./gradlew :business-app:test --tests '*TargetTest'

# 아키텍처·계약 하네스
./gradlew :api-server:harnessTest

# PostgreSQL 물리 스키마(Docker 필요)
./gradlew :api-server:schemaValidationTest

# 프런트 정적·단위 검증
pnpm -C frontend exec tsc --noEmit
pnpm -C frontend vitest run <target>

# 관련 브라우저 spec
pnpm -C frontend exec playwright test <spec>
```

## 완료 보고

검증 대상, 사용한 층, 실행 명령, 결과, 의도적으로 제외한 범위를 함께 기록한다. 도구가 설치되어 있지 않거나 외부 환경이 없으면 `not-run`/`blocked-external`로 남기고, 예제 코드만으로 “하네스 도입 완료”라고 표현하지 않는다.
