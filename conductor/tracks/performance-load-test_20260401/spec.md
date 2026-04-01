# Specification: Performance Load Testing

**Track ID:** performance-load-test_20260401
**Type:** Feature
**Created:** 2026-04-01
**Status:** Draft

## Summary

k6 기반 성능 부하 테스트 인프라를 구축하고, 주요 API 엔드포인트에 대한 부하 테스트 시나리오를 구현합니다. 동시 사용자 100/500/1000 명 기준에서 응답 시간, TPS, 에러율을 측정합니다.

## Context

Phase 8(고도화) 의 미완료 항목으로, CI/CD 파이프라인은 완성되었으나 성능 부하 테스트가 남아있습니다. N+1 쿼리 해결과 캐싱 최적화로 성능이 개선되었으나, 이를 정량적으로 검증할 부하 테스트 인프라가 필요합니다.

## User Story

As a **개발자**, I want to **API 성능을 부하 테스트할 수 있다** so that **성능 병목 지점을 사전에 발견하고 최적화할 수 있다**.

## Acceptance Criteria

- [ ] k6 부하 테스트 프레임워크 설정 완료
- [ ] 로그인 API 부하 테스트 시나리오 구현
- [ ] 대시보드 조회 API 부하 테스트 시나리오 구현
- [ ] 게시글 등록 API 부하 테스트 시나리오 구현
- [ ] 동시 사용자 100/500/1000 명 시나리오 실행 가능
- [ ] CI 파이프라인에 부하 테스트 자동화 통합
- [ ] 성능 리포트 자동 생성 (HTML/JSON)

## Dependencies

- 기존 API 엔드포인트 (api-server 모듈)
- PostgreSQL 테스트 데이터
- GitHub Actions CI 파이프라인

## Out of Scope

- 프론트엔드 성능 테스트 (Lighthouse 로 별도 진행중)
- 보안 침투 테스트
- 장기 내구성 테스트 (24 시간 이상)

## Technical Notes

- **도구**: k6 (오픈소스 부하 테스트 도구)
- **시나리오**: 단계별 부하 (ramp-up), 정적 부하, 스파이크 테스트
- **메트릭**: 응답 시간 (p95, p99), TPS, 에러율, CPU/메모리 사용량
- **저장소**: test-results/ 폴더에 HTML 리포트 저장
