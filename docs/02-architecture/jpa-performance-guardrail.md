# JPA 쿼리 수 가드레일

이 가드레일은 선택한 통합 테스트에서 Hibernate가 실행한 SQL 문 수를 세고, 시나리오별 상한을 넘으면 테스트를 실패시킨다. N+1 회귀를 빠르게 찾는 **테스트용 보조 장치**이며 전체 API의 성능이나 N+1 부재를 자동 보증하지 않는다.

## 구성

구현은 `business-core`의 `testFixtures`로 제공되어 다른 백엔드 모듈의 테스트가 재사용한다.

| 구성 요소 | 역할 |
|---|---|
| `QueryCountInspector` | 활성 테스트의 카운터와 SQL 목록을 `ThreadLocal`에 보관 |
| `HibernateQueryCounterInspector` | Hibernate `StatementInspector`에서 실행 SQL을 카운터에 전달 |
| `HibernateHarnessConfig` | 테스트용 Hibernate 설정에 inspector 연결 |
| `@QueryCountGuard(max = …)` | 메서드 또는 클래스에 허용 쿼리 수 선언 |
| `QueryCountGuardExtension` | JUnit 전후에 카운터를 열고, 상한 초과 시 SQL 목록과 함께 실패 |
| `ThreadLocalCopyTaskDecorator` | 프로젝트가 관리하는 executor로 카운터 컨텍스트를 전달 |

현재 연동 검증은 `business-app/src/test/java/nuri/business/harness/QueryCountGuardrailIntegrationTest.java`에 있다.

## 사용 예

```java
@Test
@QueryCountGuard(max = 8)
void listsBoardsWithinQueryBudget() {
    boardService.getBoards(PageRequest.of(0, 20));
}
```

상한은 임의의 전역 숫자가 아니라 테스트 준비 쿼리와 실제 서비스 호출 범위를 분리해 정한다. 데이터 수를 늘렸을 때 쿼리 수가 선형으로 증가하지 않는지도 함께 확인해야 한다.

## 판정 범위

가드가 잘 탐지하는 것은 다음과 같다.

- 반복 조회로 SQL 문 수가 갑자기 증가하는 회귀
- fetch join, entity graph, batch fetch 변경 전후의 쿼리 수 차이
- 프로젝트 executor를 통과하는 비동기 작업의 쿼리 누수

다음은 이 가드만으로 판단할 수 없다.

- 쿼리 한 건의 지연, 실행 계획, 인덱스 사용 여부
- 반환 행 수와 메모리 사용량
- 별도 프로세스·별도 executor·컨텍스트가 전달되지 않은 스레드의 SQL
- 애노테이션이 붙지 않은 경로의 N+1 부재
- 운영 데이터 분포에서의 실제 성능

필요하면 PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)`, 부하 테스트, 애플리케이션 메트릭을 추가 증거로 사용한다.

## 변경 시 검증

```powershell
./gradlew :business-app:test --tests nuri.business.harness.QueryCountGuardrailIntegrationTest
```

가드 자체를 변경하면 정상 시나리오가 green인 것뿐 아니라 상한을 의도적으로 낮추거나 추가 조회를 주입했을 때 red가 되는지 확인한 뒤 원복한다. 공용 `testFixtures` 변경은 이를 소비하는 모듈의 컴파일과 대상 테스트를 함께 검증한다.

---
*Verified against current test-fixture implementation: 2026-08-19*
