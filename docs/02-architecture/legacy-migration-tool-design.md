# 레거시 데이터 이관 도구

> **상태: PARTIAL** — `migration-tool`은 온라인 애플리케이션과 분리된 선택형 offline ETL CLI다. 여러 종류의 source DB를 위한 객체 조사·승인 계획과 PostgreSQL target 테이블 데이터 적재 골격은 구현됐지만, 실제 벤더 DB rehearsal·운영 cutover·rollback을 승인하거나 이관 성공을 보증하는 증거는 아직 없다.

## 목적과 경계

이 도구는 PostgreSQL·Oracle·Tibero·MySQL·MariaDB·Microsoft SQL Server·CUBRID 및 generic JDBC source를 위한 adapter registry를 제공한다. 그러나 자동 적재 대상은 `mapping.yml`에 선언한 **테이블 데이터**이며 target DBMS는 현재 정확히 **PostgreSQL 하나**다. 발견한 view·routine·trigger·grant 같은 객체는 누락 없이 계획에 분류하지만 DDL을 직접 변환·실행하지 않는다. 현재 프로젝트의 target schema는 계속 애플리케이션 Flyway가 소유한다.

모듈은 `foundation`이나 온라인 런타임에 의존하지 않는 독립 `bootJar`이며, 이관이 필요한 프로젝트에서만 실행한다. 직접 `--mapping=... --mode=dry-run|commit` 경로는 승인 artifact를 우회하므로 dry-run과 commit 모두 차단한다.

레거시 컬럼의 의미 식별과 표준용어 확정(표준화 단계), 그 결과를 적재에 결속하는 용어 매핑 원장과 단계별 보강(L1~L4)은 [ADR-0029](decisions/ADR-0029-legacy-standardization-migration.md)가 정한다. 이 문서의 승인 계보·redaction·INSERT-only 경계는 그대로다.

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
| `plan` | inventory, mapping, 현재 target PostgreSQL schema fingerprint와 선택적 `review.yml`을 결합해 schema v3 plan을 atomic write | inventory의 source endpoint·driver·adapter·scope, mapping digest, target fingerprint, migration-tool 구현 bytes·핵심 class·adapter read-session·선택 transformer 계약을 digest로 묶는다. 발견 객체 전부가 검토·분류되지 않거나 visibility finding이 남으면 `commitReady=false`다. live 대상 계약·표준 사전 검증([표준 계약 검증](#표준-계약-검증))에 실패하면 표·컬럼 이름을 밝히고 plan을 쓰지 않는다. |
| `validate` | plan 한 개를 읽어 `commitReady`를 검사 | 승인 workflow는 정확히 plan schema v3만 허용한다. 이 명령은 live DB를 다시 읽거나 새 artifact를 만들지 않는다. |
| `load` | mapping·inventory·plan과 동일 discovery scope로 source를 다시 조사하고 `dry-run` 또는 `commit` 실행 | source endpoint/driver/scope/inventory, mapping, target PostgreSQL fingerprint, 실행 구현 계약을 모두 다시 exact-match한다. 불일치·미승인 adapter/driver/freeze·검증 WARN/FAIL은 non-zero 종료다. plan 옆의 고유 실행 JSON에 `STARTED`를 먼저 저장하고 `PASS`/`FAILED`로 갱신한다. |

Workflow 파일은 UTF-8 regular file, 최대 16 MiB, symlink 금지 계약을 적용한다. 출력은 같은 디렉터리의 임시 파일을 `fsync`한 뒤 atomic replace하며 atomic move를 지원하지 않으면 실패한다. Inventory는 raw native definition 대신 definition hash만 보존하고, artifact redaction guard는 JDBC URL·credential·private key 형태를 차단한다.

### 결속되는 실행 의미

- **Endpoint**: source inventory는 `endpointId`와 credential을 제거한 JDBC 위치 digest를 결속한다. Mapping digest에는 source/target `endpointId`가 포함된다.
- **Driver**: bundled driver는 실제 driver class/code-source bytes, 외부 driver는 승인한 local JAR들의 SHA-256과 class를 결속한다.
- **Discovery scope**: adapter ID, catalog/schema, system-object 포함 여부, 44개 object kind의 `REQUESTED`·`NOT_REQUESTED`·`NOT_APPLICABLE` manifest를 inventory에 고정한다.
- **Implementation**: plan은 migration-tool module class/resource bytes, 핵심 ETL·validator·verifier·load-surface class, adapter identity/read-session policy와 선택 transformer digest를 고정한다.
- **Target**: mapping이 참조하는 PostgreSQL table·column·PK metadata, DB product/version, 자격증명을 제거한 설정·연결 JDBC 위치, cluster system identifier, DB OID·이름·기본 스키마, 허용 스키마 목록을 fingerprint한다. v3부터 매핑 표의 `information_schema` 컬럼 계약과 같은 schema 표준 사전의 용어·도메인 대조 결과도 함께 결속한다. [TargetEndpointBinding](../../migration-tool/src/main/java/nuri/migration/artifact/TargetEndpointBinding.java)과 [fingerprintBound](../../migration-tool/src/main/java/nuri/migration/postgres/PostgresTargetSchemaFingerprinter.java)가 정본이며 identity 조회 실패 시 중단한다. 업무 테이블은 허용된 스키마를 명시해야 한다.
- **Review**: 선택적 `review.yml`은 inventory·target·mapping·execution contract 네 digest에 결속되고, 객체 stable ID별 disposition과 검토 여부를 선언한다.

> **첫 차단 요소 해소(2026-09-05):** [`MappingLoader.resolveDbConfig()`](../../migration-tool/src/main/java/nuri/migration/model/MappingLoader.java)는 환경 변수 치환 뒤에도 source/target `endpointId`를 보존한다. [`MappingLoaderEndpointBindingTest`](../../migration-tool/src/test/java/nuri/migration/model/MappingLoaderEndpointBindingTest.java)는 literal·환경 변수 `endpointId`를, [`MigrationWorkflowRunnerTest`](../../migration-tool/src/test/java/nuri/migration/MigrationWorkflowRunnerTest.java)는 실제 YAML 파일을 읽는 `discover` 경로와 inventory의 source endpoint binding을 회귀 검증한다. 이는 파일 loader 연결 결함을 닫은 증거이며 실제 DB rehearsal이나 production cutover 준비 완료를 뜻하지 않는다.

## Source adapter와 discovery 범위

`SourceAdapterRegistry`는 vendor adapter를 먼저 선택하고 마지막에 portable JDBC metadata adapter를 둔다. JDBC product/version이 명시 adapter와 맞지 않으면 실패한다. 각 adapter는 44개 `ObjectKind`마다 `OBJECTS`, `PARTIAL_PROBE`, `NOT_APPLICABLE`, `UNSUPPORTED` 중 하나의 종료 경로를 갖는다.

객체가 0건이라는 사실과 볼 수 없다는 상태를 구분한다. `UNREADABLE`, `UNSUPPORTED`, `PARTIAL`, `QUERY_FAILED` visibility finding은 plan blocker이며 `NOT_APPLICABLE`만 정상적인 비대상이다. PostgreSQL adapter는 `pg_catalog`와 JDBC metadata를 결합하고 요청 schema의 visibility를 확인한다. 다른 vendor adapter의 catalog SQL도 제품별로 분리돼 있으며, 실제 DB 검증 범위는 [이관 실측 기록](../04-operations/readiness-followups.md)에 명시한다.

| Source 경로 | 구현 상태 | load 경계 |
|---|---|---|
| PostgreSQL `postgresql-pg-catalog` | `pg_catalog` 보강과 schema visibility census가 구현된 `EXPERIMENTAL` adapter | commit은 exact `--ack-adapter=postgresql-pg-catalog`와 `--ack-source-freeze`가 필요하다. 실제 버전/권한 범위는 별도 rehearsal 대상이다. |
| Oracle·Tibero·MySQL·MariaDB·SQL Server | vendor별 catalog query, snapshot/streaming 정책 선언이 있는 `UNVERIFIED` adapter | dry-run도 adapter 승인과 source freeze가 필요하며 commit은 코드가 차단한다. 실제 vendor/version/driver 검증 전 지원 완료로 간주하지 않는다. |
| CUBRID | 전용 adapter의 자격은 `UNVERIFIED`·`MANUAL_ONLY`다. 11.4.6/JDBC 11.3.1의 owner-scoped discovery와 작은 BLOB/CLOB dry-run·내부 COMMIT rehearsal 범위는 [CUBRID 실측 기록](../04-operations/readiness-followups.md#이관-cubrid-실행-환경과-검증-경계)에서 구분한다. | 공개 COMMIT은 차단한다. 완전성·SELECT-only 증명에는 원천 SELECT와 `_db_class`·`_db_auth` SELECT가 필요하며 source freeze도 필수다. |
| Generic JDBC metadata | account-scoped portable metadata의 `EXPERIMENTAL` fallback | 일관 source snapshot을 증명하는 read-session policy가 없어 load는 차단된다. discovery·plan의 완전성도 자동 증명하지 못한다. |
| 명시적 외부 JDBC JAR | absolute local regular JAR만 격리 classloader로 열고 symlink·network path·glob·중복·manifest classpath를 거부 | inventory에 JAR digest를 결속하고 dry-run load에는 exact `--ack-source-driver=<digest>`가 필요하다. isolated in-process driver commit은 금지된다. |

원천 연결에는 JDBC `setReadOnly(true)`를 요청하지만 이는 권한 증명이 아니다. Microsoft JDBC `13.6.0.0`은 이 요청을 지원하지 않아 신호가 false다. SQL Server preflight는 제품·드라이버가 실측 조합과 정확히 일치하고, 현재 catalog와 `DB_NAME()`이 같은 비시스템 DB에서 `DATABASEPROPERTYEX(...,'Updateability')=READ_ONLY` 단일행을 확인했을 때만 누락 신호를 대체한다. 신호는 false로 기록하며 쓰기 가능한 DB와 불완전한 증거는 차단한다. 운영에서는 원천 계정의 SELECT-only 최소 권한, DB 상태 전환, 격리 수준과 maintenance-window freeze를 별도로 승인해야 한다.

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

온라인 앱이 값을 암호화해 저장하는 컬럼은 mapping에 같은 보호 방식을 `encrypt`로 선언해야 한다(DEC-OPS-308). 대상 DB에는 암호문 컬럼 표시가 없어 이관 도구가 [보호 목록](../../migration-tool/src/main/java/nuri/migration/protect/ProtectedTargetColumns.java)을 갖는다. 지금은 두 컬럼이다: `tb_user_info.user_enrrno`(주민등록번호, `RrnoEncryptionConverter`의 eGov ARIA-256 — `encrypt: aria-egov-v1`)와 `tb_auth_otp_cert.otp_secret_encpt_cn`(MFA 비밀, `MfaSecretCipher`의 AES-256-GCM — 이관하지 않고 사용자가 다시 등록한다). 비밀번호·복구 코드·리프레시 토큰처럼 해시로 저장하는 값은 암호화가 아니라 이 목록에 없다.

```yaml
    columns:
      - { source: jumin_no, target: user_enrrno, transform: trim, encrypt: aria-egov-v1 }
```

이관 도구는 같은 암호문을 스스로 만든다. 실행 시 foundation·business-core·eGovFrame 라이브러리에 의존하지 않는다(DEC-OPS-005). ARIA-256은 독자 구현이고(RFC 5794 시험 벡터), 온라인 `ARIACipher`와 같이 키 문자열을 32자에서 자르고 UTF-8 바이트를 ANSI X.923 변형으로 32바이트까지 채운다. 데이터도 같은 방식으로 16바이트 블록을 채우고, ECB(IV 없음, 같은 키·값이면 같은 암호문)로 암호화해 표준 Base64로 쓴다. 키는 실행 때 환경 변수 `MIGRATION_ALGORITHM_KEY`(온라인 앱 `ALGORITHM_KEY`와 같은 값)로만 받고 mapping·plan·inventory·실행 JSON·로그에 쓰지 않는다.

다음 경우는 행을 읽거나 실행 상태를 만들기 전에 멈춘다. mapping 검증과 적재 시작이 같은 판정을 쓴다.

- 목록의 컬럼을 `encrypt` 없이 매핑했다(스키마 한정 이름·대소문자로 피할 수 없다).
- 목록에 없는 컬럼에 `encrypt`를 선언했다.
- 방식이 다르거나, 이관할 수 없는 방식이다.
- `const`·`codemap`·`type`·`fkRef`와 함께 쓰거나, 식별자·참조 키로 쓴다.
- 키가 없다(dry-run 포함).

값은 하나씩 확인한다. 온라인 변환기처럼 빈 값은 NULL로 둔다. 그 밖의 값은 암호화한 뒤 세 가지를 본다.

- 되읽으면 원래 값이 나온다. 온라인 복호화가 채움으로 오인해 걷어 내는 값은 여기서 걸린다.
- 쓰려는 값이 주민번호 평문 형태가 아니다.
- 쓰려는 값이 16바이트 배수의 표준 Base64다.

하나라도 어긋나면 그 행만 쓰지 않는다. 오류에는 `PROTECTED_COLUMN <테이블>.<컬럼>`만 남기고 값과 키는 남기지 않는다.

호환은 [계약 시험](../../migration-tool/src/test/java/nuri/migration/protect/OnlineRrnoConverterContractTest.java)이 증명한다. 이 시험은 Gradle 프로젝트 의존 없이 온라인 원본(변환기·`CryptoUtil`·`ProjectCryptoConfig`)을 시험 안에서 컴파일한다. 그리고 온라인과 같은 Spring 설정으로 돌려 세 가지를 본다: 두 구현의 암호문이 같고 서로 되읽는지, 적재 경로의 결과를 온라인 변환기가 읽는지, 보호 목록이 온라인 엔티티의 `@Convert`·서비스 암호 컬럼과 정확히 같은지. 시험 범위 의존은 그 원본이 쓰는 외부 라이브러리(eGovFrame 암호·JPA API·Lombok)뿐이다. 프로젝트 의존을 쓰지 않은 이유는 생성 제품의 이관 모듈 독립 검사와 이관 단독 제품의 시험 컴파일이 깨지기 때문이다. 이관 단독 제품에서는 이 대조만 건너뛰고, eGov 구현으로 만든 고정 벡터 시험은 돈다.

남은 경계: 키가 온라인 앱과 같은지는 도구가 확인하지 않는다. 다른 키로 쓴 암호문은 앱이 원래 값으로 읽지 못한다. 레거시가 이미 암호문을 갖고 있으면 그 값을 평문으로 보고 다시 암호화하므로, 먼저 복호화 경로를 정해야 한다(아직 없다).

Commit에는 `run.runId`, `run.sourceNamespace`, 모든 table의 결정적 `orderBy` 또는 `orderByKeys`, checkpoint 검증에 사용할 target identity가 필요하다. order tuple은 source transaction 안에서 유일성을 먼저 검사하며 이후 keyset pagination에 사용한다. `where`의 주석·세미콜론·DDL/DML token과 잘못된 식별자를 차단하지만, 신뢰된 mapping 작성과 독립 리뷰를 대체하지 않는다.

Identity는 두 계약을 지원한다.

- 기존 단일 문자열 `idStrategy`는 target ID를 생성하고 `fkRef`로 자식 FK를 번역한다. 생성 ID는 온라인 앱 [`IdGenerationUtil`](../../foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java)과 같은 `접두사 + 대문자 hex` 형식이며, `generator`는 접두사만 주므로 접두사를 포함해 20자다. 온라인의 20자 호출(`USR_`·`ORGNZT_`·`BBSMSTR_`)과 같고 `GROUP_`(온라인 16자)만 다르다. 형식 동등성은 foundation 원본을 시험 안에서 컴파일해 두 구현을 대조하는 [계약 시험](../../migration-tool/src/test/java/nuri/migration/keymap/StandardIdGeneratorTest.java)이 고정한다. migration-tool은 실행 시에도 Gradle 상으로도 foundation에 의존하지 않는다(DEC-OPS-306).
- typed/composite `identity`는 `preserve`, `remap`, `target_generated` 정책과 TEXT·정수·decimal·boolean·UUID·시간·binary 타입을 명시한다. 복합 자식 FK는 `foreignKeys`에서 source/target component를 완전하게 선언한다. `target_generated`는 PostgreSQL `INSERT ... RETURNING`으로 행별 생성값을 얻는다.

원본 키를 그대로 쓰는 `preserve`나 직접 컬럼 매핑이 identity·serial·`nextval` 기본값 컬럼에 값을 넣으면, 적재가 끝난 뒤 그 시퀀스를 원본 키 최댓값 뒤로 옮긴다(아래 적재 절). 시퀀스는 행을 쓰기 전에 대상 카탈로그로 정한다. `preserve` 정수 키가 카탈로그로 연결된 시퀀스가 없으면 온라인 앱이 `@SequenceGenerator` 전용 시퀀스(예: `sq_answer_no`)로 채번하는지 알 수 없으므로 적재를 시작하지 않는다. 이때는 `identity.targetSequences`에 시퀀스 이름이나 `none`을 선언한다. 선언은 `preserve`의 target component에만, 시퀀스 이름은 정수 키에만 쓸 수 있다.

```yaml
    identity:
      policy: preserve
      sourceComponents: [ { column: ANSWER_NO, type: signed_integer } ]
      targetComponents: [ { column: answer_no, type: signed_integer } ]
      targetSequences: { answer_no: sq_answer_no }
```

복합 identity와 기존 `idStrategy`는 함께 선언할 수 없다. Typed tuple은 versioned canonical encoding으로 keymap/checkpoint에 저장하며 partial-null 복합 FK, 타입·arity 불일치, 고아 FK는 실패한다. 단일 self-reference는 부모 ID를 먼저 예약하는 2-pass를 지원하지만 typed composite self-reference는 차단한다.

## 적재, transaction과 재시작 의미

Load는 adapter가 승인한 격리 수준으로 **source connection 하나와 read transaction 하나**를 열고 부모 우선 순서의 모든 table을 그 세션에서 읽는다. Source freeze가 필요한 adapter는 `--ack-source-freeze` 없이는 실행하지 않는다. Commit은 500행 keyset page/chunk를 기본 단위로 target에 적재한다.

Target에는 migration-tool 전용 Flyway가 `migration_control` schema와 다음 상태를 생성·검증한다.

- `tb_migration_key_map`: `(run_id, source_namespace, source_table, legacy_key)`별 typed/legacy key 대응
- `tb_migration_checkpoint`: 같은 run/source/table의 source identity, target identity, transformed-row SHA-256
- `tb_migration_run`: `RUNNING`, `LOADED`, `COMPLETED`, `FAILED` 상태
- `tb_migration_schema_history`: migration-tool runtime schema 전용 Flyway history

일반 chunk는 target data INSERT, 신규 keymap, durable checkpoint를 **같은 target connection/transaction**에 기록한다. JDBC batch `updateCounts`가 각 1행을 증명하지 못하거나 하나라도 실패하면 chunk를 rollback하고 행 단위로 재변환·재시도한다. `target_generated`는 처음부터 행별 `INSERT ... RETURNING`·keymap·checkpoint transaction을 쓴다. Commit 또는 rollback 결과가 불확정하면 자동 재시도를 중단한다.

원본 키를 쓴 컬럼의 시퀀스는 모든 table을 적재한 뒤 재설정한다(DEC-OPS-306). `max(컬럼)`이 시퀀스의 다음 값 이상일 때만 `setval`로 옮기고 이미 앞에 있으면 건드리지 않으므로, 다시 실행해도 같은 상태이며 시퀀스를 뒤로 돌리지 않는다. 오류가 난 table도 앞선 chunk가 남으므로 재설정한다. 실행 JSON의 `sequenceResets`에는 table·컬럼·시퀀스 이름과 결과(`ADVANCED`·`ALREADY_AHEAD`·`EMPTY_TABLE`·`DECLARED_NONE`)만 남기고 키 값은 남기지 않는다. 다음 경우는 행을 쓰기 전에 멈춘다: 기본값이 `nextval`인데 시퀀스를 찾지 못함, 연결된 시퀀스가 둘 이상, `GENERATED ALWAYS` identity, 선언한 시퀀스가 없거나 카탈로그와 다름, 위의 연결 없는 `preserve` 정수 키. 재설정 자체가 실패하면(시퀀스 상한 초과, 권한 부족) 그 table의 오류가 되어 run이 `FAILED`다. 이관 계정에는 해당 시퀀스의 SELECT·UPDATE 권한이 필요하고, 적재하는 동안 온라인 앱이 같은 table에 쓰지 않아야 한다. 카탈로그는 PostgreSQL 대상에서만 읽는다. 승인 workflow의 대상은 언제나 PostgreSQL이며, 그 밖의 대상(단위 시험의 H2)에서는 `preserve` 정수 키를 `none`으로 선언해야 진행한다.

재실행은 같은 `runId + sourceNamespace`의 keymap/checkpoint를 preload한다. 동일 source identity의 target identity와 transformed-row checksum이 같으면 이미 완료된 행으로 인정하고, checksum·target identity·target table이 달라지면 실패한다. 사후 verifier도 run-scoped checkpoint 수, target identity 유일성, target 행 재조회 checksum을 대조한다.

다음 경계는 원자적이지 않다.

- 전체 run이 아니라 target chunk/row 단위로 commit하므로 뒤 chunk 실패 시 앞선 성공 chunk는 유지된다.
- 단일 self-reference 2-pass는 data 적재 전에 예약 keymap을 별도 commit한다.
- run 상태 갱신과 최종 report 판정은 data chunk transaction과 별도다.
- 시퀀스 재설정은 모든 table 적재 뒤 별도 transaction이다. 그 전에 끝난 run은 재실행이 다시 맞춘다.
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

배포용 JAR은 `./gradlew :migration-tool:bootJar`로 만들고 `migration-tool/build/libs/`의 실제 산출물 이름을 사용한다. 온라인 UI 없이 테스트·bootJar를 함께 검증하는 진입점은 `npm run verify:migration`이다.

## 기관 도입과 실행 승인

[ADR-0018](decisions/ADR-0018-governance-review-lifecycle-and-adoption.md)은 이관 제품의 기술 검증·기관 환경 승인·실제 load 승인을 구분한다. `npm run review:migration`은 제품 범위와 상태를 보고하며 온라인 URL·UI 원장을 이관 검증의 전제 조건으로 가져오지 않는다.

`config/governance/migration-adoption-review.json`은 `product: migration-tool`, `profile: null`, `status: pending`으로 시작한다. 기관은 실제 source/target identity, mapping·schema·driver, 복구·cutover와 실행 artifact를 검토하고 소스 범위 digest·유효기간·근거를 기록한다. 원본 프로젝트의 운영 승인이나 온라인 원장을 복제하여 이관 승인을 대신하지 않는다.

프런트·온라인 모듈을 포함하지 않는 별도 소스 제품은 `npm run migration:export -- --output build/migration-product/<새-디렉터리>`로 생성한다. [생성기](../../scripts/generate-migration-product.mjs)는 migration-tool만 포함하는 Gradle settings와 전용 검증·hook·workflow를 만들고 기관 원장을 pending으로 초기화한다. 생성은 기술 검증을 대신하지 않으므로 출력 디렉터리에서 `npm run verify`와 `npm run test:operational-contracts`를 실행한다. 새 저장소의 required CI 설정과 운영 도입 승인은 별도로 연결한다.

`npm run adoption:check -- --execution config/governance/execution.json --environment <기관-환경-ID>`는 기관 승인과 실행 descriptor를 확인하고 이관 기술 검증 후 다시 확인한다. 기본 동작은 검사다. 명시적 `--execute`에서만 검토된 JAR·mapping·inventory·plan과 mode로 기존 `--command=load`를 호출한다. 이 wrapper는 현재 built-in PostgreSQL adapter·명시 source schema·source freeze 확인을 요구한다. 실제 적재에서는 이 문서의 inventory·plan·live identity 경계도 모두 다시 검사한다.

원장과 descriptor 작성은 [검토 수명 가이드](../03-guides/governance-review-lifecycle.md), 실패·재개는 [복구 런북](../04-operations/migration-recovery-runbook.md)을 따른다. 파일 hash는 제출한 근거와 실행물을 묶을 뿐 실제 운영 검증이나 작성자 신원을 자동 증명하지 않는다.

### 표준 계약 검증

`plan`과 `load`는 정적 검증(코드젠 스냅샷 `db_columns.json`의 컬럼 존재) 뒤에 승인 digest에 결속된 live 대상 계약으로 매핑을 다시 검증한다([TargetStandardValidator](../../migration-tool/src/main/java/nuri/migration/validate/TargetStandardValidator.java), DEC-OPS-307).

- **live 계약**: 매핑 표의 `information_schema.columns`(타입·길이·정밀도·소수 자릿수·NULL 허용·기본값·identity·생성 컬럼)를 [읽고](../../migration-tool/src/main/java/nuri/migration/postgres/PostgresTargetStandardReader.java) JDBC metadata의 컬럼 집합과 대조한다. 권한으로 가려진 컬럼이 있거나 읽지 못하면 실패하며 코드젠 스냅샷으로 대신하지 않는다.
- **표준 사전**: 대상 표와 같은 schema에 `meta_standard_terms`·`meta_standard_domains`가 있으면 컬럼 이름(영문약어)의 용어와 도메인을 찾는다. 존재는 권한과 무관한 `pg_class`로 판정한다. 하나만 있거나 읽지 못하거나 용어·도메인이 모호하거나 해석할 수 없으면 실패한다. 둘 다 없으면 도메인 대조만 생략하고, 용어가 없는 컬럼은 경고로 남긴다. 물리 타입이 도메인과 다른 종류면(숫자 도메인의 문자 컬럼 등) 실패하고, 같은 종류면 물리 컬럼과 도메인 중 좁은 한계를 적용한다. 일련번호 `NUMERIC` 도메인의 `bigint`처럼 현대화한 정수 컬럼은 같은 종류로 본다.
- **값 종류**: const(type 힌트 없이 문자열로 바인딩), fkRef(생성 ID 문자열), 소스 inventory 선언, codemap, 내장 변환기, type 힌트 순서로 정한다. 형식이 조용히 바뀌거나 값이 손실되는 조합(날짜·논리값→문자, 시각→날짜, 근사 수치→정확 수치, 문자→숫자·날짜)은 실패한다. 내장이 아닌 변환기는 출력 계약을 그 변환기가 소유하므로 검사하지 않는다.
- **길이·정밀도**: inventory의 소스 선언 길이, 정밀도와 소수 자릿수가 타깃 한계를 넘으면 실패한다. 선언을 확인할 수 없어도 실패한다. 다만 타깃이 길이 제한 없는 `text`·`numeric`이면 통과한다. 소수 자릿수 초과는 PostgreSQL이 오류 없이 반올림하므로 특히 막는다. 값을 줄여야 하면 내장이 아닌 변환기를 선언한다.
- **NOT NULL**: 기본값·identity·생성식이 없는 NOT NULL 컬럼은 매핑·const·`idStrategy`·identity·복합 FK 중 하나가 채워야 한다. `GENERATED ALWAYS` 생성 컬럼과 `GENERATED ALWAYS` identity에는 쓸 수 없다.
- **결속과 메시지**: 이 계약은 target schema digest(fingerprint v3)에 들어간다. plan 뒤에 스키마나 표준 사전이 바뀌면 load가 digest 불일치로 멈추고, load는 실행 직전에 같은 검증을 다시 한다. 오류는 앞의 20건을 보여 주며 표·컬럼 이름과 타입·길이만 싣는다. 행 값·const·codemap 값은 싣지 않는다.

## production cutover 전 필수 보강

다음 항목이 닫히기 전에는 plan의 `commitReady=true`나 load의 PASS를 운영 이관 승인으로 사용하지 않는다.

1. **완료(2026-09-05):** `MappingLoader`가 source/target `endpointId`를 보존하도록 수정하고, [loader 회귀](../../migration-tool/src/test/java/nuri/migration/model/MappingLoaderEndpointBindingTest.java)와 [실제 YAML `discover` 회귀](../../migration-tool/src/test/java/nuri/migration/MigrationWorkflowRunnerTest.java)를 추가했다.
2. **구현 완료:** target 접속 위치·cluster/DB identity·허용 스키마를 승인 digest에 결속한다. 실제 도입 환경의 identity 조회 권한과 복제본·접속 경로는 별도로 확인한다. 이전 스키마 전용 digest의 plan은 다시 작성·승인한다.
3. PostgreSQL source/target과 Oracle·Tibero·MySQL·MariaDB·SQL Server·CUBRID adapter를 지원 버전·실제 driver·최소권한 계정으로 검증한다. 현재 vendor query 정의와 H2/mock 테스트는 실 DB 증거가 아니다.
4. charset/collation/timezone, quoted identifier, LOB와 vendor-specific type, 대용량 스트리밍을 익명화된 대표 데이터로 rehearsal한다.
5. **JSON 구현 완료:** 실행별 승인·mapping·target digest, 모드, 시각, 테이블별 건수·검증 상태를 보존한다. 원시 행·키·접속정보는 기록하지 않는다. `STARTED` 잔류는 결과 미확정이며 `DRY_RUN/PASS`는 실제 적재 완료가 아니다. 운영 승인자·백업·점검 창과의 결속은 배포 절차로 확보한다.
6. [부분 적재 복구 런북](../04-operations/migration-recovery-runbook.md)과 PostgreSQL 회귀가 마련돼 있다. 실제 프로세스 종료 후 체크포인트 재개·무중복·변조 탐지도 검증했다. self-reference 예약 keymap, commit ambiguity와 운영 백업 복원·cutover는 인수 환경에서 별도 승인·실증한다.
7. 기존 target 행 충돌·재실행·source 변경/삭제 정책을 정하고, 필요한 경우 staging 기반 제한적 upsert를 별도 설계한다. 현재 INSERT-only를 자동 overwrite로 확장하지 않는다.
8. 초기 이관 뒤 증분 동기화가 필요하면 watermark/CDC, 순서·중복·삭제·cutover freeze와 재처리 의미를 별도 구현·검증한다.
9. view·routine·trigger·grant 등 비데이터 객체의 `RECREATE_VIA_FLYWAY`·`REIMPLEMENT_IN_APP`·`EXTERNALIZE` disposition을 실제 Flyway/application 변경 및 owner 승인과 연결한다.

스키마 자체의 Expand-and-Contract 절차는 [zero-downtime-migration.md](zero-downtime-migration.md)의 영역이며, 데이터 cutover와 같은 것으로 간주하지 않는다.

## 검증 증거와 한계

```powershell
npm run verify:migration
```

현재 테스트 목록은 [migration-tool/src/test/java](../../migration-tool/src/test/java)와 실행 보고서가 정본이다. Mapping/artifact/adapter/discovery/visibility/plan binding, 실제 YAML endpoint binding, 외부 driver 격리, typed·composite·generated identity, 단일 source read session, chunk/row data-keymap-checkpoint 원자성, durable resume/checksum, PostgreSQL target 환경 결속과 strict 종료를 검사한다. [프로세스 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlCrashRecoveryPostgresIntegrationTest.java)는 격리 PostgreSQL의 1,501행·30MB 초과 text/bytea를 사용해 실제 자식 JVM 종료, 500행 체크포인트 재개, 재실행 무중복·변조 탐지를 검증한다. Docker가 필요한 경로와 로컬 실행 결과의 범위는 [검증 기록](../04-operations/readiness-followups.md#이관-프로세스-종료와-큰-필드)을 따른다. 다른 source vendor·운영 규모·권한·cutover/rollback 증거는 별도로 필요하다.

---
*표준 계약 검증 도입·보호 컬럼 암호화·표준 ID 형식·시퀀스 재설정 검토: 2026-10-13. 기관 도입·검증 진입점 검토: 2026-09-14. Target binding·실행 JSON·PostgreSQL 복구 검토: 2026-09-10. 운영 적용 여부는 별도 증거를 요구한다.*
