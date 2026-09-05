# 레거시 데이터 이관 도구

> **상태: PARTIAL** — `migration-tool`은 온라인 애플리케이션과 분리된 선택형 offline ETL CLI다. 여러 종류의 source DB를 위한 객체 조사·승인 계획과 PostgreSQL target 테이블 데이터 적재 골격은 구현됐지만, 실제 벤더 DB rehearsal·운영 cutover·rollback을 승인하거나 이관 성공을 보증하는 증거는 아직 없다.

## 목적과 경계

이 도구는 PostgreSQL·Oracle·Tibero·MySQL·MariaDB·Microsoft SQL Server 및 generic JDBC source를 조사할 수 있는 adapter registry를 제공한다. 그러나 자동 적재 대상은 `mapping.yml`에 선언한 **테이블 데이터**이며 target DBMS는 현재 정확히 **PostgreSQL 하나**다. 발견한 view·routine·trigger·grant 같은 객체는 누락 없이 계획에 분류하지만 DDL을 직접 변환·실행하지 않는다. 현재 프로젝트의 target schema는 계속 애플리케이션 Flyway가 소유한다.

모듈은 `foundation`이나 온라인 런타임에 의존하지 않는 독립 `bootJar`이며, 이관이 필요한 프로젝트에서만 실행한다. 직접 `--mapping=... --mode=dry-run|commit` 경로는 승인 artifact를 우회하므로 dry-run과 commit 모두 차단한다.

```text
mapping.yml + source DB
        │
        ▼
 discover ──> catalog inventory.json
                  │  source endpoint/driver/adapter/scope + object/visibility digest
                  ▼
 mapping.yml + target PostgreSQL fingerprint + optional review.yml
                  │
                  ▼
   plan ─────> migration plan.json ─────> validate
                  │  inventory/mapping/target/implementation digest
                  ▼
   load(dry-run|commit) ──> live source 재발견 + target 재지문 + ETL/verify
```

## 승인형 CLI와 artifact

| 명령 | 입력과 출력 | fail-closed 경계 |
|---|---|---|
| `discover` | `mapping.yml`과 source connection으로 요청한 catalog/schema/44개 object kind를 조사하고 canonical JSON inventory를 atomic write | source·target `endpointId` 존재를 요구하고, source endpoint digest·adapter product/version preflight·JDBC read-only signal·driver evidence·discovery scope를 inventory에 결속한다. raw DDL·JDBC URL·username/password는 artifact에 기록하지 않는다. |
| `plan` | inventory, mapping, 현재 target PostgreSQL schema fingerprint와 선택적 `review.yml`을 결합해 schema v3 plan을 atomic write | inventory의 source endpoint·driver·adapter·scope, mapping digest, target fingerprint, migration-tool 구현 bytes·핵심 class·adapter read-session·선택 transformer 계약을 digest로 묶는다. 발견 객체 전부가 검토·분류되지 않거나 visibility finding이 남으면 `commitReady=false`다. |
| `validate` | plan 한 개를 읽어 `commitReady`를 검사 | 승인 workflow는 정확히 plan schema v3만 허용한다. 이 명령은 live DB를 다시 읽거나 새 artifact를 만들지 않는다. |
| `load` | mapping·inventory·plan과 동일 discovery scope로 source를 다시 조사하고 `dry-run` 또는 `commit` 실행 | source endpoint/driver/scope/inventory, mapping, target PostgreSQL fingerprint, 실행 구현 계약을 모두 다시 exact-match한다. 불일치·미승인 adapter/driver/freeze·검증 WARN/FAIL은 non-zero 종료다. 현재 load 결과 JSON/Markdown artifact는 만들지 않는다. |

Workflow 파일은 UTF-8 regular file, 최대 16 MiB, symlink 금지 계약을 적용한다. 출력은 같은 디렉터리의 임시 파일을 `fsync`한 뒤 atomic replace하며 atomic move를 지원하지 않으면 실패한다. Inventory는 raw native definition 대신 definition hash만 보존하고, artifact redaction guard는 JDBC URL·credential·private key 형태를 차단한다.

### 결속되는 실행 의미

- **Endpoint**: source inventory는 `endpointId`와 credential을 제거한 JDBC 위치 digest를 결속한다. Mapping digest에는 source/target `endpointId`가 포함된다.
- **Driver**: bundled driver는 실제 driver class/code-source bytes, 외부 driver는 승인한 local JAR들의 SHA-256과 class를 결속한다.
- **Discovery scope**: adapter ID, catalog/schema, system-object 포함 여부, 44개 object kind의 `REQUESTED`·`NOT_REQUESTED`·`NOT_APPLICABLE` manifest를 inventory에 고정한다.
- **Implementation**: plan은 migration-tool module class/resource bytes, 핵심 ETL·validator·verifier·load-surface class, adapter identity/read-session policy와 선택 transformer digest를 고정한다.
- **Target**: mapping이 참조하는 PostgreSQL table·column·PK metadata와 DB product/version을 fingerprint한다.
- **Review**: 선택적 `review.yml`은 inventory·target·mapping·execution contract 네 digest에 결속되고, 객체 stable ID별 disposition과 검토 여부를 선언한다.

> **첫 차단 요소 해소(2026-09-05):** [`MappingLoader.resolveDbConfig()`](../../migration-tool/src/main/java/nuri/migration/model/MappingLoader.java)는 환경 변수 치환 뒤에도 source/target `endpointId`를 보존한다. [`MappingLoaderEndpointBindingTest`](../../migration-tool/src/test/java/nuri/migration/model/MappingLoaderEndpointBindingTest.java)는 literal·환경 변수 `endpointId`를, [`MigrationWorkflowRunnerTest`](../../migration-tool/src/test/java/nuri/migration/MigrationWorkflowRunnerTest.java)는 실제 YAML 파일을 읽는 `discover` 경로와 inventory의 source endpoint binding을 회귀 검증한다. 이는 파일 loader 연결 결함을 닫은 증거이며 실제 DB rehearsal이나 production cutover 준비 완료를 뜻하지 않는다.

## Source adapter와 discovery 범위

`SourceAdapterRegistry`는 vendor adapter를 먼저 선택하고 마지막에 portable JDBC metadata adapter를 둔다. JDBC product/version이 명시 adapter와 맞지 않으면 실패한다. 각 adapter는 44개 `ObjectKind`마다 `OBJECTS`, `PARTIAL_PROBE`, `NOT_APPLICABLE`, `UNSUPPORTED` 중 하나의 종료 경로를 갖는다.

객체가 0건이라는 사실과 볼 수 없다는 상태를 구분한다. `UNREADABLE`, `UNSUPPORTED`, `PARTIAL`, `QUERY_FAILED` visibility finding은 plan blocker이며 `NOT_APPLICABLE`만 정상적인 비대상이다. PostgreSQL adapter는 `pg_catalog`와 JDBC metadata를 결합하고 요청 schema의 visibility를 확인한다. 다른 vendor adapter의 catalog SQL도 제품별로 분리돼 있지만 실제 DB 증거 없이 query 정의만 존재한다.

| Source 경로 | 구현 상태 | load 경계 |
|---|---|---|
| PostgreSQL `postgresql-pg-catalog` | `pg_catalog` 보강과 schema visibility census가 구현된 `EXPERIMENTAL` adapter | commit은 exact `--ack-adapter=postgresql-pg-catalog`와 `--ack-source-freeze`가 필요하다. 실제 버전/권한 범위는 별도 rehearsal 대상이다. |
| Oracle·Tibero·MySQL·MariaDB·SQL Server | vendor별 catalog query, snapshot/streaming 정책 선언이 있는 `UNVERIFIED` adapter | dry-run도 adapter 승인과 source freeze가 필요하며 commit은 코드가 차단한다. 실제 vendor/version/driver 검증 전 지원 완료로 간주하지 않는다. |
| Generic JDBC metadata | account-scoped portable metadata의 `EXPERIMENTAL` fallback | 일관 source snapshot을 증명하는 read-session policy가 없어 load는 차단된다. discovery·plan의 완전성도 자동 증명하지 못한다. |
| 명시적 외부 JDBC JAR | absolute local regular JAR만 격리 classloader로 열고 symlink·network path·glob·중복·manifest classpath를 거부 | inventory에 JAR digest를 결속하고 dry-run load에는 exact `--ack-source-driver=<digest>`가 필요하다. isolated in-process driver commit은 금지된다. |

모든 source connection은 JDBC read-only로 표시하지만 이는 권한 증명이 아니다. 운영에서는 source DB 계정 자체를 SELECT-only 최소 권한으로 제한하고 adapter가 요구하는 격리 수준과 maintenance-window freeze를 별도로 승인해야 한다.

## `mapping.yml` 계약

속성명은 `MappingSpec`의 camelCase 계약을 그대로 사용한다. `${NAME}`은 DB 연결 필드의 **전체 값**일 때만 환경 변수로 치환하며 누락 값, 부분 치환, 비어 있지 않은 평문 password, 알 수 없는 속성, 중복 YAML key는 실패한다.

```yaml
source:
  url: ${SOURCE_DB_URL}
  username: ${SOURCE_DB_USER}
  password: ${SOURCE_DB_PASSWORD}
  driver: org.postgresql.Driver
  endpointId: legacy-crm-prod

target:
  url: ${TARGET_DB_URL}
  username: ${TARGET_DB_USER}
  password: ${TARGET_DB_PASSWORD}
  driver: org.postgresql.Driver
  endpointId: egov-postgresql-stage

run:
  runId: crm-cutover-20260831
  sourceNamespace: legacy-crm

tables:
  - source: legacy.legacy_user
    target: tb_user_info
    where: "use_yn = 'Y'"
    orderByKeys: [user_no]
    targetKey: esntl_id
    idStrategy:
      column: esntl_id
      generator: USR_
      sourceKey: user_no
    columns:
      - { source: user_id, target: user_id, transform: trim }
      - { source: password_hash, target: pswd }
      - { source: user_nm, target: user_nm, transform: trim }
      - { source: reg_dt, target: crt_dt, type: timestamp }
      - { source: stat, target: user_stts_cd, codemap: user_status }
      - { target: frst_rgtr_id, const: MIGRATION }

codemaps:
  user_status:
    "1": P
    "0": D
    default: A
```

이 예시는 source의 `password_hash`가 현재 `EgovPasswordEncoder`와 호환된다는 사전 검증을 전제로 한다. 해시 형식이 다르면 원문 비밀번호를 복호화·재해시하지 말고, 별도의 강제 재설정/계정 활성화 정책과 매핑을 승인한 뒤 이관해야 한다. `pswd`는 target의 NOT NULL 컬럼이므로 정책 없이 생략할 수 없다.

Commit에는 `run.runId`, `run.sourceNamespace`, 모든 table의 결정적 `orderBy` 또는 `orderByKeys`, checkpoint 검증에 사용할 target identity가 필요하다. order tuple은 source transaction 안에서 유일성을 먼저 검사하며 이후 keyset pagination에 사용한다. `where`의 주석·세미콜론·DDL/DML token과 잘못된 식별자를 차단하지만, 신뢰된 mapping 작성과 독립 리뷰를 대체하지 않는다.

Identity는 두 계약을 지원한다.

- 기존 단일 문자열 `idStrategy`는 target ID를 생성하고 `fkRef`로 자식 FK를 번역한다.
- typed/composite `identity`는 `preserve`, `remap`, `target_generated` 정책과 TEXT·정수·decimal·boolean·UUID·시간·binary 타입을 명시한다. 복합 자식 FK는 `foreignKeys`에서 source/target component를 완전하게 선언한다. `target_generated`는 PostgreSQL `INSERT ... RETURNING`으로 행별 생성값을 얻는다.

복합 identity와 기존 `idStrategy`는 함께 선언할 수 없다. Typed tuple은 versioned canonical encoding으로 keymap/checkpoint에 저장하며 partial-null 복합 FK, 타입·arity 불일치, 고아 FK는 실패한다. 단일 self-reference는 부모 ID를 먼저 예약하는 2-pass를 지원하지만 typed composite self-reference는 차단한다.

## 적재, transaction과 재시작 의미

Load는 adapter가 승인한 격리 수준으로 **source connection 하나와 read transaction 하나**를 열고 부모 우선 순서의 모든 table을 그 세션에서 읽는다. Source freeze가 필요한 adapter는 `--ack-source-freeze` 없이는 실행하지 않는다. Commit은 500행 keyset page/chunk를 기본 단위로 target에 적재한다.

Target에는 migration-tool 전용 Flyway가 `migration_control` schema와 다음 상태를 생성·검증한다.

- `tb_migration_key_map`: `(run_id, source_namespace, source_table, legacy_key)`별 typed/legacy key 대응
- `tb_migration_checkpoint`: 같은 run/source/table의 source identity, target identity, transformed-row SHA-256
- `tb_migration_run`: `RUNNING`, `LOADED`, `COMPLETED`, `FAILED` 상태
- `tb_migration_schema_history`: migration-tool runtime schema 전용 Flyway history

일반 chunk는 target data INSERT, 신규 keymap, durable checkpoint를 **같은 target connection/transaction**에 기록한다. JDBC batch `updateCounts`가 각 1행을 증명하지 못하거나 하나라도 실패하면 chunk를 rollback하고 행 단위로 재변환·재시도한다. `target_generated`는 처음부터 행별 `INSERT ... RETURNING`·keymap·checkpoint transaction을 쓴다. Commit 또는 rollback 결과가 불확정하면 자동 재시도를 중단한다.

재실행은 같은 `runId + sourceNamespace`의 keymap/checkpoint를 preload한다. 동일 source identity의 target identity와 transformed-row checksum이 같으면 이미 완료된 행으로 인정하고, checksum·target identity·target table이 달라지면 실패한다. 사후 verifier도 run-scoped checkpoint 수, target identity 유일성, target 행 재조회 checksum을 대조한다.

다음 경계는 원자적이지 않다.

- 전체 run이 아니라 target chunk/row 단위로 commit하므로 뒤 chunk 실패 시 앞선 성공 chunk는 유지된다.
- 단일 self-reference 2-pass는 data 적재 전에 예약 keymap을 별도 commit한다.
- run 상태 갱신과 최종 report 판정은 data chunk transaction과 별도다.
- 현재 쓰기 정책은 INSERT-only이며 upsert·source delete 반영·CDC·전체 rollback은 없다.

## 실행 예시

아래 예시의 실제 YAML `endpointId` loader 경로는 회귀 테스트로 고정돼 있다. 다만 명령은 승인된 비운영 rehearsal 환경과 SELECT-only source 계정이 준비된 뒤에만 사용한다. `plan`과 `load`에는 `discover`와 같은 adapter/catalog/schema/object-kind/system-object scope를 반복해야 한다.

```powershell
./gradlew :migration-tool:bootRun --args="--command=discover --mapping=mapping.yml --inventory=inventory.json --source-adapter=postgresql-pg-catalog --schemas=legacy"
./gradlew :migration-tool:bootRun --args="--command=plan --mapping=mapping.yml --inventory=inventory.json --plan=plan.json --review=review.yml --source-adapter=postgresql-pg-catalog --schemas=legacy"
./gradlew :migration-tool:bootRun --args="--command=validate --plan=plan.json"
./gradlew :migration-tool:bootRun --args="--command=load --mapping=mapping.yml --inventory=inventory.json --plan=plan.json --source-adapter=postgresql-pg-catalog --schemas=legacy --ack-adapter=postgresql-pg-catalog --ack-source-freeze --mode=dry-run"
```

Commit은 같은 load 계약에서 `--mode=commit`을 명시한다. 외부 source driver는 discover/load 양쪽에 같은 repeatable `--source-driver-jar=<absolute-local.jar>`와 `--source-driver-class=<class>`를 주고 dry-run load에 inventory가 기록한 exact `--ack-source-driver=<sha256>`를 추가한다. 접속정보는 환경 변수나 승인된 secret provider adapter로 주입하고 mapping, artifact, 로그, 명령행에 평문 저장하지 않는다.

배포용 JAR은 `./gradlew :migration-tool:bootJar`로 만들고 `migration-tool/build/libs/`의 실제 산출물 이름을 사용한다.

## production cutover 전 필수 보강

다음 항목이 닫히기 전에는 plan의 `commitReady=true`나 load의 PASS를 운영 이관 승인으로 사용하지 않는다.

1. **완료(2026-09-05):** `MappingLoader`가 source/target `endpointId`를 보존하도록 수정하고, [loader 회귀](../../migration-tool/src/test/java/nuri/migration/model/MappingLoaderEndpointBindingTest.java)와 [실제 YAML `discover` 회귀](../../migration-tool/src/test/java/nuri/migration/MigrationWorkflowRunnerTest.java)를 추가했다.
2. target PostgreSQL은 현재 `endpointId` 라벨과 product/version·schema fingerprint만 결속한다. credential을 제거한 JDBC location/instance identity도 artifact에 결속해, 같은 `endpointId`와 동일 schema를 가진 다른 PostgreSQL로 URL이 바뀌어도 load가 통과할 수 있는 공백을 닫는다.
3. PostgreSQL source/target과 Oracle·Tibero·MySQL·MariaDB·SQL Server adapter를 지원 버전·실제 driver·최소권한 계정으로 검증한다. 현재 vendor query 정의와 H2/mock 테스트는 실 DB 증거가 아니다.
4. charset/collation/timezone, quoted identifier, LOB와 vendor-specific type, 대용량 스트리밍을 익명화된 대표 데이터로 rehearsal한다.
5. canonical load 결과 JSON/Markdown artifact, 실행자·승인자·환경·시각·행수/checksum·실패 코드를 보존하고 독립 검증 절차를 둔다.
6. chunk 부분 성공, self-reference 예약 keymap, commit ambiguity를 판별·조정하는 reconciliation과 backup/rollback runbook을 승인한다.
7. 기존 target 행 충돌·재실행·source 변경/삭제 정책을 정하고, 필요한 경우 staging 기반 제한적 upsert를 별도 설계한다. 현재 INSERT-only를 자동 overwrite로 확장하지 않는다.
8. 초기 이관 뒤 증분 동기화가 필요하면 watermark/CDC, 순서·중복·삭제·cutover freeze와 재처리 의미를 별도 구현·검증한다.
9. view·routine·trigger·grant 등 비데이터 객체의 `RECREATE_VIA_FLYWAY`·`REIMPLEMENT_IN_APP`·`EXTERNALIZE` disposition을 실제 Flyway/application 변경 및 owner 승인과 연결한다.

스키마 자체의 Expand-and-Contract 절차는 [zero-downtime-migration.md](zero-downtime-migration.md)의 영역이며, 데이터 cutover와 같은 것으로 간주하지 않는다.

## 검증 증거와 한계

```powershell
./gradlew :migration-tool:test
```

현재 test inventory는 Java 테스트 소스 **82개**, `@Test` **403건**이다. Mapping/artifact/adapter/discovery/visibility/plan binding, 실제 YAML endpoint binding, 외부 driver 격리, typed·composite·generated identity, 단일 source read session, chunk/row data-keymap-checkpoint 원자성, durable resume/checksum, PostgreSQL target fingerprint와 strict 종료를 검증한다. PostgreSQL Testcontainers 테스트는 migration runtime schema와 generated identity 경로를 확인하지만 Docker가 없으면 비활성화되며, source vendor 전수 workflow·운영 규모·권한·cutover/rollback 증거는 아니다.

---
*Verified against the current `MappingLoader`, real-YAML workflow regression, and GAP-MIG-001: 2026-09-05*
