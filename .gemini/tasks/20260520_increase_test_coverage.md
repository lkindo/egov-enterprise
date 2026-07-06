# 20260520_increase_test_coverage.md

## 진행 상태 및 목표
- [x] 현재 백엔드 모듈의 테스트 커버리지 현황 분석 및 리포트 확인
- [x] 커버리지가 낮거나 테스트가 누락된 핵심 비즈니스 컴포넌트 우선순위 선정
- [x] **설문 관리 API 테스트 (`SurveyApiControllerTest`) 컴파일 오류 완전 복구 및 DTO 필드 빌더 교정**
- [x] **상담 관리 API 테스트 (`CnsltApiControllerTest`) 신규 추가 및 100% 커버리지 확보**
- [x] **네트워크 모니터링 API 테스트 (`NetworkMonitoringApiControllerTest`) 신규 추가 및 검증 완료**
- [x] **디버그 API 테스트 (`DebugControllerTest`) 신규 추가 및 변이 검출력 100% 실증 완료**
- [x] `mutation-testing-auditor` 스킬을 사용하여 테스트의 강건성 증명 (변이 테스트 85% 이상 확인)
- [x] `jacocoRootReport`를 재기동하여 커버리지 상승 및 테스트 통과 최종 검증 (`verification-before-completion` 완료)

## Ralph Loop 2.0 체크리스트
- [x] **Think** — 요구사항 분석 및 기존 코드 영향 파악 (설문조사 DTO 정밀 튜닝 및 컴파일 결함 진단 완료)
- [x] **Plan** — 추가 테스트 대상 식별 및 MockMvc standaloneSetup 계획 수립 완료
- [x] **Implement** — 신규 테스트 작성 및 기존 컴파일 깨짐 복구 완료
- [x] **Test** — 테스트·빌드 실행으로 전체 테스트 성공(Green) 입증 완료
- [x] **Summarize** — 결과 요약 및 다음 루프 준비 완료
