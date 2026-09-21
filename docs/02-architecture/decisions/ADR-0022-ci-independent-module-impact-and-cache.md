# ADR-0022 — CI 독립 모듈 영향 분류와 캐시

- 상태: Accepted
- 결정일: 2026-09-21
- 승인 범위: 사용자 요청에 따른 캐시·모듈 선별 구현. E2E spec 선별 실행은 포함하지 않는다.
- 부분 대체: [ADR-0021](ADR-0021-isolated-layered-testing-process.md) 결정 4의 main/master 전수 강제, [DEC-OPS-104](../../../.agent/memory/decisions.md)의 이관 PIT가 온라인 mutation의 부분집합이라는 조건
- 후속 결정: E2E 결정 8은 [ADR-0023](ADR-0023-e2e-impact-selection-and-cache-writer.md)의 PR 선별·main 전수 정책으로 대체한다.
- 관련: [CI 가이드](../../03-guides/cicd-pipeline.md), [테스트 프로세스와 실측 한계](../testing-process-redesign.md#93-독립-모듈-분리와-캐시-변경의-비교-기준)

## 맥락

온라인 런타임의 `foundation`·`business-core`·`business-app`·`api-server`는 의존 관계가 이어지지만 `migration-tool`은 foundation에도 의존하지 않는 독립 CLI다. 기존 root build가 이관 테스트까지 기다렸고, 별도 이관 workflow도 일반 PR/push에서 같은 검증을 반복했다. main의 무조건 전수 분류는 이관과 무관한 변경에도 그 비용을 부과했다. 비교 기준과 task 구간은 프로세스 문서에 기록하며 모듈 분리 후 절감 실적으로 해석하지 않는다.

## 결정

1. PR과 main/master push에 같은 [영향 분류기](../../../scripts/ci-change-scope.mjs)를 적용한다. PR은 base/head, push는 이전/현재 SHA를 비교한다. 수동 실행·비교 불가·미지 경로·빈 변경은 전체를 선택한다. 문서 전용 fast path도 동일하게 적용하며 운영 계약·시크릿 검사는 남긴다.
2. 온라인 4모듈은 하나의 build/PIT 범위로 유지한다. `migration`·`mutationMigrationTool`은 독립 출력이며 온라인 `backend`·`mutation`의 부분집합이 아니다. 이관 전용 Java·시험·리소스·build 변경은 이관 증거를 선택하고 온라인·frontend·schema·E2E를 선택하지 않는다. 개별 Java 파일과 시험을 매핑해 더 좁히지 않는다.
3. 공통 Gradle 입력과 명시적인 ID 의미 계약은 양쪽을 선택한다. 해당 계약은 foundation의 `IdGenerationUtil`·`Constants`와 독립 복제인 `StandardIdGenerator` 및 직접 시험이다. 이관 mapping·표준 fixture는 이관 모듈 범위다. [MappingValidator](../../../migration-tool/src/main/java/nuri/migration/validate/MappingValidator.java)가 읽는 루트 `db_columns.json`은 기존 미지 입력의 전수 fallback을 유지한다.
4. [Gradle](../../../build.gradle)의 `onlineBuild`·`jacocoOnlineCoverageVerification`과 독립 이관 검증·`jacocoMigrationCoverageVerification`을 나눈다. 두 범위 각각 LINE 85%·BRANCH 70%와 동일 제외 목록을 사용하고 클래스·현재 Test task의 실행 데이터 누락을 거부한다. 로컬 `localGate`·`jacocoRootCoverageVerification`의 전 모듈 범위는 유지한다.
5. required context 6개는 그대로다. `backend-build`는 온라인·이관 source의 기대 실행과 결과를 각각 판정하고 기존 재사용 산출물 검증도 보존한다. 온라인 PIT 8개·이관 PIT 2개와 strict 75%를 유지한다. 소스 변경의 CodeQL Java·JavaScript/TypeScript 분석, 의존성 review·시크릿 검사·스키마 조건·Linux VRT·E2E 실패 판정도 유지한다.
6. 일반 PR/push의 이관 검증은 [ci.yml](../../../.github/workflows/ci.yml)의 `migration-scope`가 소유한다. [독립 이관 workflow](../../../.github/workflows/migration-tool.yml)는 월요일 03:23 KST(일요일 18:23 UTC) 및 수동 전수 점검으로 제한한다. 별도 제품으로 export한 이관 저장소는 자체 push/PR 전수 검증을 유지한다.
7. Gradle action은 v6.3.0 commit `9c971963bec38e04b3d30dcc455b5382be2fdbfb`로 고정하고 `cache-provider: basic`을 명시한다. Gradle task 입력·임계값은 캐시 도입으로 완화하지 않는다. 캐시 복원·저장 성공과 실제 task 재사용·시간 이득은 별도로 확인한다. 기존 E2E Buildx·브라우저 캐시와 실행 격리는 유지한다.
8. E2E가 선택되면 API·브라우저 전수를 실행한다. 현재 경로 후보는 shadow이며, 알려진 경로 불일치·교차 소비자 누락이 있는 후보를 executor로 전환하지 않는다.

## 검증과 한계

[분류기 계약](../../../scripts/ci-change-scope.test.mjs)은 온라인/이관 단독·혼합·공용 ID·toolchain·unknown/full 경계를 확인한다. 이관 build/PIT와 공유 ID 선택을 제거한 변형의 실패도 확인한다. [required 계약](../../../scripts/required-checks-contract.test.mjs)과 [이관 검증 계약](../../../scripts/migration-verification-contract.test.mjs)은 실행 소비자·집계·제품 export 경계를 연결한다. 계약 green은 원격 runtime 성공이나 캐시 적중의 증거가 아니다.

이전 backend 실행 3회에서는 캐시 restore HTTP 400과 저장 실패를 확인했다. 구 action의 cache client 교체 후 실제 저장·복원 로그를 검증하며 환경변수의 restored 표식만으로 적중을 판단하지 않는다. [v6.3.0 basic 구현](https://github.com/gradle/actions/blob/9c971963bec38e04b3d30dcc455b5382be2fdbfb/sources/src/cache-service-basic.ts)의 key는 OS·architecture·Gradle 입력 hash를 사용하고 job/SHA를 구분하지 않는다. 같은 key의 저장소 캐시는 불변이므로 매 소스 변경의 test 결과 재사용까지 보장하는 설계는 아니다. [배포 정책](https://github.com/gradle/actions/blob/9c971963bec38e04b3d30dcc455b5382be2fdbfb/DISTRIBUTION.md)에 따라 MIT basic을 명시하며 추가 provider로 전환하지 않는다.

Accepted는 사용자 승인 결정이며 새 원격 성능 결과를 뜻하지 않는다. 실제 효과는 동일 검증 범위의 cold/warm 실행, 모듈 task 구간, required 완료시간과 총 runner 시간을 함께 비교해 판단한다. 이관을 실행한 SHA와 실행하지 않은 SHA의 시간을 같은 검증 범위의 속도 개선으로 표현하지 않는다.
