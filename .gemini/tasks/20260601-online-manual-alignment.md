# 태스크: 온라인 매뉴얼 카멜케이스 표준 동기화 (E2E 400 에러 해결)

## 1. 개요
- **일시**: 2026-06-01
- **목표**: 백엔드 표준 규명(`onlnMnl*`)과 불일치하는 프론트엔드 온라인 매뉴얼 관련 소스들을 동기화하여 E2E 테스트(Help/Manuals) 400 Bad Request 에러를 해결하고 최종 그린 패스를 획득한다.

## 2. 체크리스트
- [ ] **Think** — 요구사항 분석 및 백엔드 DTO 규격 파악 완료
- [ ] **Plan** — L1 정식 태스크 제안 및 GStack Review 작성
- [ ] **Implement**
  - [ ] `ManualAdminService.ts` 내 `ManualDto` 인터페이스 필드 치환
  - [ ] `schemas.ts` 내 `manualSchema` Zod 유효성 검사 필드 치환
  - [ ] `ManualAdminClient.tsx` UI 컴포넌트 데이터 바인딩 및 렌더링 키 전면 수정
- [ ] **Test**
  - [ ] `npm run type-check` 무오류 빌드 검증
  - [ ] `npm run test:e2e` 플레이라이트 테스트 실행으로 Help/Manuals 최종 통과 검증
- [ ] **Summarize** — 결과 보고 및 작업 완료

## 3. 기록
- 백엔드 `OnlineManualDto`는 `onlnMnlId`, `onlnMnlNm`, `onlnMnlSeCd`, `onlnMnlDfn`, `onlnMnlExpln`으로 구성됨.
- 프론트엔드가 레거시 키들을 보내어 `onlnMnlSeCd` 필수값 누락 및 역직렬화 에러로 400 Bad Request 유발 상태.
- 프론트엔드 핵심 파일 3개 수정 예정.
