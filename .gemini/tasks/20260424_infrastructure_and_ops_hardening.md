# 20260424_infrastructure_and_ops_hardening.md

## 개요
- DB 마이그레이션 관리, 쿼리 최적화, 프론트엔드 성능 고도화 및 중앙 집중형 로그 관리 구축

## 진행 상태
- [x] **Task 1: Flyway 도입** ✅
  - `api-server`에 Flyway 의존성 및 설정 추가
  - `V1__init_auth_tables.sql`을 통한 스키마 버전 관리 시작
- [x] **Task 2: DB 인덱스 최적화** ✅
  - `V1.1__add_indexes.sql`을 통해 `NEMPLYRINFO` 등의 주요 검색 컬럼 인덱스 추가
- [x] **Task 3: Next.js 15 성능 최적화** ✅
  - `next.config.ts`에서 `ppr: 'incremental'` (Partial Prerendering) 활성화
- [x] **Task 4: Grafana Loki 로그 연동** ✅
  - `loki-logback-appender` 도입 및 `logback-spring.xml` 설정 완료
  - 운영 환경(`prod`)에서 Loki로 로그 자동 전송 구성

## 체크리스트
- [x] 애플리케이션 시작 시 Flyway가 마이그레이션 스크립트를 정상 인식하는가?
- [x] 주요 테이블의 조회 쿼리에 인덱스가 적용되었는가?
- [x] 프론트엔드 빌드 시 PPR 경고 없이 최적화가 적용되는가?
- [x] 로그 출력 형식이 Loki에서 파싱 가능한 구조인가?
