# 무중단 배포 4단계 이행 및 DDL 린터 아키텍처 (Zero-Downtime Migration & Linter)

## 1. 아키텍처 개요
PostgreSQL 기반의 eGov Enterprise 시스템에서 스키마 변경 시 발생할 수 있는 **테이블 락(Access Exclusive Lock)** 및 다운타임을 원천 차단하기 위해, "Expand-and-Contract" 패턴 기반의 물리적 DDL 오딧 린터를 구축하였습니다. 본 아키텍처는 [DB 표준화 헌법 제7조](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)(무중단 데이터 진화 / Expand-and-Contract)를 물리적으로 강제하는 하네스입니다.

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
   - **Linter Ignore (라인 단위)**: 이 단계에서 안전하게 `DROP COLUMN` 등을 수행할 경우, 마이그레이션 스크립트 내 해당 SQL 문과 같은 라인에 `-- linter:ignore` 주석을 추가하여 해당 구문 하나에 대한 린터 오탐(False Positive)을 방지(Whitelist)해야 합니다.
   - **Linter Disable File (파일 단위)**: 특정 마이그레이션 파일 전체를 4가지 안티패턴 검사에서 모두 제외해야 할 경우, 파일 내 아무 곳(관례상 최상단)에 `-- linter:disable-file` 지시어를 추가하면 린터가 해당 파일 전체를 건너뜁니다. `-- linter:ignore`가 단일 구문(라인)만 화이트리스트하는 것과 달리 `-- linter:disable-file`은 파일 전체를 면제하며, 파일 내용 포함 여부(`content.contains`)로 매칭되어 위치가 엄격히 강제되지는 않으나 최상단 배치를 권장합니다.

## 4. 모니터링 연동
이 하네스는 CI 파이프라인(`make coverage`, `./gradlew test`)에서 일반 JUnit 테스트로 실행되며, 위반 감지 시 빌드를 파괴(`fail`)하고 원인을 콘솔에 보고합니다.

> **⚠ 현행 구현과 목표 정책(헌법 제7조 3항)의 차이**: 현재 `ZeroDowntimeMigrationLinterTest`는 **환경 구분 없이** 모든 환경에서 `fail()`로 무조건 빌드를 차단하며, `Files.walk`로 마이그레이션 디렉터리의 **모든** `.sql` 스크립트를 검사합니다(신규 델타 한정 아님). [DB 표준화 헌법 제7조 3항](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)이 규정하는 아래 세 가지 **지능형 완화 규칙**은 목표(로드맵)이며 아직 미구현 상태입니다.
> - **환경별 차등 기동**: Local/Dev는 경고(Warning)만, Staging/Prod CI에서만 Hard-Stop. *(미구현)*
> - **비파괴 DDL 지능형 허용**: 락(Lock)을 유발하지 않는 비파괴적 변경을 차단 대상에서 제외. *(미구현)*
> - **신규 델타 파일 한정 오딧**: 이미 반영 완료된 과거 마이그레이션 파일은 배제하고 신규 델타 SQL만 검사. *(미구현)*
