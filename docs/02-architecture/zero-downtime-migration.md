# 무중단 배포 4단계 이행 및 DDL 린터 아키텍처 (Zero-Downtime Migration & Linter)

## 1. 아키텍처 개요
PostgreSQL 기반의 eGov Enterprise 시스템에서 스키마 변경 시 발생할 수 있는 **테이블 락(Access Exclusive Lock)** 및 다운타임을 원천 차단하기 위해, "Expand-and-Contract" 패턴 기반의 물리적 DDL 오딧 린터를 구축하였습니다.

이 시스템은 개발자가 무의식적으로 파괴적인 DDL(`DROP COLUMN`, `ALTER COLUMN TYPE`)을 작성하여 Flyway 마이그레이션 파일(`V__*.sql`)로 커밋하는 행위를 통합 테스트 단계에서 강력하게 차단(Hard-Stop)합니다.

## 2. DDL 린터 하네스 (`ZeroDowntimeMigrationLinterTest.java`)
`nuri.api.harness` 패키지 내부에 구현된 이 정적 오딧 하네스는 빌드 및 통합 테스트가 실행될 때마다 모든 Flyway SQL 스크립트를 파싱하여 다음의 안티패턴을 감지합니다.

### 2.1. 차단되는 파괴적 DDL 규칙 (Forbidden Anti-Patterns)
1. **`DROP COLUMN` 금지**
   - **원인**: 구버전 앱(A)이 여전히 해당 컬럼을 참조하고 있을 때 컬럼이 즉시 삭제되면 에러율이 급증함.
   - **대안**: 애플리케이션에서 컬럼 참조를 제거(Contract Phase 1)한 후, 최종 마이그레이션에서 삭제.
2. **`ALTER COLUMN ... TYPE` 금지**
   - **원인**: PostgreSQL은 타입 변경 시 테이블을 Full Rewrite하며 전체 Access Exclusive Lock을 걸기 때문에 수 분~수십 분의 다운타임을 유발.
   - **대안**: 새로운 컬럼(Expand) 추가 ➔ 듀얼 라이팅(Dual Writing) ➔ 백필(Backfill) ➔ 구버전 컬럼 삭제.
3. **`RENAME COLUMN` 금지**
   - **원인**: 컬럼 명을 바꾸면 구버전 앱에서 즉각적인 SQL 쿼리 실패 발생.
   - **대안**: 새로운 컬럼 추가 및 동기화 이후 참조 변경.
4. **`ADD COLUMN ... NOT NULL` (without `DEFAULT`) 금지**
   - **원인**: 기본값 없이 NOT NULL 컬럼을 추가하면 구버전 앱이 수행하는 기존 INSERT 쿼리들이 실패함.

## 3. 무중단 4단계 이행 가이드 (Expand and Contract Phase)
안전한 배포를 위해 다음과 같은 4단계 파이프라인을 따릅니다.

1. **Phase 1: Expand (데이터베이스 확장)**
   - 기존 데이터를 건드리지 않고 새로운 테이블/컬럼 추가 (예: NULL 허용 컬럼 추가).
2. **Phase 2: Dual Writing (앱 수준 양방향 쓰기)**
   - 앱이 신규/기존 컬럼 모두에 데이터를 기록.
3. **Phase 3: Backfill (데이터 동기화)**
   - 백그라운드 스크립트 또는 배치로 과거 데이터를 신규 컬럼으로 마이그레이션.
4. **Phase 4: Contract (수축 및 정리)**
   - 앱에서 기존 컬럼 참조 제거 ➔ 안전하게 구버전 컬럼 `DROP`.

## 4. 모니터링 연동
이 하네스는 CI 파이프라인(`make coverage`, `./gradlew test`)에 완전히 내장되어 백그라운드에서 상시 기동되며, 위반 감지 시 즉각적으로 빌드를 파괴하고 원인을 콘솔에 보고합니다.
