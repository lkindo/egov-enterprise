# Task: 20260616-clean-unused-warnings

현재 코드베이스에 존재하는 미사용 import, 미사용 지역 변수, deprecated 요소, unchecked conversion 등의 경고를 제거하여 프로젝트 무결성을 보증합니다.

## 체크리스트
- [x] **Think** — 요구사항 분석 및 기존 코드 영향 파악 (완료)
- [x] **Plan** — implementation_plan.md 및 task.md 수립 (완료)
- [x] **Implement** — 코드 작성 및 리팩토링 (완료)
  - [x] `api-server` 경고 정리
  - [x] `business-suite` 경고 정리
  - [x] `foundation` 경고 정리
- [x] **Test** — 백엔드 빌드 무결성 검증 (`./gradlew compileJava compileTestJava`)
- [x] **Summarize** — 결과 요약 및 walkthrough.md 제출
