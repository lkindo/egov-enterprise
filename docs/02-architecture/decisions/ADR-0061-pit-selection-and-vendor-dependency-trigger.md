# ADR-0061 — PIT 는 읽는 입력이 바뀔 때만 돌고 시험 대상은 실제 탐지 시험으로 좁히며, 벤더 잡은 루트 의존성 판만 바뀐 변경을 고르지 않는다

- 상태: Accepted
- 결정일: 2026-11-19
- 승인: 2026-11-19 사용자가 전체 시험 최적화 분석과 PIT·재사용 생성물 측정 뒤 권고 1~4 를 "추천대로 진행"하라고 승인했다. 이 배치의 결정은 이 ADR 하나다.
- 대체: [ADR-0022](ADR-0022-ci-independent-module-impact-and-cache.md) 결정 1 의 "미지 경로는 전체를 선택한다" 가운데 두 PIT 축(`mutation`·`mutationMigrationTool`), 결정 3 의 "루트 `db_columns.json` 은 미지 입력의 전수 fallback 을 유지한다" 가운데 제품 PIT. [ADR-0047](ADR-0047-multi-database-composer-and-vendor-sql-boundary.md) D-14 의 `ciOnly` 가운데 루트 `package.json` 의 의존성 판 값만 바뀐 변경.
- 유지: 다른 모든 축의 미지 경로 전수, 비교 범위가 없는 실행(수동·확인되지 않은 push base·빈 변경)과 정책 파일(AGENTS·SOP·헌법)의 전수(PIT 포함), 벤더 잡의 미지 경로 제외(ADR-0047 D-14), PIT 범위 집합·변이 모집단(`targetClasses`)·범위별 하한·`STRICT_MUTATION`([ADR-0044](ADR-0044-ci-tuning-values-and-pit-scope-floors.md)), 이관 PIT 범위의 시험 대상([ADR-0026](ADR-0026-ci-critical-path-and-reusable-impact.md) 결정 5).
- 관련: [분류기](../../../scripts/ci-change-scope.mjs), [분류기 계약](../../../scripts/ci-change-scope.test.mjs), [PIT 입력 census](../../../scripts/ci-change-scope-tool-paths.test.mjs), [벤더 판정](../../../scripts/vendor-evidence-inputs.mjs), [gate registry](../../../config/governance/gates.json), [CI 가이드](../../03-guides/cicd-pipeline.md), [PIT 문서](../pitest-mutation-testing.md)

## 맥락

2026-11-18 PR·main 실행 여섯 건을 쟀다. PR 대기 시간은 가장 긴 잡과 동시 실행 상한 20 이 정한다. 한 PR 이 러너 180~310분을 쓰고 그중 PIT 가 제품 79~94분·이관 15~18분이다. 최근 main 150커밋 가운데 107커밋이 미지 경로 때문에 전수였고, 제품 PIT 는 117커밋·이관 PIT 는 113커밋에서 돌았다.

미지 경로의 대부분은 운영 계약(`scripts/*.test.mjs`)·도구·원장(`config/governance/`)·워크플로·루트 의존성 선언이다. PIT 잡은 Gradle 로 모듈 시험만 돌리므로 이 파일들은 PIT 결과를 바꾸지 못한다. 묶음별로 계산하면, 운영 계약·원장 몇 묶음만 분류해서는 107커밋 가운데 17커밋만 풀린다. 도구·워크플로까지 분류하면 fail-closed 기본값을 사실상 버리게 된다.

제품 PIT 의 커버리지 단계는 범위마다 모듈 시험 전체(business-app 시험 클래스 150개)를 돌았다. main 44334776860 보고서에서 대상 클래스의 패키지 밖에서 변이를 잡은 시험은 여섯 클래스였다.

벤더 잡(`reusable-vendor`)은 루트 `package.json` 이 `ciOnly` 라서 의존성만 올리는 Dependabot PR 에서도 다섯 잡이 돌았다(44209393620, 러너 311분). 벤더 투영이 그 파일에서 쓰는 곳은 `scripts` 의 별칭 하나다. 벤더 잡 스크립트는 npm 패키지를 쓰지 않는다.

## 결정

1. **미지 경로는 PIT 를 읽을 때만 PIT 를 고른다.** 다른 축은 지금처럼 모두 고른다. PIT 가 읽는 모듈 밖 미분류 경로는 분류기 목록과 `ci.yml` 의 PIT 부분이다.
   - 분류기 목록: `lombok.config`·`gradlew(.bat)`·`.gitattributes`, api-server 빌드 스크립트가 구성 중 읽는 `config/governance/vendor-test-ledger.json`, 이관 PIT 의 `db_columns.json`.
   - PIT 부분: 워크플로 머리와 `change-scope`·`mutation-scope`·`mutation-scope-migration`·`mutation-test` 잡.
   - 비교 범위가 없거나 정책 파일이 바뀌면 PIT 도 전수다.
   - 운영 계약의 PIT 입력 census 가 Gradle 스크립트, PIT 모듈(foundation·business-core·business-app, migration-tool)의 Java, PIT 잡 명령이 가리키는 저장소 경로를 다시 센다. 미분류 경로를 읽는데 그 PIT 를 고르지 않으면 붉힌다. 시험이 루트 파일을 새로 읽으면 목록에 더해야 통과한다.
2. **제품 PIT 의 시험 대상은 대상 패키지와 실제 탐지 시험이다.** 각 범위의 `targetTests` 는 대상 클래스의 패키지 가운데 시험이 있는 것과, 그 밖에서 변이를 잡은 시험 클래스다(main 44334776860 의 `killingTest`).
   - 변이 모집단·하한·`STRICT_MUTATION` 은 그대로다.
   - 밖의 시험이 새로 잡는 변이는 세지 않으므로 점수는 낮아지는 쪽으로만 움직인다. 하한에 닿으면 그 시험을 대상에 더하고 하한을 내리지 않는다.
   - 이관 범위가 이미 쓰는 관행(ADR-0026 결정 5)을 제품 범위로 넓힌 것이다.
3. **벤더 잡은 루트 `package.json` 의 의존성 판 값만 바뀐 변경을 고르지 않는다.** lock 만 바뀐 변경이 이 잡을 고르지 않는 것과 같은 경계다.
   - 의존성 이름의 추가·삭제, 다른 필드(`scripts`·`engines` 등) 변경, 모양을 모르거나 읽지 못한 내용은 고른다.
   - 그 파일이 인증 입력이 되면 이 예외를 쓰지 않는다.

## 검토했으나 하지 않은 것

- **다른 축의 미지 경로 축소.** 위 계산대로 효과는 작고, 기본 안전장치를 무너뜨린다.
- **재사용 base·벤더 잡의 프런트 3단계 생략(측정 권고 R1).** 측정 추정 절감의 대부분은 벤더 잡이었다. 그런데 벤더 잡은 생성물 안의 검증 스크립트가 공개 엔진 경로로 돌린다. 생략하려면 생성물에 검사를 건너뛰는 손잡이를 두어야 한다. base 잡만 남기면 PR당 러너 약 1.6분이라, '검증 단계 불변'([ADR-0027](ADR-0027-ci-reusable-admission-layout-and-nightly.md) 결정 2·[ADR-0030](ADR-0030-reusable-ci-selection-followup.md) 결정 3)을 바꿀 가치가 없다.
- **벤더 잡 Gradle 데몬 재사용(R2).** 고칠 호출이 벤더 인증 입력(`scripts/project-composer-vendor-integration.mjs`)에 있다. 바꾸면 여섯 벤더 증거를 다시 기록해야 하므로 벤더 재기록 묶음에서 다룬다.
- **foundation 다섯 범위를 한 잡에서 차례로 실행(P6).** PIT 범위 원장, 하한 전달, 실측 순서 계약을 바꿔야 하는데 절감은 PR당 러너 2~3분이다.
- **board 범위 분할·`mutationUnitSize`.** 단위별 시간을 재지 않았다(PIT verbose 꺼짐).

## 결과

- 결정 1 을 최근 main 150커밋에 적용하면 제품 PIT 는 117 → 87커밋, 이관 PIT 는 113 → 45커밋에서 돈다. `ci.yml` 변경은 모두 PIT 부분이 바뀐 것으로 친 보수적 계산이다. 건너뛴 커밋마다 러너 약 80~90분(제품)·15~18분(이관)이 준다.
- 결정 2 는 커버리지 단계(전체 PIT 99분 가운데 17분, business-app 여덟 범위 11.7분)를 줄인다.
- 결정 3 으로, 루트 의존성만 올리는 Dependabot PR 은 벤더 다섯 잡과 PIT 를 돌지 않는다.
- 남는 위험:
  - census 는 리터럴 기반 정적 근사다. 홀로 쓴 최상위 디렉터리 이름이나 변수로 만든 경로를 PIT 가 읽게 되면 보지 못한다. 그런 미분류 경로만 바꾼 변경에서는 PIT 가 돌지 않는다.
  - 결정 2 이후 대상 패키지 밖에 생긴 시험의 탐지는 점수에 들지 않는다.

## 검증

- 분류기 계약·PIT 입력 census·벤더 판정 시험에 의도적 위반 아홉 건을 넣어, 의도한 단언에서 붉어지는 것을 확인했다.
  - 입력 목록 항목 삭제 셋
  - 미지 경로의 PIT 재선택
  - 워크플로 비교 범위 둘
  - 정책 파일 예외 제거
  - `package.json` 규칙 둘
- 결정 2 는 main 보고서의 탐지 시험이 모두 새 대상에 드는지 계산했다(빠짐 0). 실제 탐지 수는 이 결정을 넣은 PR 의 CI 실행을 main 44334776860 과 범위별로 대조해 PR 설명에 남긴다.
