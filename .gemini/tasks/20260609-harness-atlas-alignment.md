# Task: 하네스 설명서 종합 아틀라스 현행화 (2026-06-09)

## Checklist
- [x] 프로젝트 물리 아키텍처 및 하네스 구성요소 전수 스캔
- [x] 설명서(HTML)와 실제 구현 위치 간의 불일치(Drift) 분석 및 도출
- [x] `governance_harness_atlas.html` 내 harnesses 배열 수정
  - [x] 문서 상대 경로 교정 (`../docs/` -> `../../docs/`)
  - [x] `NetworkMonitoringApiController` 모듈 오기 수정 (`foundation` -> `api-server`)
  - [x] E2E 자가치유 가이드 문서 링크 누락 추가 (`e2e-self-healing-guide.md`)
  - [x] JPA SQL N+1 Inspector 상세 패키지 클래스 명세 구체화
- [x] CIG(컴파일 무결성 보증 게이트) 검증
  - [x] Frontend: `npx tsc --noEmit` 통과
  - [x] Backend: `./gradlew compileJava compileTestJava` 실행 및 검증
