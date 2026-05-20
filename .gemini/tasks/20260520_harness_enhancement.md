# Harness Enhancement Task (2026-05-20)

## Checklist
- [x] **Think** — 요구사항 분석 완료 (클로드의 실용주의 검증 피드백 수용, 3대 핵심 개선사항 확정)
- [x] **Plan** — 구현 대상 파일 및 수정 내역 정의
  - `QueryCountInspector.java`: ThreadLocal 내부에 SQL 실행 로그 리스트 추가
  - `HibernateQueryCounterInspector.java`: SQL 원문을 파라미터로 넘기도록 수정
  - `QueryCountGuardExtension.java`: 임계값 초과 시 SQL 원문 리스트 출력
  - `ZeroDowntimeMigrationLinterTest.java`: 멀티라인 주석 정규식 `(?s)` 버그 픽스 및 `-- linter:ignore` 화이트리스트 기능 추가
- [x] **Implement** — 코드 작성 및 리팩토링
- [x] **Test** — 테스트·빌드 실행으로 검증 (BUILD SUCCESSFUL)
- [x] **Summarize** — 결과 요약 및 다음 루프 준비
