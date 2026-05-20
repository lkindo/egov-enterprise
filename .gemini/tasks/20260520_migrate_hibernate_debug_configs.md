# 20260520_migrate_hibernate_debug_configs.md

## 진행 상태 및 목표
- [x] Base `application.yml`에서 JPA 디버그 및 통계 옵션을 프로덕션 안전 사양(`false`/`warn`)으로 변경
- [x] `application-dev.yml`에 JPA 디버그 및 통계(`generate_statistics`) 옵션, 그리고 상세 하이버네이트 디버그 로깅 레벨 이식
- [x] 백엔드 모듈 빌드 및 기본 구동성 검증

## Ralph Loop 2.0 체크리스트
- [x] **Think** — 요구사항 분석 및 기존 코드 영향 파악
- [x] **Plan** — 구체적 수정/추가 단계 정의
- [x] **Implement** — 코드 작성 및 리팩토링
- [x] **Test** — 테스트·빌드 실행으로 검증 (Gradle 빌드 성공 확인)
- [x] **Summarize** — 결과 요약 및 다음 루프 준비 (보완 완료)
