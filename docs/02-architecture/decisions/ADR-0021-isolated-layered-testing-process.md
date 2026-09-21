# ADR-0021 — 격리 실행과 책임별 테스트 프로세스

- 상태: Accepted
- 결정일: 2026-09-21
- 승인 범위: 사용자 요청에 따른 테스트 재배치·분할·합병, CI 최적화 및 격리 E2E 실행
- 관련: [프로세스·이전표](../testing-process-redesign.md), [실행 가이드](../../03-guides/e2e-test-guide.md), [CI 가이드](../../03-guides/cicd-pipeline.md)

## 맥락

번호순 대형 E2E 파일은 업무와 API·브라우저·품질 책임을 섞고 있었다. 파일 이름에 의존한 선별은 여론조사를 다른 설문 파일에 연결할 위험이 있으며, API 검증에도 브라우저 fixture 비용이 붙었다. 기본 개발 환경은 공유 원격 DB를 사용할 수 있고 cleanup은 접두사 데이터 삭제를 수행하므로 주소가 로컬이라는 사실만으로 실행을 허용할 수 없다.

## 결정

1. API 계약은 `contracts`, 사용자 과업은 `journeys`, 접근성·반응형·시각 회귀 등 횡단 품질은 `quality`에 둔다. 번호 대신 검증 책임으로 이름을 정한다. 고유 단언과 실패 신호를 이전한 중복만 합치고 보안·인가·negative 시나리오는 보존한다. 이전 책임표는 프로세스 문서에서 관리한다.
2. Playwright의 `api-contract`와 `full-suite`는 겹치지 않는 파일 집합을 실행한다. API fixture는 불필요한 page를 만들지 않고 실제로 생성한 기본·보조 브라우저 page는 모두 오류 ledger와 coverage 관찰을 거친다. 인증 setup은 별도 의존성이다.
3. 로컬 E2E는 새 일회용 PostgreSQL, 소유한 API·Next 프로세스, 명시적 주소·자격만 사용하는 격리 runner로 시작한다. `.env`를 가져오거나 기존 DB·포트를 재사용하지 않는다. 실행 중 owner attestation을 확인한 뒤 인증·fixture·cleanup을 허용하고 종료 시 자기 자원만 폐기한다. CI도 Compose 기동 전 설정과 기동 후 실제 컨테이너·볼륨·네트워크·datasource 소유권을 검증한다.
4. PR의 E2E와 mutation은 변경 범위 분류 직후 독립적으로 시작한다. 제품 PIT 8개 배치를 보존하면서 동시 실행 상한은 3으로 두어 E2E·긴 migration·재사용 검증과의 runner 경합을 줄인다. 전체 완료 시간 단축은 후속 실행으로 확인한다. main/master push는 전체 회귀를 실행한다. E2E는 현재 전체 모집단을 2개 shard에 분배하고 discovery inventory와 실제 결과를 대조하여 파일 안의 누락까지 실패시킨다.
5. 영향 기반 E2E는 전환기 동안 shadow로만 계산한다. 모르는 경로·공통 의존성·추가/삭제/이름 변경·비교 기준 부재는 전체로 확장한다. 후보와 전체 결과를 비교하되 자동 선별 실행을 활성화하지 않는다. shadow의 정상 결과만으로 모든 의존성이 완전하다고 결론 내리지 않는다.
6. required context 6개, CodeQL High/Critical, mutation·coverage 기준과 CI flaky/skip 금지 정책을 유지한다. Linux VRT 기준선과 허용 오차도 유지하며 비Linux의 기존 VRT 1건 제외를 성공으로 집계하지 않는다.

## 영향과 검증 범위

작은 책임 파일은 소유권·실패 위치와 shard 균형을 개선하지만 파일 수 자체가 속도 개선 증거는 아니다. 선언 수로 배분했던 초기 가중치는 [Linux run 35575211930](https://github.com/lkindo/egov-enterprise/actions/runs/35575211930)의 50개 파일·135개 본 테스트 실측 합으로 교체했고 이전 출처는 profile의 `source.previousSource`에 보존했다. setup 4회는 가중치에서 제외하며 workers=2, skip/retry/flaky/오류 0을 확인했다. 이 run의 `secret-scan`은 합성 fixture 리터럴을 탐지해 실패했고 이후 전체 실행이 취소됐으므로 전체 required 성공과 성능 개선은 별도 판정 대상이다. 제품 PIT 상한 3은 초기 실행의 동시 20개와 E2E 111초·긴 migration 116초 대기 관측에 대응하며, 계정 quota나 후속 대기시간을 보장하는 수치가 아니다.

Accepted는 위 프로세스에 대한 사용자 결정이며 CI 실행 성공·운영 배포 또는 성능 절감 실측을 뜻하지 않는다. 실제 수행한 검증과 미검증 경계는 [프로세스 문서](../testing-process-redesign.md)에 기록한다. 로컬 계약 검사는 원격 required CI와 동일하지 않다.
