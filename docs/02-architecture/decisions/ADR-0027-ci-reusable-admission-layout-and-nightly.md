# ADR-0027 — 재사용 검증의 입장 순서·PR 레이아웃 선별과 생성물 야간 시험

- 상태: Accepted
- 결정일: 2026-10-12
- 승인 범위: 사용자 결정(2026-10-12) — 사용자 구성 검증의 분류 직후 시작과 되돌림 조건, PR 의 시작 구성당 한 레이아웃·main 전수,
  T2 예산(26잡/밤·동시 10·06:17 KST·잡 60분)과 첫 녹색 수동 실행 뒤 예약, 기능 브랜치 검증의 `workflow_dispatch` 위임
- 대체: ADR-0026 결정 1·2 중 PR 의 두 layout 부분과 결정 10 의 custom 입장 순서(나머지 결정은 유지)
- 관련: [ADR-0026](ADR-0026-ci-critical-path-and-reusable-impact.md), [ADR-0023](ADR-0023-e2e-impact-selection-and-cache-writer.md),
  [ADR-0020](ADR-0020-selectable-reusable-backend-layouts.md), [CI 가이드](../../03-guides/cicd-pipeline.md),
  [재사용 가이드 §4.2](../../03-guides/reusable-base-guide.md#42-생성물의-일반-테스트)

## 맥락

2026-10-09~12 main push 13회의 wall 중앙값은 15.2분, `backend-build` 끝 중앙값은 14.9분이었다. 성공한 PR 16회의
중앙값은 14.5분이었다. 재사용 8잡(시작 구성 3 × 레이아웃 2 + 사용자 구성 2)은 실행마다 48.8~58.8 러너분(중앙 54)을
썼다. 마지막에 끝난 잡은 PR 16회 중 12회, main 13회 중 7회가 `reusable-custom` 이었다. 같은 실행의 30초 단위 동시
실행 수를 보면 분류 직후 0.5~4.0분 동안 20개 runner 중 4개가 비어 있었다. `reusable-custom` 은 `backend-scope`
뒤에 들어가 이 빈 슬롯을 쓰지 못했다.

이 잡은 2026-09-30 ADR-0026 8차 실행을 근거로 backend 뒤로 옮겼다. 그때는 frontend 가 끝날 때 custom 두 layout 과
`secret-scan` 이 세 슬롯을 차지해 마지막 profile 이 2분 23초 늦게 들어갔다. 그 뒤 `secret-scan` 은 분류 직후로
옮겼고 제품 PIT 는 4슬롯으로 줄었다(ADR-0026 9차 조정). 8차의 경합 조건은 더 이상 없다.

실측 잡 길이로 20 runner FIFO 스케줄을 재현한 모델(실측 대비 −0.2~−0.6분, 8/8회)에서, PR 5회 기준 custom 을 분류
직후로 옮기고 PR 레이아웃을 시작 구성마다 하나로 줄이면 중앙값이 15.5분에서 12.2분(회별 이득 1.2~4.3분), 재사용
러너분이 54에서 35로 준다. 레이아웃만 줄이면 시간은 그대로다 — custom 이 backend 뒤에 줄을 서는 한 그 잡이 꼬리다.
main 3회는 custom 입장만 바꿔 15.3분에서 13.9분이었다. 모델은 다른 실행과의 겹침·runner 배정 지연을 넣지 않았다.

레이아웃을 PR 에서 줄여도 잃는 신호가 작다는 근거는 실패 이력이다. 2026-09-20 이후 실패한 CI 91회 중 재사용 잡이
붉은 실행은 16회였고, 한 시작 구성의 한 레이아웃만 붉은 실행은 3회였다. 셋 다 인프라(Maven Central 403, 의존성 조회
실패, Docker Hub 연결 끊김)였고 레이아웃 고유의 결정적 회귀는 0회였다.

생성물의 일반 테스트(`./gradlew test`·vitest)는 산출물 검증 밖이다. core·collaboration 은 처음 돌렸을 때 붉었고
(GAP-BASE-002), 직접 선택 구성은 아직 재지 않았다. 단일 모듈 생성물의 `test` 는 `api-server` 시험만 돈다 —
foundation·business-core·business-app·이관 시험은 별도 Test 작업이다. 이관 도구 시험은 구성과 무관하고(고정 픽스처와
자기 V1 스키마) CI 에서 세 샤드 합 18.5분이 걸려, 구성마다 돌리면 잡이 37~40분이 된다.

## 결정

1. `reusable-custom` 두 layout 은 `change-scope` 직후 시작한다. required-check manifest 의 `sourceNeeds` 도 같은 값이다.
   병합 뒤 main 처음 5회 중 3회 이상이 현행 중앙값 15.2분보다 느리면 needs 를 되돌린다.
2. 분류기는 이벤트를 입력받는다. PR 은 시작 구성마다 한 레이아웃만 생성·검증한다 — core 단일 모듈(제거가 가장 많고
   단일 모듈 변환이 함께 일어난다), collaboration 멀티 모듈, demo 단일 모듈(Java 제거가 0이라 멀티 생성물은
   `backend-scope` 와 겹친다). 표에 없는 시작 구성과 main push·수동 실행·이벤트 미상은 두 레이아웃 전수다.
   사용자 구성 2잡, 검증 단계·임계값, required context 이름과 branch protection 은 바꾸지 않는다.
3. PR 이 놓친 레이아웃 고유 회귀는 병합 뒤 main 이 붉은 동안만 보인다. main push 범위는 직전 main SHA 와의
   차이라, 다음 SHA 의 차이가 그 시작 구성을 고르지 않으면 그 실행은 녹색이다. ADR-0023 의 E2E 와 같은 구조의
   수용 위험이다. 생성기를 크게 바꾸는 PR 은 병합 전에 `gh workflow run ci.yml --ref <브랜치>` 로 두 레이아웃
   전수를 한 번 받는다.
4. 생성물의 일반 테스트는 별도 워크플로 `reusable-nightly.yml`(T2)이 돈다. 처음에는 수동 실행만 둔다.
   - 계획은 카탈로그에서 계산한다: 시작 구성은 두 레이아웃, 서로 다른 단독 폐포는 UTC 날짜로 번갈아 한 레이아웃
     (지금 6 + 20 = 26잡). 이름을 손으로 쓰지 않는다.
   - 생성은 기존 진입점이다: 시작 구성은 `verifyReusableBase`, 단독 선택은 composer 엔진. 폐포에도 투영 원장
     대조를 부른다.
   - 시험은 레이아웃별 작업이다: 멀티 모듈은 `test`, 단일 모듈은 `test foundationTest coreTest appTest`.
     이관 시험은 가장 많은 기능을 담은 시작 구성의 두 레이아웃에서만 돌고, 제외는 사유와 함께 원장에 둔다.
   - 판정은 작업별 JUnit XML 과 vitest JSON 이다. 보고서가 없거나 모집단이 0이거나 명령이 실패하면 실패다.
   - required 가 아니다. 비밀이 없고 권한은 `contents: read`, Gradle 캐시는 읽기만 하며 동시 10잡, 잡 60분이다.
   - 기능 브랜치의 무거운 직접 선택 검증은 `gh workflow run reusable-nightly.yml --ref <브랜치> -f compositions=…` 로
     GitHub runner 에 넘긴다.
   - 예약 실행(`17 21 * * *`, 06:17 KST, 정각 회피)은 첫 녹색 수동 실행 뒤 다음 변경에서 켠다.

## 검증과 한계

- 수용 기준: 병합 뒤 main 5회의 `backend-build` 끝 중앙값 ≤ 14.5분, PR 5회의 wall 중앙값 ≤ 12.5분, 재사용 러너분 ≤ 37.
  실측이 기준을 넘으면 결정 1·2 를 다시 잰다.
- 분류기 계약이 PR 전수 3항목·push 전수 6항목, 이벤트 없음의 두 레이아웃, 표에 없는 시작 구성의 두 레이아웃,
  문서 전용 0항목을 고정한다. required-check 계약이 custom 의 입장과 분류기 호출의 이벤트 전달을 고정한다.
- T2 러너는 시험 픽스처로 판정만 검증했다. 실제 생성은 워크플로 첫 수동 실행에서 한다. `workflow_dispatch` 가
  `--ref` 로 고른 브랜치의 워크플로 파일로 실행되는지와 CI 에서 생성물을 제자리에서 vitest 로 돌릴 수 있는지는 그
  실행에서 확인한다.
- PR 레이아웃 표는 매니페스트 v2(11단계)에서 시작 구성 선언으로 옮긴다. `verifyReusableBase` 는 지금 세 시작 구성
  이름만 받으므로, 새 시작 구성은 그 이름 하드코딩을 걷는 단계에서 T2 에 함께 들어간다.
- 러너·판정 스크립트는 새 거버넌스 코드 순증이다(대체해 걷을 계약이 없다).
