# PITest 점진적 Mutation Testing 연동

이 문서는 [백엔드 헌법 제16조](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)의 핵심 서비스 Mutation Score 75% 하한을 실행하는 경로를 설명한다. mutation score는 주입한 코드 변화에 대한 테스트의 탐지력이며 시스템 정확성 전체의 증명은 아니다.

## 현재 실행 계약

설정의 정본은 [루트 build.gradle](../../build.gradle), CI 스코프는 [ci.yml](../../.github/workflows/ci.yml)과 [gate registry](../../config/governance/gates.json)다. 전체 Gradle 설정을 문서에 복제하지 않고 실행에 필요한 경계만 요약한다.

| 항목 | 현재 계약 |
|---|---|
| 엔진·플러그인 | PIT 엔진 `1.25.9` 명시 고정, 루트 Gradle 플러그인 `1.19.0`, JUnit 5 플러그인 `1.2.1`; 하위 Java 모듈에 공통 적용 |
| 대상 | `PIT_TARGET_CLASSES`·`PIT_TARGET_TESTS`의 쉼표 구분 클래스명 glob. 미설정 시 각각 `nuri.*` |
| CI | 제품 8개 스코프(`mutation-scope`)와 이관 도구 2개 스코프(`mutation-scope-migration`, DEC-OPS-104)를 병렬 실행하고 안정 required context `mutation-test`가 두 잡을 집계 |
| 하한 | `STRICT_MUTATION=true`일 때 75%, 미설정 로컬 실행은 threshold 0의 리포트 모드. `CI=true`만으로 활성화되지 않음 |
| 빈 모집단 | `failWhenNoMutations = true`이므로 대상 오타·과도한 제외로 mutation이 0건이면 로컬도 실패 |
| 결과 | 모듈별 `build/reports/pitest`의 HTML/XML; 정확한 하위 경로는 해당 실행 출력 확인 |
| 실행 오류 | 기존 `pitest` 후처리가 해당 태스크 `reportDir/mutations.xml`을 검사한다. `RUN_ERROR` 또는 누락·손상·빈 XML이면 로컬 리포트 모드도 실패한다. `TIMED_OUT`의 기존 PIT 판정과 75% 하한은 유지한다. |
| 변이 재계산 | `enableDefaultIncrementalAnalysis = false`, history 입출력·CI 전용 캐시 없음. PIT가 실행되는 선택 스코프의 변이를 이전 판정 재사용 없이 재계산 |

기존 `business-core-auth` 스코프는 인증·로그인·보안 유틸에 더해 `MenuService`, `EgovAuthenticationProvider`, business-core의 `RateLimitFilter` 세 클래스를 명시적으로 검사한다. 메뉴 순환·배치의 최종 부모 그래프, 비밀번호/계정 상태/인증 장애 구분, 요청 한도 분기의 테스트 탐지력을 확인하기 위한 범위다. 기존 `business-app` 스코프는 `SurveyResultService` 한 클래스를 추가해 제출자·중복·기간·문항/항목 소속 검증과 응답 표시의 선택항목 노출 경계를 검사한다. 패키지 전체나 새 잡을 추가하지 않으며 기존 테스트 glob과 75% 하한을 유지한다. 기존 registry/workflow 계약은 양쪽의 일치를 검사하고, 네 경계를 양쪽에서 함께 제거해도 실패한다.

이 클래스들의 PIT 결과가 실제 PostgreSQL 행 잠금·native SQL·트랜잭션 원자성을 대신하지는 않는다. 특히 메뉴 순환의 무한 반복 mutant는 timeout으로 탐지될 수 있으므로 결과의 `KILLED`와 `TIMED_OUT`을 구분하고 관련 DB 통합 테스트 증거를 함께 남긴다. 대상 편입은 실행 성공이나 점수 확보의 증거가 아니며 해당 변경 SHA의 리포트와 소요시간으로 판정한다.

PIT 1.25.9도 [RUN_ERROR를 detected로 합산](https://github.com/hcoles/pitest/blob/1.25.9/pitest/src/main/java/org/pitest/mutationtest/DetectionStatus.java)하므로 점수와 종료 코드만으로 minion 충돌을 통과시킬 수 있다. 기존 태스크의 XML 후처리가 이를 별도로 거절하며 새 CI 잡이나 점수 재계산을 추가하지 않는다. 실행 직전 해당 모듈의 생성 디렉터리 안에 있는 기존 `mutations.xml` 한 파일만 제거하고, 실행 후 새 XML을 요구해 이전 보고서 재사용을 막는다. 보존할 보고서는 재실행 전에 별도 증거 경로로 복사한다. XML은 현재 태스크의 고정 보고서 경로에서 읽고 DTD·외부 엔티티·외부 스키마 접근을 차단한다. JVM 충돌은 원래 보고서와 안전하게 요약한 충돌 근거를 보존하고, 후속 실행이 성공해도 이전 충돌을 테스트 탐지로 바꾸어 기록하지 않는다.

엔진 변경의 표적 근거는 동일 Windows JDK 21.0.9·대상·테스트에서 `AuthorizationDto.Grant.compareTo`의 두 변이가 1.22.1에서 두 번의 native `RUN_ERROR`를 냈으나 1.25.9에서는 같은 변이 식별자로 `KILLED`가 된 비교다. [1.25.9 릴리스](https://github.com/hcoles/pitest/releases/tag/1.25.9)에는 record 로딩 보정이 포함된다. 이 비교가 JVM 충돌의 근본 원인을 확정하거나 나머지 CI 스코프 통과를 증명하지는 않는다. 엔진의 필터도 달라질 수 있으므로 후속 리포트에서는 점수뿐 아니라 대상·변이 식별자·모집단과 실행 오류를 확인한다.

history 플러그인은 추가하지 않는다. 이전 [history 기반 최적화](https://pitest.org/quickstart/incremental_analysis/)가 생략하던 변이 실행을 다시 수행하므로 반복 실행 비용이 늘 수 있다. 변경 영향에 따른 기존 스코프 선택은 유지하며, 선택된 스코프 전체의 재계산 시간은 해당 실행에서 측정한다. 표적 클래스의 실행 시간을 전체 CI 성능으로 일반화하지 않는다. 엔진 pin과 history 비활성화는 기존 PIT 모집단 계약이 함께 검사한다.

## 클래스 제외와 classpath

`excludedClasses`는 설정·예외·지원 코드 및 DTO/VO/DAO/Mapper/Request/Response/Entity의 명시 패턴을 사용한다. PIT는 파일 경로 대신 클래스명에 glob을 적용한다. 따라서 `.class`가 붙은 과거 Q 클래스 제외 패턴은 효력이 없어 제거됐으며, 현재 생성 Q 클래스는 선택한 스코프에 따라 mutation 모집단에 들어갈 수 있다. 수기 `QuerydslConfig`·`QueryCountGuard`까지 제외하는 광역 Q 패턴을 추가하지 않는다. 분모·임계값 변경은 registry 계약과 실제 탐지 증거를 함께 검토한다.

JUnit Platform launcher는 공통 `testRuntimeOnly`로 선언하고 `addJUnitPlatformLauncher = false`로 PIT의 별도 자동 탐색을 끈다. 실제 managed test runtime classpath를 사용해 BOM override가 빠진 임시 configuration이 의존성 그래프에 낡은 버전을 보고하는 문제를 방지한다. 이는 테스트나 의존성 스캔의 제외 설정이 아니다.

`migration-tool`의 [모듈 설정](../../migration-tool/build.gradle)은 Gradle `test`와 PIT minion 모두에 `migration.drill.classpath`를 전달한다. [프로세스 복구 테스트](../../migration-tool/src/test/java/nuri/migration/EtlCrashRecoveryPostgresIntegrationTest.java)가 새 JVM을 시작할 때 이 classpath를 쓰므로 PostgreSQL/Docker가 필요하다. 자식 JVM 자체가 PIT로 계측되는 것은 아니며, 해당 프로세스 테스트는 종료·재개·중복 방지 계약을 검사하고 in-process 테스트가 mutation 탐지를 보완한다.

## 실행 방법

```powershell
# 모듈 전체 리포트: 환경변수 미설정 시 threshold 0
./gradlew :foundation:pitest

# CI와 같은 foundation-security-filter 스코프·75% 하한
$env:PIT_TARGET_CLASSES = 'nuri.foundation.security.filter.*'
$env:PIT_TARGET_TESTS = 'nuri.foundation.*'
$env:STRICT_MUTATION = 'true'
./gradlew :foundation:pitest --warning-mode fail --console=plain
```

환경변수는 같은 PowerShell 세션의 다음 실행에도 남는다. 이후 다른 스코프를 실행할 때는 값을 명시적으로 다시 설정하거나 별도 셸을 사용한다. 모듈/클래스가 존재하는지 먼저 확인하고, 실행 대상·mutation 수·점수·survivor와 실제 종료 코드를 함께 기록한다. 로컬의 선택 스코프 green을 CI 10개(제품 8 + 이관 2) 전체 통과로 보고하지 않는다.

*Verified against current Gradle configuration, CI and gate registry: 2026-09-27.*
