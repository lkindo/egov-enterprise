# 백엔드 테스트 진행 상태

- [x] **Think (분석)**: 전체 모듈 대상 `./gradlew test` 실행 및 실패한 테스트 케이스 원인 분석 (NPE, API 경로 불일치, 응답 JSON 구조 불일치, 동시 저장에 따른 정렬 순서 문제)
- [x] **Plan (계획)**: 실패한 각 Controller 및 Repository 테스트 파일 수정 계획 수립
- [x] **Implement (구현)**: 
  - `ApprovalApiControllerTest.java`, `InformalSanctionApiControllerTest.java`: Mockito `Page` 리턴값 수정
  - `BbsApiControllerTest.java`: `jsonPath` 검증 로직을 `ApiResponse` 규격에 맞게 수정
  - `SmsApiControllerTest.java`: 테스트 호출 URL 수정
  - `BoardRepositoryTest.java`: 저장 간격에 `Thread.sleep` 추가로 정렬 보장
- [x] **Test (검증)**: 재차 테스트 실행하여 실패 없는 것(All Passed) 확인
- [x] **Summarize (요약)**: 결과 정리 및 최종 보고