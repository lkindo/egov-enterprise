# 20260503_e2e_stabilization

## 목적
- E2E 테스트 스위트(Tier 1-18)의 안정화.
- 모든 경고(Warning)를 오류로 간주하여 처리.
- 코드 내 깨진 한글(Encoding Issue) 복구.
- 실패한 테스트를 하나씩 해결하는 각개격파 전략 수행.

## 체크리스트
- [x] **Think** - 요구사항 분석 및 기존 코드 영향 파악
- [x] **Plan** - 구체적 수정/추가 단계 정의
- [x] **Implement** - 코드 작성 및 리팩토링
- [ ] **Test** - 테스트·빌드 실행으로 검증
- [ ] **Summarize** - 결과 요약 및 다음 루프 준비

## 진행 상황
- [x] 초기 탐색 및 `package.json` 확인
- [x] 한글 깨짐 현상 조사 및 복구 (`fix_encoding.py` 실행 완료, 11+개 파일 수정)
- [x] 테스트 환경 점검 (Backend/Frontend 실행 상태 확인 완료)
- [x] E2E 경고 -> 오류 전환 설정
    - [x] ESLint (`warn` -> `error`)
    - [x] Java Compiler (`-Werror`)
    - [x] Playwright PO (`Warning` -> `throw Error`)
- [ ] E2E 테스트 순차 실행 및 개별 수정
    - [x] Tier 01: Passed (1 flaky)
    - [x] Tier 02: Passed (Event Ops date masking and backend mapping fixed, Collab Hub fixed)
    - [x] Tier 03: Passed (Fixed `isAdmin` role check for Master Console button)
    - [x] Tier 04: Passed (Fixed Next.js hydration mismatch on UnifiedDashboardClient)
    - [ ] Tier 05: Pending
    - [x] Tier 06: Passed (Verified Login Policy & ACL)
    - [x] Tier 07: Passed (Updated for Workflow Hub UI integration)
    - [x] Tier 08: Passed (Verified Collab Note & Stats Dashboard)
    - [x] Tier 09: Passed (Fixed Observability Map loading flakiness)
    - [x] Tier 10: Passed (Verified Reward, HR, Memo, Map, SMS)
    - [x] Tier 11: Passed (Verified Approval, Schedule, Work Report)
    - [x] Tier 12: Passed (Verified Real-time Notification & API sync)
    - [x] Tier 13: Passed (Verified Mail Send/History/Delete)
    - [x] Tier 14: Passed (Verified Workflow Admin & Designer)
    - [x] Tier 15: Passed (Verified Scraps & Knowledge FAQ/Q&A)
    - [x] Tier 16: Passed (Verified System Observability & Metrics)
    - [x] Tier 17: Passed (Verified Support Governance & Manuals)
    - [x] Tier 18: Passed (Verified Business Extensions: ISM, LSM, HPCM)

## 발견된 이슈
- 행사 생성 모달의 날짜 필드가 `input[type="date"]`가 아닌 커스텀 마스크가 적용된 `input[type="text"]`임. -> `pressSequentially` 및 숫자 전용 입력으로 대응.
- 데이터 생성 직후 검색 시 DB 인덱싱 또는 API 동기화 지연으로 인한 실패. -> 최대 3회 재시도(Reload 포함) 로직 적용.
