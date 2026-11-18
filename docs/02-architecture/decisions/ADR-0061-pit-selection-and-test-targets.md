# ADR-0061 — PIT 는 읽는 입력이 바뀔 때만 돌고, 제품 PIT 의 시험 대상은 대상 패키지와 실제 탐지 시험으로 좁힌다

- 상태: Accepted
- 결정일: 2026-11-19
- 승인: 2026-11-19 사용자가 전체 시험 최적화 분석과 PIT·재사용 생성물 측정 뒤 권고 1~4 를 "추천대로 진행"하라고 승인했고, 독립 검토 반영 뒤 병합을 지시했다. 이 배치의 결정은 이 ADR 하나다.
- 대체: [ADR-0022](ADR-0022-ci-independent-module-impact-and-cache.md) 결정 1 의 "미지 경로는 전체를 선택한다" 가운데 두 PIT 축(`mutation`·`mutationMigrationTool`). 결정 3 의 "루트 `db_columns.json` 은 미지 입력의 전수 fallback 을 유지한다" 가운데 제품 PIT.
- 유지:
  - 다른 모든 축의 미지 경로 전수.
  - 비교 범위가 없는 실행(수동·확인되지 않은 push base·빈 변경)과 정책 파일(AGENTS·SOP·헌법)의 전수. 둘 다 PIT 포함이다.
  - 벤더 잡의 선택(ADR-0047 D-14).
  - PIT 범위 집합·변이 모집단(`targetClasses`)·범위별 하한·`STRICT_MUTATION`([ADR-0044](ADR-0044-ci-tuning-values-and-pit-scope-floors.md)).
  - 이관 PIT 범위의 시험 대상([ADR-0026](ADR-0026-ci-critical-path-and-reusable-impact.md) 결정 5).
- 관련: [분류기](../../../scripts/ci-change-scope.mjs), [분류기 계약](../../../scripts/ci-change-scope.test.mjs), [PIT 입력 census](../../../scripts/ci-change-scope-tool-paths.test.mjs), [gate registry](../../../config/governance/gates.json), [CI 가이드](../../03-guides/cicd-pipeline.md), [PIT 문서](../pitest-mutation-testing.md)

## 맥락

2026-11-18 PR·main 실행 여섯 건을 쟀다.
- PR 대기 시간은 가장 긴 잡과 동시 실행 상한 20 이 정한다.
- 한 PR 이 러너 180~310분을 쓴다. 그중 PIT 가 제품 79~94분, 이관 15~18분이다.
- 최근 main 150커밋 가운데 107커밋이 미지 경로 때문에 전수였다. 제품 PIT 는 117커밋, 이관 PIT 는 113커밋에서 돌았다.

미지 경로의 대부분은 운영 계약(`scripts/*.test.mjs`)·도구·원장(`config/governance/`)·워크플로·루트 의존성 선언이다. PIT 잡은 Gradle 로 모듈 시험만 돌리므로, 이런 파일은 대개 PIT 결과를 바꾸지 못한다.

묶음별로 계산하면, 운영 계약·원장 몇 묶음만 분류해서는 107커밋 가운데 17커밋만 풀린다. 도구·워크플로까지 분류하면 fail-closed 기본값을 사실상 버리게 된다. 그래서 축을 나눠, 비용이 가장 큰 PIT 만 입력 기준으로 고른다.

제품 PIT 의 커버리지 단계는 범위마다 모듈 시험 전체(business-app 시험 클래스 150개)를 돌았다. main 44334776860 보고서에서, 대상 클래스의 패키지 밖에서 변이를 잡은 시험은 여섯 클래스였다.

## 결정

1. **미지 경로는 PIT 가 읽을 때만 PIT 를 고른다.** 다른 축은 지금처럼 모두 고른다.
   - PIT 가 읽는 모듈 밖 미분류 경로는 분류기 목록에 둔다.
     - 빌드: `lombok.config`, `gradlew(.bat)`, `buildSrc/`, `*.gradle.kts`, `.gitattributes`.
     - api-server 빌드 스크립트가 가리키는 벤더 시험 원장. 실제 읽기는 벤더 통합 시험 구성뿐이지만 보수적으로 둔다.
     - 이관 PIT 의 `db_columns.json`.
     - PIT 를 고르고 집계하는 코드 자체: 분류기와 그 import, `aggregate-required-check.mjs`. 분류기는 자기 입력의 변경을 좁게 분류하지 않는다.
   - `ci.yml` 은 PIT 에 닿는 부분이 바뀔 때만 PIT 를 고른다. 그 부분은 워크플로 머리와 `change-scope`·`mutation-scope`·`mutation-scope-migration`·`mutation-test` 잡이다. 그 부분이 YAML 별칭을 쓰면 워크플로 전체를 비교한다.
   - 비교 범위가 없거나 정책 파일이 바뀌면 PIT 도 전수다.
   - 운영 계약의 PIT 입력 census 가 이 목록을 지킨다.
     - 다시 세는 읽는 쪽: Gradle 스크립트(`.gradle`·`.gradle.kts`)와 buildSrc 소스, PIT 모듈(foundation·business-core·business-app, migration-tool)의 Java, PIT 잡·집계 잡의 명령.
     - 이 읽는 쪽이 가리키는 미분류 경로가 그 PIT 를 고르지 않으면 붉힌다.
     - 분류기가 import 하는 모듈이 모두 PIT 를 고르는지도 대조한다.
2. **제품 PIT 의 시험 대상은 대상 패키지와 실제 탐지 시험이다.** 각 범위의 `targetTests` 는 두 가지로 이루어진다.
   - 대상 클래스의 패키지 가운데 시험이 있는 것.
   - 그 밖에서 변이를 잡은 시험 클래스(main 44334776860 의 `killingTest`, `@Nested` 를 덮도록 `…Test*`).

   변이 모집단·하한·`STRICT_MUTATION` 은 그대로다. 밖의 시험이 새로 잡는 변이는 세지 않으므로 점수는 낮아지는 쪽으로만 움직인다. 하한에 닿으면 그 시험을 대상에 더하고 하한을 내리지 않는다. 이관 범위가 이미 쓰는 관행(ADR-0026 결정 5)을 제품 범위로 넓힌 것이다.

## 검토했으나 하지 않은 것

- **다른 축의 미지 경로 축소.** 위 계산대로 효과는 작고, 기본 안전장치를 무너뜨린다.
- **벤더 잡의 루트 `package.json` 의존성 판 예외(측정 권고 R3).** 처음에는 넣었다가 독립 검토 뒤 철회했다. 벤더 생성물의 검증이 루트 의존성(`ajv`)을 실제로 쓴다(`verify-reusable-governance.mjs`). 그래서 '벤더 잡은 npm 패키지를 쓰지 않는다'는 전제가 틀렸다.
- **재사용 base·벤더 잡의 프런트 3단계 생략(R1).** 측정 추정 절감의 대부분은 벤더 잡이었다. 그런데 벤더 잡은 생성물 안의 검증 스크립트가 공개 엔진 경로로 돌린다. 생략하려면 생성물에 검사를 건너뛰는 손잡이를 두어야 한다. base 잡만 남기면 PR당 러너 약 1.6분이라, '검증 단계 불변'([ADR-0027](ADR-0027-ci-reusable-admission-layout-and-nightly.md) 결정 2·[ADR-0030](ADR-0030-reusable-ci-selection-followup.md) 결정 3)을 바꿀 가치가 없다.
- **벤더 잡 Gradle 데몬 재사용(R2).** 고칠 호출이 벤더 인증 입력(`scripts/project-composer-vendor-integration.mjs`)에 있다. 바꾸면 여섯 벤더 증거를 다시 기록해야 하므로 벤더 재기록 묶음에서 다룬다.
- **foundation 다섯 범위를 한 잡에서 차례로 실행(P6).** PIT 범위 원장·하한 전달·실측 순서 계약을 바꿔야 하는데, 절감은 PR당 러너 2~3분이다.
- **board 범위 분할·`mutationUnitSize`.** 단위별 시간을 재지 않았다(PIT verbose 꺼짐).

## 결과

- 결정 1 의 효과(이 ADR 의 분류기로 최근 main 150커밋을 다시 분류, 각 커밋의 실제 `ci.yml` 내용 비교):
  - 제품 PIT: 117 → 95커밋.
  - 이관 PIT: 113 → 62커밋. `ci.yml` 변경을 모두 PIT 부분 변경으로 치면 65커밋.
  - 건너뛴 커밋마다 러너 약 80~90분(제품)·15~18분(이관)이 준다. 150커밋 평균으로 커밋당 약 18분이다.
  - 정책 파일(AGENTS·SOP·헌법)이 바뀐 커밋은 PIT 를 계속 돈다.
- 결정 2 는 커버리지 단계(전체 PIT 99분 가운데 17분, business-app 여덟 범위 11.7분)를 줄인다.
- 남는 위험:
  - **정적 근사의 빈틈.** census 는 리터럴 기반이라 변수로 만든 경로, 홀로 쓴 최상위 디렉터리 이름을 Java 에서 읽는 경우를 보지 못한다. 그런 미분류 경로만 바꾼 변경에서는 PIT 가 돌지 않는다.
  - **PR 의 판정 트리와 PIT 가 도는 트리의 차이.** PR 은 merge-base 와 PR head 의 경로 목록으로 판정하지만, PIT 는 merge ref 에서 돈다. main 이 분기 뒤 파일을 PIT 입력 경로로 옮기고 PR 이 옛 경로를 고치면, 그 PR 은 PIT 를 고르지 않을 수 있다. 이 차이는 분류기 전체의 기존 한계다. 병합 뒤 main push 실행이 실제 두 트리로 다시 분류해 잡는다(ADR-0023 이 PR 선별에 둔 것과 같은 수용 위험).
  - **밖의 시험의 탐지.** 결정 2 이후 대상 패키지 밖에 생긴 시험의 탐지는 점수에 들지 않는다.

## 검증

- 분류기 계약·PIT 입력 census 에 의도적 위반을 넣어, 의도한 단언에서 붉어지는 것을 확인했다. 넣은 위반과 결과는 PR 설명에 남긴다.
- 독립 검토(Codex gpt-6.2-astra xhigh)의 반례를 반영했다.
  - 벤더 잡 의존성 예외 철회.
  - `buildSrc`·Kotlin DSL 추가.
  - Gradle 의 `.dir()` 연쇄와 Java 의 문자열 덧셈으로 나눈 경로를 census 부정 시험에 고정.
  - YAML 별칭이 있으면 워크플로 전체 비교.
  - 분류기·집계기를 PIT 입력으로 지정.
- 결정 2 는 main 보고서의 탐지 시험이 모두 새 대상에 드는지 계산했다(빠짐 0). 실제 상태는 이 결정을 넣은 PR 의 CI 실행을 main 44334776860 과 변이별로 대조해 PR 설명에 남긴다.
