# E2E 테스트 안정성 개선 (Loop 01 - Flaky Test Fix) - [완료]

## 작업 정보
- **코어 원칙**: [x] Think, [x] Plan, [x] Implement, [x] Test, [x] Summarize
- **대상**: `01-admin-domain.spec.ts` 내 'Admin Common Code - Ultimate CRUD › Full Flow'

## 단계별 체크리스트
### 1. 분석 및 재현
- [x] 테스트 코드 분석 (완료)
- [x] 서버 기동 (API & Web)
- [x] 해당 테스트 반복 실행을 통한 재현 확인 (Taxonomy button 경고 발생 확인)

### 2. 수정 및 최적화
- [x] `next.config.ts` 프록시 설정 수정 (URL 결합 시 슬래시 누락으로 인한 403 Forbidden 해결)
- [x] `taxonomyBtn` 대기 로직 강화 (expect.toBeVisible 사용 및 filter(visible: true) 적용)
- [x] 컨텐츠 그리드 대기 로직 보충 및 타임아웃 현실화 (15s -> 20s)

### 3. 검증
- [x] 수정 후 반복 테스트 (3회 연속 성공 확인)
- [x] 전체 E2E 루프 내 해당 시나리오 정상 동작 확인

## 결과 요약
- **근본 원인 (Root Cause)**:
  1. **환경 설정**: `next.config.ts`의 리라이트 규칙에서 슬래시(/) 처리가 미흡하여 일부 API 요청이 `/api/v1authlogin`과 같이 비정상적인 경로로 전송되어 403 오류를 유발함.
  2. **테스트 로직**: 단순 필터링 후 가시성 확인 시 slow rendering 상황에서 버튼을 찾지 못하고 경고를 뱉으며 건너뛰는 취약점이 있었음.
- **해결 방안**:
  1. `next.config.ts`에서 슬래시 중복/누락을 방지하는 정규식 치환 도입.
  2. Playwright의 `expect` 기반 자동 재시도 로직과 가시성 필터를 적용하여 동적 로딩 환경에서의 안정성 확보.
- **최종 상태**: 3회 반복 실행 결과, 모든 단계에서 Navigation Retry 없이(또는 자동 복구되며) Taxonomy 버튼 클릭 및 그리드 로딩이 성공적으로 확인됨.
