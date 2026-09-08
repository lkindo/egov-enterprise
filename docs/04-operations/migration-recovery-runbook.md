# 승인형 이관과 부분 적재 복구

2026-09-09 검증. 이 절차는 [ADR-0008](../02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md)의 승인형 CLI를 구체화한다. 운영 변경은 대상·영향·점검 창을 명시해 승인받은 뒤 실행한다.

## 대상 고정과 승인

1. 소스 쓰기 중지, 대상 쓰기 중지, DB·첨부·암호화 키의 일관된 백업을 준비한다. [백업·복원 런북](backup-and-restore-runbook.md)을 따르며, 외부 OCI DB에는 번들 Compose 절차를 그대로 실행하지 않는다.
2. mapping의 source/target `endpointId`, run의 `runId`·`sourceNamespace`, JDBC 접속 위치를 확인한다. 업무 target은 `public.tb_example`처럼 스키마를 명시한다. 기본 허용 스키마는 `public`이며, 다른 스키마는 plan/load 양쪽에 같은 `--target-schemas=schema_a,schema_b`를 지정한다. 시스템 스키마와 `migration_control`은 업무 적재 대상으로 허용하지 않는다.
3. discover → plan → review → plan → validate를 수행한다. target digest는 실제 스키마, 허용 스키마 목록, 자격증명을 제외한 설정·연결 JDBC 위치, PostgreSQL cluster system identifier, DB OID·이름·기본 스키마에 결속된다. 이전 스키마 전용 digest의 plan은 재작성·재승인해야 한다. 계정/암호 회전은 위치 digest를 바꾸지 않는다.
4. load 직전에 실제 환경을 다시 조회해 승인 digest와 비교한다. 필요한 identity 조회가 거부되면 중단하며 약한 식별자로 대체하지 않는다. `pg_control_system()`은 클러스터 정보를 제공한다([PostgreSQL 17 문서](https://www.postgresql.org/docs/17/functions-info.html#FUNCTIONS-CONTROLDATA)). 물리 복제본은 같은 cluster identifier를 가질 수 있으므로 네트워크 위치·점검 창·접속 경로도 계속 고정해야 한다.
5. source adapter·driver·scope·변환 계약·실제 inventory 검증과 기존 `--ack-adapter`, `--ack-source-freeze` 조건도 충족해야 한다. `UNVERIFIED` vendor와 외부 driver의 commit 금지는 유지된다.

## 실행 결과와 중단 판정

load는 plan 옆에 `<plan filename>.load-<UUID>.json`을 만든다. 적재 시작 전 `STARTED`를 원자적으로 기록하지 못하면 쓰기를 시작하지 않는다. 검증 완료 후 `PASS`, 실패 후 `FAILED`로 갱신한다. 같은 run을 재개해도 실행 파일은 별도로 생긴다.

파일에는 승인·mapping·target digest, 모드, 시각, 테이블별 건수·검증 상태만 담는다. 접속정보, 행 값, checkpoint 키, 예외 원문은 담지 않는다. 프로세스 강제 종료나 저장 장치 장애로 `STARTED`가 남으면 **결과 미확정**이다. 파일의 `DRY_RUN/PASS`는 실제 적재 성공을 의미하지 않는다. 중간 chunk가 커밋된 상태에서 `FAILED`가 될 수 있다.

## 재개와 reconciliation

1. 소스·대상의 점검 창을 유지한다. 최초 승인 plan, 실행 JSON, 같은 `runId`·`sourceNamespace`를 보존한다. 새 run ID로 중복 삽입을 시도하지 않는다.
2. `migration_control.tb_migration_run`, `tb_migration_checkpoint`, `tb_migration_key_map`을 읽어 커밋 범위를 확인한다. 원시 키와 업무 값을 일반 로그나 Git에 복사하지 않는다.
3. 이미 커밋된 소스 행·대상 행·checkpoint를 변경하지 않는다. 실패한 미커밋 행의 데이터 오류만 권위 원천에서 수정한다. 스키마·mapping·변환 의미가 바뀌면 plan을 재작성·재승인한다.
4. 동일 run으로 load를 재개한다. 기존 checkpoint의 checksum·identity를 대조한 뒤 완료 행은 재사용한다. target INSERT와 checkpoint는 같은 트랜잭션으로 기록된다.
5. verifier의 target 실측 건수·checksum 대조가 `PASS`이고 run이 `COMPLETED`인지 확인한다. 키맵 부재·중복·행 변조·source checksum 차이는 실패다. 정상 재개를 위해 검증을 끄거나 checkpoint를 지우지 않는다.

[PostgreSQL 복구 회귀 테스트](../../migration-tool/src/test/java/nuri/migration/EtlPartialLoadRecoveryPostgresIntegrationTest.java)는 501행 중 첫 500행 커밋 후 실패, 실패 행 수정, 같은 run 재개, 중복 없는 재실행과 대상 변조 탐지를 실행한다. 레거시 숫자/UUID 키의 검증 파라미터는 PostgreSQL이 실제 컬럼 타입으로 해석하도록 바인딩하며, typed 복합키는 기존 JDBC 타입을 보존한다.

## 전체 롤백과 cutover

부분 커밋을 일반 SQL `ROLLBACK` 한 번으로 되돌릴 수 없다. target의 업무 데이터를 자동 DELETE하거나 checkpoint만 제거하지 않는다. 재개가 불가능하면 승인된 **이관 전 DB·첨부·키 백업 세트**를 별도 격리 대상에 복원하고 무결성을 검증한다. 운영 접속 전환은 복원 검증·동일 버전 앱 확인·명시적 운영 승인 후 수행한다.

cutover 조건은 오류 0, source/target 행·checksum reconciliation 통과, FK/제약·첨부/키 검증, 승인된 서비스 smoke 통과다. 실패하면 트래픽을 열지 않고 기존 서비스를 유지하거나 승인된 백업으로 복구한다. CDC·임의 upsert·자동 역방향 DML은 지원 범위가 아니다. 운영 규모·지원 DB 버전·LOB·최소권한·장애 전환 실증은 별도 채택 증거가 필요하다.
