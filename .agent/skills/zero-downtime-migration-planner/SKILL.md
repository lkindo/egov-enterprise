---
name: zero-downtime-migration-planner
description: PostgreSQL 스키마 변경을 단계별 Expand–Migrate–Contract 배포와 검증 가능한 rollback 조건으로 설계한다.
version: 2.0.0
---

# Zero-Downtime Migration Planner

## 사용 시점

컬럼·테이블·constraint·index의 추가, rename, 타입 변경 또는 삭제를 설계할 때 사용한다. DB 표준 헌법과 `db-governance` 절차를 함께 적용한다.

## 단계

### 1. Expand

- 기존 코드와 함께 동작하는 새 구조를 추가한다.
- 신규 column의 nullable/default가 기존 write를 막지 않는지 확인한다.
- 큰 테이블의 lock·rewrite·index build 비용을 추정한다.

### 2. Migrate

- dual-read/write가 정말 필요한지 결정하고, 필요하면 종료 조건을 명시한다.
- backfill은 chunk·재시도·관측·중단 후 재개가 가능해야 한다.
- 구·신 데이터의 count뿐 아니라 constraint와 대표 값의 parity를 확인한다.

### 3. Contract

- 새 애플리케이션이 배포되고 구 구조 사용이 0임을 증명한 뒤 후속 release에서 제거한다.
- Expand와 Contract를 같은 Flyway 파일에 넣지 않는다.
- rollback 또는 roll-forward 조건과 관측 기간을 기록한다.

## 검증 경계

- `node .agent/scripts/db-bridge.js`는 live metadata와 read-only SQL 조회용이다. DDL을 실행하거나 `BEGIN/COMMIT`으로 syntax를 검증하지 않는다.
- DDL syntax·Flyway 순서는 격리된 PostgreSQL 테스트 환경과 `schemaValidation` 계열 테스트에서 검증한다.
- 기존 `linter:ignore`는 안전성 증거가 아니다. 새 예외는 구조화된 사유·범위·만료/제거 조건 없이 추가하지 않는다.
- “zero downtime”은 정적 lint 통과만으로 증명되지 않는다. 데이터량, lock, 배포 순서, 구버전 호환, 관측·rollback을 함께 확인한다.

## 보고 형식

대상, 현재 구조, 각 release의 Expand/Migrate/Contract, lock·데이터 위험, rollback/roll-forward, 실행한 검증, 아직 확인하지 못한 운영 전제를 구분한다. 실제 실행은 사용자 승인과 운영 runbook 범위에서만 수행한다.
