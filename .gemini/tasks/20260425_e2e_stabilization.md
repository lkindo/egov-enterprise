# 20260425_e2e_stabilization.md

## 🎯 Objective
- eGov Enterprise 프로젝트의 e2e 테스트 약 150여 건의 안정화 및 성공율 제고.
- 실패하는 테스트들을 개별적으로 분석하여 수정.
- 관리자 계정(webmaster/1)을 확실히 인지하여 로그인 관련 실패 방지.

## 🛠️ Implementation Plan

### Phase 1: 테스트 현황 파악 (Test Analysis)
- [ ] 전체 e2e 테스트 실행 및 결과 수집.
- [ ] 실패 원인별 카테고리화 (로그인, 타임아웃, DOM 변경 등).

### Phase 2: 순차적 수정 (Sequential Fixes)
- [ ] 관리자 도메인 테스트 (`01-admin-domain.spec.ts`) 수정.
- [ ] 게시판 도메인 테스트 (`02-board-domain.spec.ts`) 수정.
- [ ] 협업/대시보드 도메인 테스트 수정.
- [ ] 보안 및 기타 테스트 수정.

### Phase 3: 최종 검증 (Final Verification)
- [ ] 전체 테스트 재실행 및 결과 리포트 작성.
- [ ] CI/CD 연동 확인.

## 📝 Progress Log
- 2026-04-25: 태스크 생성. 관리자 계정 `webmaster/1` 기록 완료.
- 2026-04-25: 서버(8080, 3001) 가동 확인 완료.
- 2026-04-25: Playwright 쿠키 설정에서 `httpOnly` 타입 불일치(undefined -> boolean) 문제 발견 및 수정 (`auth.setup.ts`).
- 2026-04-25: 세션 재생성(`auth.setup.ts`) 진행 중.
