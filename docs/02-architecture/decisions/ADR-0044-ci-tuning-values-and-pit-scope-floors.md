# ADR-0044 — CI 튜닝값은 ci.yml·실측 profile 이 정본이고, PIT 하한은 범위별이다

- 상태: Accepted
- 결정일: 2026-10-29
- 승인: 2026-10-28 사용자가 방법론·하네스 감사 후속을 "권고 순서대로 진행"하라고 승인했고, 2026-10-29 "가장 권고되는 선택지를 골라 확인하고 진행"으로 결정을 위임했다. 이 배치의 운영 결정은 DEC-OPS-389 하나다.
- 대체: [ADR-0026](ADR-0026-ci-critical-path-and-reusable-impact.md) 결정 9 의 제품 PIT 슬롯 수와 LPT 선언 순서(391·384·332·288·178·171초) 고정, 결정 10 의 `sast-scope`·`mutation-scope-migration` 슬롯 수 고정, 결정 5·9 의 "범위마다 75%". [ADR-0032](ADR-0032-migration-pit-two-slots.md) 결정 1 의 두 슬롯과 선언 순서 값, 결정 3 의 "필수 체크 계약이 슬롯 수와 이관 PIT 순서를 정확히 대조"와 "75% 판정". [ADR-0037](ADR-0037-product-pit-six-slots.md) 결정 1·2 의 여섯 슬롯과 "board 657초가 더 줄일 수 없는 하한"이라는 전제, 결정 3 의 "값이 정확히 6"과 "75% 판정", 결정 4 의 4슬롯 되돌림 규칙.
- 유지: PIT 범위 집합과 원장·ci.yml 양방향 대조, 범위 수의 한 확인 지점([DEC-OPS-371](../../archived/operational-decisions-history.md#dec-ops-371) ②), 핵심 대상, `STRICT_MUTATION`, fail-fast 비활성, 30분 timeout, 결과 집계의 fail-closed, 재사용 검증의 입장 조건(`needs`·`if`), 집계가 결과 완전성을 확인하는 shard 좌표. [ADR-0022](ADR-0022-ci-independent-module-impact-and-cache.md) 결정 2 의 영향 선별도 그대로다(결정 5).
- 관련: [CI 가이드](../../03-guides/cicd-pipeline.md), [PIT 실측 profile](../../../config/pit-duration-profile.json), [필수 체크 계약](../../../scripts/required-checks-contract.test.mjs), [gate registry](../../../config/governance/gates.json), [거버넌스 계약](../../../scripts/governance-gates-contract.mjs).

## 맥락

PIT 동시 수 하나를 바꾼 a5da67e21 은 ci.yml 14줄을 바꾸려고 파일 13개를 고쳤다. 새 ADR, 결정 색인, 보관 원문, 문서 둘, 계약 둘, 생성물이다. 계약 수정은 몇 줄뿐이었다. 비용은 튜닝값을 ADR 규범으로 적은 데서 나왔다. ADR-0026 이 슬롯 수를 결정으로 적었으므로, "Accepted ADR 의 규범 변경은 후속 ADR 로 대체한다"는 규칙에 따라 값이 바뀔 때마다 ADR 이 생겼다(ADR-0032, ADR-0037). 그사이 ADR-0037 의 "board 657초 하한"은 실측이 10.9~16.5분이 되면서 낡았다.

슬롯 수와 선언 순서는 시험이 무엇을 판정하는지 바꾸지 않는다. 바뀌는 것은 벽시계뿐이다. 반면 PIT 하한은 판정을 바꾼다. 모든 범위가 75% 라서, 실측이 78~100% 인 큰 범위에서는 시험이 전혀 없는 새 클래스도 통과한다. 예를 들어 migration-validate 는 살아남는 변이가 약 300개 늘어야 75% 아래로 떨어진다.

감사는 api-server 만 바꾼 변경도 제품 PIT 15잡을 돈다고 지적했다. 결정 전에 실제로 그런지 확인했다(결정 5).

## 결정

1. **튜닝값은 ADR 규범이 아니다.** 결과 판정은 그대로 두고 벽시계만 바꾸는 값이 여기에 해당한다. matrix `max-parallel`(PIT·CodeQL 슬롯), PIT matrix 선언 순서(LPT), shard·leaf 수 같은 값이다. 정본은 ci.yml 의 값과 근거 주석, 그리고 실측 duration profile 이다. profile 은 PIT 가 `config/pit-duration-profile.json`, E2E 가 `frontend/e2e/shard-duration-profile.json`, 이관 시험이 `config/migration-test-duration-profile.json` 이다.
2. **튜닝값을 바꾸면 PR 설명에 실측 run id 를 남긴다.** 새 ADR·DEC 는 쓰지 않는다. profile 을 다시 재면 같은 PR 에서 matrix 순서도 고친다.
3. **계약은 정확한 값을 고정하지 않는다.** 대신 다음 두 가지를 본다.
   - PIT 두 잡과 `sast-scope` 의 `max-parallel` 은 양의 정수로 한 번만 선언돼야 한다. 빠지거나, 0·음수이거나, 주석·표현식이거나, 중복이면 실패한다.
   - PIT matrix 의 범위 집합이 profile 의 범위 집합과 같아야 하고, 선언 순서가 profile 의 job 시간 중앙값이 긴 순서와 맞아야 한다. 같은 값이면 순서는 상관없다.

   위 "유지"에 적은 단언은 그대로 남는다.
4. **PIT 하한은 범위별이다.** 하한은 신호이므로 결정 2 의 대상이 아니다. 올리면 래칫 갱신이고, 내리는 것은 H2 판단이다.
   - 기준: 변이가 800개 이상인 범위는 최신 green main 실행의 실측 점수(검출 ÷ 생성)에서 5를 빼고 내림한 값을 하한으로 쓴다. 나머지 범위와, 그렇게 낸 값이 75 아래인 범위는 헌법 하한 75 를 쓴다.
   - 정본: gates.json `QUALITY-BACKEND-MUTATION-SCORE` 의 `scopeFloors`(범위마다 `current`·`baseline`)다.
   - 전달: ci.yml matrix 의 `threshold` 를 `PIT_MUTATION_THRESHOLD` 로 넘기고, build.gradle 이 `Math.max(75, 값)` 으로 받는다. 빈 값이면 75 이고, 숫자가 아니면 구성이 실패한다.
   - 거버넌스 계약이 막는 것: `current < baseline`, 75 아래나 100 위의 값, 원장에 없는 범위, 행렬 값과 원장의 불일치(빠진 값 포함), 행렬 값을 build.gradle 에 넘기지 않는 단계, 대체값이 하한과 다른 build.gradle.
5. **PIT 영향 선별은 바꾸지 않는다.** api-server 경로는 계속 제품 PIT 를 고른다. 근거는 다음과 같다.
   - foundation 네 범위의 시험 집합 `nuri.foundation.*` 에는 `MessageBundleContractTest` 가 든다. 이 시험은 실행 중에 `api-server/src/main/java` 를 읽는다. api-server 를 바꿔 이 시험이 깨지면, 그 범위의 PIT 는 변이 없는 기준 실행에서 실패한다.
   - 모든 PIT 잡은 `--warning-mode fail` 로 Gradle 을 돌린다. Gradle 은 다중 프로젝트의 모든 build.gradle 을 구성하므로 `api-server/build.gradle` 도 결과에 닿는다.
   - 제품 PIT 의 선택은 15범위 묶음 하나(`mutation`)다. 위 경로를 읽는 범위만 따로 고를 수 없다.

   어떤 PIT 시험도 api-server 의 시험·리소스·testFixtures 를 읽지 않는다. business-* 시험이 api-server 를 읽는 곳은 0건이다. 이 세 경로만 선택에서 빼는 안은 ADR-0022 결정 2("개별 파일 매핑으로 좁히지 않는다")를 대체하는 결정이 따로 필요하다. 그래서 재개 후보로만 둔다. 분류기 계약은 위 두 근거 경로(main java·build.gradle)가 제품 PIT 를 고르는지 고정한다.

## 이 변경에서 적용한 값

- **실측 profile**: main `ci.yml` 성공 실행 7건의 범위별 job 시간 중앙값이다(started→completed, runner 대기 제외). 실행은 40353142815·40462663514·40609164225·40617167225·40661427051·40692324711·40740257406 이다. 이 값에 맞춰 두 PIT matrix 의 선언 순서를 다시 정렬했다. 슬롯 수(6·2·1)는 그대로다.
- **범위별 하한**: 실행 40740257406(47ff9721c)의 job 로그에서 낸 값이다.

| 범위 | 생성 | 검출 | 점수 | 하한 |
|---|---:|---:|---:|---:|
| migration-validate | 1503 | 1427 | 94.94% | 89 |
| business-core-auth | 1203 | 1063 | 88.36% | 83 |
| migration-verify | 1191 | 1108 | 93.03% | 88 |
| business-app-workflow | 1068 | 910 | 85.21% | 80 |
| business-core-file | 1054 | 827 | 78.46% | 75(−5 하면 73) |
| migration-standardize | 1036 | 956 | 92.28% | 87 |
| migration-collect | 1028 | 942 | 91.63% | 86 |
| business-app-board | 830 | 762 | 91.81% | 86 |

## 검증 경계

- 계약의 red 증명:
  - 슬롯 단언: `max-parallel` 을 빼거나, 0·음수·주석·표현식·중복으로 바꾸면 실패한다. 다른 양의 정수는 통과한다.
  - 순서 단언: profile 과 어긋난 순서, profile 에 없는 범위·이름 바꾼 범위·빠진 범위, 낡은 profile 항목, run id 없음, 0초가 각각 실패한다.
  - 하한 단언: 하한 낮추기, 75 아래, 원장 밖 범위, 행렬 값 불일치, 행렬 값 누락, 단계의 환경 변수 누락, 대체값 75 아님, 범위 값을 읽지 않는 build.gradle 이 각각 실패한다.
  - 상세는 변경 PR 에 둔다.
- 순서를 다시 정렬한 효과(벽시계)는 CI 로 다시 재지 않았다. 이후 green full 실행으로 확인하고, 다시 정렬하면 결정 2 에 따른다.
- 하한 값은 단일 실행의 점수에서 낸 것이다. PIT 점수는 같은 코드에서 거의 결정적이다. 범위의 코드가 바뀌어 하한에 닿으면 살아남는 변이에 단언을 더한다. 하한을 내리지 않는다.
