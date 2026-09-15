# 승인형 이관과 부분 적재 복구

2026-09-09 검증. 이 절차는 [ADR-0008](../02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md)의 승인형 CLI를 구체화한다. 운영 변경은 대상·영향·점검 창을 명시해 승인받은 뒤 실행한다.

기관 실행 진입점은 [ADR-0018 검토 수명 가이드](../03-guides/governance-review-lifecycle.md)를 따른다.
`migration-adoption-review.json`의 실제 기관 승인과 `execution-artifacts` 근거에 JAR·mapping·inventory·plan,
환경·mode·adapter·source schema·freeze 확인을 결속한다. `npm run adoption:check -- --execution config/governance/execution.json --environment <기관-환경-ID>`는 기술 검증과 승인 재확인만 하며,
승인된 실행에만 `--execute`를 추가한다. 미승인·만료·소스/근거/실행 파일 변경은 load 호출 전에 실패한다.
기존 discover → plan → validate → load 승인과 실제 source/target 재검증은 그대로 필요하다.

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

2026-09-15 `LocalDateTime` checksum 정규화는 JDBC `Timestamp`의 기존 영속 hash를 유지하지만,
이전 `T` 구분 표현의 `LocalDateTime` hash는 바꾼다([MySQL 값 타입 관측](readiness-followups.md#이관-mysql-후속-단계-실측)).
구현 digest가 바뀐 기존 plan은 재작성·재승인해야 한다. 이전 표현으로 기록한 checkpoint run의 자동 재개 호환성은
보장하지 않는다. 해당 run은 checkpoint·최초 승인·실행 파일을 보존하고 소스·대상·영속 hash를 별도로 대조해
reconciliation 절차와 재개 방법을 승인받는다. plan 재승인만으로 기존 checkpoint가 호환된다고 판단하거나
checkpoint 삭제·checksum 검증 해제로 우회하지 않는다.

[PostgreSQL 복구 회귀 테스트](../../migration-tool/src/test/java/nuri/migration/EtlPartialLoadRecoveryPostgresIntegrationTest.java)는 501행 중 첫 500행 커밋 후 실패, 실패 행 수정, 같은 run 재개, 중복 없는 재실행과 대상 변조 탐지를 실행한다. 레거시 숫자/UUID 키의 검증 파라미터는 PostgreSQL이 실제 컬럼 타입으로 해석하도록 바인딩하며, typed 복합키는 기존 JDBC 타입을 보존한다.

[프로세스 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlCrashRecoveryPostgresIntegrationTest.java)는 별도 JVM을 실제로 종료한 뒤 같은 run을 재개한다. 격리 PostgreSQL의 1,501행·30MB 초과 text/bytea, 500행 체크포인트와 128MiB 자식 JVM 힙으로 재개·무중복·변조 탐지를 확인했다. 이 테스트의 실행과 PIT에는 `migration.drill.classpath`가 필요하며 [모듈 빌드](../../migration-tool/build.gradle)가 각각 주입한다. 운영 규모나 다른 vendor의 Blob/Clob까지 검증했다는 의미는 아니다([2026-09-10 검증 범위](readiness-followups.md#이관-프로세스-종료와-큰-필드)).

## 전체 롤백과 cutover

Oracle 후속 단계의 실제 경계는 [2026-09-15 실측](readiness-followups.md#이관-oracle-후속-단계-실측)을 따른다.
명시한 local owner의 테이블·컬럼·기본키 범위에서 승인 plan·validate·dry-run과 직접 엔진의 BLOB/CLOB
내용 적재·checksum·오류 행 재개를 확인했다. 지원 범위·값 크기 제한·프로세스 종료 시험은 해당 실측 문서를 따른다.
Oracle `UNVERIFIED`와 외부 driver의 공개 commit 차단은 유지한다. owner 가시성 증명은 SELECT-only 권한이나
SCN 스냅샷 증명이 아니며, 실제 버전·driver별 자격과 운영 승인을 별도로 확보해야 한다.

MySQL의 경계는 [MySQL 후속 실측](readiness-followups.md#이관-mysql-후속-단계-실측)을 따른다.
MySQL 8.4.11·Connector/J 26.7.0의 직접 엔진에서 1,001행·LONGBLOB/LONGTEXT 합계 152MiB를
최대 힙 128MiB JVM의 500·504 영속 checkpoint에서 강제 종료하고 재개·재반복·전체 본문·변조 탐지를 확인했다.
MySQL 전용 LONGVARCHAR/LONGVARBINARY의 값·행 제한과 원천 cursor/sentinel의 차이는 해당 실측에 둔다.
이 결과는 모든 허용 크기의 힙 상한이나 운영 처리 시간을 보장하지 않는다. 단일 InnoDB REPEATABLE READ와
operator freeze 확인을 사용하며, 재시작 사이의 동일 snapshot이나 운영 cutover를 자동 증명하지 않는다.
공개 workflow/배포 CLI의 최종 결과는 실측 문서를 확인한다. MySQL `UNVERIFIED`와 isolated 외부 driver의
공개 COMMIT 차단은 유지한다. MariaDB·SQL Server·Tibero의 자격은 각각 별도로 검증한다.

MariaDB의 별도 경계는 [MariaDB 후속 실측](readiness-followups.md#이관-mariadb-후속-단계-실측)을 따른다.
2026-09-15~16 MariaDB 11.4.13·Connector/J 3.5.10·PostgreSQL 17.10의 직접 엔진에서
152MiB LONG을 최대 힙 128MiB JVM으로 읽고 500·504 checkpoint에서 강제 종료한 뒤 새 JVM으로
재개·재반복·전체 본문 hash·변조 거절을 확인했다. 실제 bootJar의 승인 workflow는 dry-run까지 확인했다.
인접 DB 컬럼 혼입은 실제 DB에서 재현한 뒤 schema pattern escape와 catalog·schema·table 대조로 막았다.
고정 image digest, 회차별 시험 수와 수정 전 red·수정 후 green 증거의 정본은 위 실측 문서다.
기본 CATALOG metadata 탐색을 승인 가시성으로 승격하지 않는다. 명시적 `useCatalogTerm=SCHEMA`의
`getCatalog()=def`·`getSchema()=<DB>`와 직접 DB SELECT·활성 role 없음의 좁은 범위만 증명한다.
원천 SQL 이름은 `table` 또는 `DB.table`이며 3단 이름은 차단한다. LONG 값·행·페이지 제한은 전체 힙 상한이 아니다.
positive fetch1의 ResultSet을 Statement보다 먼저 닫는 순서를 유지한다. MariaDB 3.5.10 공식 소스의
SQL_SELECT_LIMIT 적용과 byte 기준 조기 close의 추가 드레인 I/O는 작은 fixture의 Rows_sent 관측과 구분한다.
이번 보완의 영향받은 MariaDB 가시성·workflow와 공통 단위 경계·compile, 변경 5개 클래스의
scoped Delta PIT가 통과했다. 최신 영향 검사와 기존 Oracle/MySQL 실측의 범위는 위 실측 문서에서 구분한다.
MariaDB **UNVERIFIED**와 공개·isolated 외부 driver COMMIT 차단은 유지한다. 최대 허용 LOB·GB/TB 규모·처리량,
수동 freeze의 운영 이행·재시작 snapshot·cutover·전체 백업 복원을 이번 합성 시험으로 승인하지 않는다.

SQL Server의 별도 경계는 [SQL Server 후속 실측](readiness-followups.md#이관-sql-server-후속-단계-실측)을 따른다.
SQL Server 2022 16.00.4295·Microsoft JDBC 13.6.0.0·PostgreSQL 17.10에서 실제 DB 시험 47개의 개별 통과를 확인했다.
직접 엔진은 MAX 물리 저장량 144MiB·PostgreSQL 내용 152MiB를 최대 힙 128MiB JVM의 500·504 checkpoint에서
강제 종료한 뒤 재개·재반복·전체 SHA-256·무중복·변조 거절을 확인했다. 공개 workflow·배포 CLI는 dry-run까지다.
공개 가시성은 현재 비시스템 DB의 sysadmin·dbo 관계형 범위만 증명하며 최소권한 계정 자격은 미검증이다.
실제 READ_ONLY DB의 물리 증거로 preflight를 통과해도 JDBC 신호 false·privilege 경고·ack/freeze 조건은 유지한다.
SQL Server **UNVERIFIED**와 isolated 외부 driver COMMIT 금지는 유지한다. MAX 상한·adaptive fetch1 시험은
전체 힙 보장·GB/TB 규모·snapshot·운영 cutover·전체 백업 복원을 승인하지 않는다. Tibero와 Oracle 19c runtime은
승인된 실행 이미지/설치 매체·필요한 사용 허가와 driver·접속 설정을 확보한 뒤 별도로 검증한다.

부분 커밋을 일반 SQL `ROLLBACK` 한 번으로 되돌릴 수 없다. target의 업무 데이터를 자동 DELETE하거나 checkpoint만 제거하지 않는다. 재개가 불가능하면 승인된 **이관 전 DB·첨부·키 백업 세트**를 별도 격리 대상에 복원하고 무결성을 검증한다. 운영 접속 전환은 복원 검증·동일 버전 앱 확인·명시적 운영 승인 후 수행한다.

cutover 조건은 오류 0, source/target 행·checksum reconciliation 통과, FK/제약·첨부/키 검증, 승인된 서비스 smoke 통과다. 실패하면 트래픽을 열지 않고 기존 서비스를 유지하거나 승인된 백업으로 복구한다. CDC·임의 upsert·자동 역방향 DML은 지원 범위가 아니다. 운영 규모·지원 DB 버전·LOB·최소권한·장애 전환 실증은 별도 채택 증거가 필요하다.
