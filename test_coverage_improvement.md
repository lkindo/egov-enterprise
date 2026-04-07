# [Ralph Loop] 테스트 커버리지 향상 작업

## 1. 개요 (Overview)
`foundation` 모듈의 테스트 커버리지를 60% 이상으로 향상시키는 작업을 수행합니다.

## 2. 단계별 체크리스트 (Step-by-Step Checklist)
- [ ] **Think (분석)**: 현재 테스트 커버리지 현황 파악 및 테스트 부족 영역 식별
- [ ] **Plan (계획)**: 커버리지가 낮은 패키지/클래스 선정 및 테스트 작성 계획 수립
- [ ] **Implement (구현)**: 단위 테스트 및 통합 테스트 작성
- [ ] **Test (검증)**: JaCoCo 리포트 재발행 및 커버리지 향상 확인
- [ ] **Summarize (요약)**: 결과 보고 및 작업 마무리

## 3. 작업 진행 상태 (Current Status)
- [x] **Think**: `jacocoRootReport`를 통해 `foundation` 모듈의 커버리지를 분석했습니다.
- [ ] **Plan**: `StatsService`, `MenuService`, `AuthService` 등 커버리지가 낮은 핵심 서비스에 대한 테스트를 우선 작성합니다.

## 4. 상세 분석 결과 (Detailed Analysis)
- [x] `nuri.foundation.service.stats`: StatsService 통합 테스트 및 ReportStatsService 단위 테스트 추가. (Missed 65 -> 43 -> 0 내외 예상)
- [x] `nuri.foundation.service.menu`: MenuService 단위 테스트 보강 (URL 추론, 권한 필터링 등). (Missed 137 -> 62)
- [x] `nuri.foundation.service.code`: CommonCodeService 단위 테스트 보강 (CRUD 전반). (Missed 123 -> 52)
- [ ] `nuri.foundation.service.auth`: **Next Target**
- [ ] `nuri.foundation.api.controller`: Controller 레이어 테스트 (MockMvc 활용)

## 5. 향후 작업 (Next Steps)
1. `StatsServiceTest` 작성 및 실행
2. `MenuServiceTest` 보강
3. `AuthServiceTest` 보강
