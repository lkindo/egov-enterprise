# 무중단 배포 4단계 이행 및 DDL 린터 아키텍처 (Zero-Downtime Migration & Linter)

## 1. 아키텍처 개요
PostgreSQL 기반의 eGov Enterprise 시스템에서 스키마 변경 시 발생할 수 있는 **테이블 락(Access Exclusive Lock)** 및 다운타임을 원천 차단하기 위해, "Expand-and-Contract" 패턴 기반의 물리적 DDL 오딧 린터를 구축하였습니다. 본 아키텍처는 [DB 표준화 헌법 제7조](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)(무중단 데이터 진화 / Expand-and-Contract)를 물리적으로 강제하는 하네스입니다.

이 시스템은 개발자가 파괴적인 DDL(`DROP COLUMN`, `ALTER COLUMN TYPE` 등)을 Flyway SQL에 추가했을 때 하네스 테스트에서 차단한다.

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
5. **`DROP TABLE` / `DROP SEQUENCE` 금지**
   - **원인**: 구버전 코드·FK·채번 문자열의 소비가 남아 있으면 즉시 런타임 파손 또는 데이터 손실이 발생함.
6. **`TRUNCATE` 금지**
   - **원인**: 조건 없는 비가역 데이터 소거이며 온라인 호환성 검증으로 정당화할 수 없음.
7. **`ALTER SEQUENCE ... RENAME` 금지**
   - **원인**: `@SequenceGenerator`와 `nextval` 문자열 소비처가 새 이름과 원자적으로 배포되지 않으면 채번이 실패함.

## 3. 무중단 4단계 이행 가이드 (Expand and Contract Phase)
안전한 배포를 위해 다음과 같은 4단계 파이프라인을 따릅니다.

1. **Phase 1: Expand (확장)**
   - 기존 데이터를 건드리지 않고 새로운 테이블/컬럼 추가 (예: NULL 허용 컬럼 추가).
2. **Phase 2: Sync (동기화)**
   - 앱 수준의 이중 쓰기(Dual Writing) 또는 배치 마이그레이션(Backfill)을 통해 신규 구조와 데이터를 완벽히 동기화. (헌법 제7조 2항 Sync 단계의 세부 절차)
     - **Dual Writing**: 앱이 신규/기존 컬럼 모두에 데이터를 기록.
     - **Backfill**: 백그라운드 스크립트 또는 배치로 과거 데이터를 신규 컬럼으로 마이그레이션.
3. **Phase 3: Redirect (이관)**
   - 모든 비즈니스 로직과 API 참조 대상을 신규 구조로 일원화하고, 프론트엔드 연동 상태를 재검증.
4. **Phase 4: Contract (축소 및 정리)**
   - 앱에서 기존 컬럼 참조가 완전히 제거된 후, 구버전 컬럼을 안전하게 `DROP`하고 인덱스/제약조건 네이밍 표준화를 이행.
   - **Linter Ignore (라인 단위)**: Contract 단계의 안전 근거와 소비처 제거를 확인한 경우에만 해당 SQL과 같은 라인에 `-- linter:ignore (사유)`를 둔다. 이 지시어는 안전성 증거를 대신하지 않는다.
   - **Linter Disable File (파일 단위)**: `-- linter:disable-file`은 구현상 지원되지만 모든 규칙을 끄므로 신규 마이그레이션의 일반 해법으로 사용하지 않는다. 불가피하면 파일 전체 면제가 필요한 이유와 별도 검증을 변경 설명에 남기고, 가능한 한 라인 단위 예외로 축소한다.

## 4. 모니터링 연동
이 하네스는 `./gradlew :api-server:harnessTest`에 포함되고, 소스 변경 시 로컬 pre-push와 상위 검증 경로에서 실행된다. 문서-only fast-pass는 이를 실행하지 않는다. 위반 감지 시 JUnit 테스트를 실패시키며, 규칙이나 실행 경로를 바꿀 때는 의도적 위반이 red가 되는지 확인한다.

현재 헌법 제7조 3항과 구현은 같은 계약을 사용한다. 환경별 warn-only 모드 없이 항상 hard-stop하고, 마이그레이션 디렉터리의 전체 SQL을 전수 검사하며, 헌법에 열거된 파괴적 패턴을 차단한다.

다만 이 하네스는 정규식 기반 정적 검사다. 실제 lock 시간, 배포 순서, dual-write/backfill 완결성, 구버전 인스턴스의 참조 제거를 증명하지 않는다. `linter:ignore` 또는 `linter:disable-file`을 사용한 Contract 변경은 소비처 census와 실제 배포·롤백 증거를 별도로 요구한다.

---
*Verified against `ZeroDowntimeMigrationLinterTest` and its harness execution path: 2026-08-19*
