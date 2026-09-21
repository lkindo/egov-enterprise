# ADR-0023 — E2E 영향 선별과 Gradle 캐시 저장 책임

- 상태: Accepted
- 결정일: 2026-09-21
- 승인 범위: 사용자 요청의 E2E 선별 실행과 Gradle 중복 캐시 저장 해소
- 부분 대체: [ADR-0021](ADR-0021-isolated-layered-testing-process.md)의 E2E shadow 정책, [ADR-0022](ADR-0022-ci-independent-module-impact-and-cache.md) 결정 8
- 관련: [테스트 프로세스](../testing-process-redesign.md#54-pr의-검증된-화면-변경만-spec-단위로-선별한다), [CI 가이드](../../03-guides/cicd-pipeline.md)

## 맥락

기존 E2E 후보에는 실제 설문 경로 불일치와 도움말·게시판·결재·워크플로의 교차 소비자 누락이 있었다. 후보를 그대로 실행기로 연결할 수 없었다. Gradle basic 캐시는 같은 ref에서 OS·architecture·Gradle 입력 hash가 같으면 같은 불변 키를 사용하므로, 여러 main 작업의 동시 저장이 중복 예약 경고를 만들었다.

## 결정

1. PR의 기존 파일 수정 중 검토한 화면 경로만 spec 전체 단위로 선별한다. 경로별 소유자와 교차 소비자는 [planner](../../../scripts/e2e-shard-plan.mjs)에 둔다. 공통 shell과 모든 품질 spec을 항상 포함한다. 공유 입력, 외부에서 소비하는 화면 내부 코드, 미등록 경로, 추가·삭제·이동, 비교 불가·빈 비교는 전수로 돌아간다. 보수적 과선택을 허용하며 일반 의존 그래프의 완전성을 주장하지 않는다.
2. main/master push에서 E2E가 필요한 변경은 전수를 실행한다. 수동 실행 등 PR 이외의 실행도 전수다. [ADR-0022](ADR-0022-ci-independent-module-impact-and-cache.md)의 온라인·이관 모듈 분류와 문서 fast path는 유지한다.
3. CI 이벤트와 Git 비교에서 선택을 계산하고 결과 검증 단계에서 독립적으로 다시 계산한다. 보고용 plan JSON을 실행 권위로 읽지 않는다. 기존 2개 shard에 선택된 spec의 실측 가중치를 재배분하며 두 shard 모두 비어 있지 않아야 한다.
4. 실행 전 두 프로젝트 전체를 `--list`로 수집한다. 결과 검증은 전체 파일 모집단을 확인하고 선택된 파일의 테스트 ID·project와 setup을 투영해 실제 결과와 대조한다. 파일·테스트 누락, 빈 실행, 잘못된 project, skip·flaky·오류를 허용하지 않는다. required context 6개와 격리 스택 소유권 검증은 유지한다.
5. upstream CI의 캐시 writer는 온라인 `backend-scope` 하나다. 온라인 scope가 명시적으로 false인 이관 전용 실행에서만 `migration-scope`가 writer가 된다. 재사용·PIT 매트릭스, 별도 이관 점검·의존성 감사·릴리스 workflow는 읽기 전용이다. FE 전용 실행에는 writer가 없어도 된다. miss에서는 정상 다운로드와 검증을 수행한다.
6. 생성된 독립 이관·재사용 제품 저장소는 자체 단일 검증 작업이 writer다. upstream의 읽기 전용 정책을 제품에 잘못 복제하지 않는다. dependency submission의 캐시 비활성·권한 경계, action SHA·MIT basic provider를 유지한다.

## 검증과 한계

기존 planner·결과·격리·required-check·제품 생성 계약을 확장한다. 소유 spec 누락, 변조된 실행 목록, 전체 inventory 누락, setup 제거, 미지 비교, 중복 writer와 생성 제품의 writer 제거를 의도적으로 주입해 실패를 확인한다. 원격 실행과 성능 실측은 [프로세스 문서](../testing-process-redesign.md)에 별도로 기록한다. 계약 통과만으로 실제 UI 결함 탐지나 실행 시간 단축을 단정하지 않는다.

선별은 PR의 테스트 실행 비용을 줄이지만 이미지·FE 빌드와 스택 준비는 계속 필요하다. 전체 CI 완료시간은 다른 required 작업에 의해 결정될 수 있다. main 전수는 PR에서 제외한 계약의 통합 회귀를 계속 관측하기 위한 비용이다. 새 경로·공유 소비자가 생기면 전수 fallback에서 시작해 매핑과 부정 검증을 함께 검토한다.

헌법 감사 범위는 프론트엔드 제14조의 모집단·실행·required 소비자 결속과 제4조의 인증 격리, 백엔드 제11조의 보안 검증 보존이다. API·DB 스키마·인가 의미와 테스트 임계값은 변경 대상에 포함되지 않는다. 상세 실행 증거와 감사 결과는 해당 변경 PR에 남긴다.
