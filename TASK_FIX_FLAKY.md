# E2E 테스트 안정성 개선 (Loop 01 - Flaky Test Fix)

## 작업 정보
- **코어 원칙**: [x] Think, [ ] Plan, [ ] Implement, [ ] Test, [ ] Summarize
- **대상**: `01-admin-domain.spec.ts` 내 'Admin Common Code - Ultimate CRUD › Full Flow'

## 단계별 체크리스트
### 1. 분석 및 재현
- [x] 테스트 코드 분석 (완료)
- [ ] 서버 기동 (API & Web)
- [ ] 해당 테스트 반복 실행을 통한 재현 확인

### 2. 수정 및 최적화
- [ ] `taxonomyBtn` 대기 로직 추가 (isVisible 대신 wait_for_selector 등 사용)
- [ ] API 데이터 로딩 대기 로직 보강
- [ ] 불필요한 타임아웃 조정 및 상호작용 안정화

### 3. 검증
- [ ] 수정 후 반복 테스트 (5회 이상)
- [ ] 전체 E2E 루프 재실행 확인

## 현재 상태
- 테스트 코드를 분석하였으며, `taxonomyBtn` 가시성 확인 시 대기 로직 부재가 원인으로 추측됩니다.
- 서버를 기동하고 재현을 시도할 예정입니다.
