# PITest 점진적 Mutation Testing 연동

이 문서는 [백엔드 헌법 제16조](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)의 핵심 서비스 Mutation Score 75% 하한을 실행하는 경로를 설명한다. mutation score는 주입한 코드 변화에 대한 테스트의 탐지력이며 시스템 정확성 전체의 증명은 아니다.

## 현재 실행 계약

설정의 정본은 [루트 build.gradle](../../build.gradle), CI 스코프는 [ci.yml](../../.github/workflows/ci.yml)과 [gate registry](../../config/governance/gates.json)다. 전체 Gradle 설정을 문서에 복제하지 않고 실행에 필요한 경계만 요약한다.

| 항목 | 현재 계약 |
|---|---|
| 플러그인 | 루트 PIT Gradle 플러그인 `1.19.0`, JUnit 5 플러그인 `1.2.1`; 하위 Java 모듈에 공통 적용 |
| 대상 | `PIT_TARGET_CLASSES`·`PIT_TARGET_TESTS`의 쉼표 구분 클래스명 glob. 미설정 시 각각 `nuri.*` |
| CI | `mutation-scope`의 10개 스코프를 병렬 실행하고 안정 required context `mutation-test`로 집계 |
| 하한 | `STRICT_MUTATION=true`일 때 75%, 미설정 로컬 실행은 threshold 0의 리포트 모드. `CI=true`만으로 활성화되지 않음 |
| 빈 모집단 | `failWhenNoMutations = true`이므로 대상 오타·과도한 제외로 mutation이 0건이면 로컬도 실패 |
| 결과 | 모듈별 `build/reports/pitest`의 HTML/XML; 정확한 하위 경로는 해당 실행 출력 확인 |
| 증분 이력 | 모듈별 `build/pitest/pitHistory.txt`를 입력·출력으로 사용. 단축 폭은 변경 범위와 캐시 적중에 따라 달라짐 |

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

환경변수는 같은 PowerShell 세션의 다음 실행에도 남는다. 이후 다른 스코프를 실행할 때는 값을 명시적으로 다시 설정하거나 별도 셸을 사용한다. 모듈/클래스가 존재하는지 먼저 확인하고, 실행 대상·mutation 수·점수·survivor와 실제 종료 코드를 함께 기록한다. 로컬의 선택 스코프 green을 CI 10개 전체 통과로 보고하지 않는다.

*Verified against current Gradle configuration, CI and gate registry: 2026-09-10.*
