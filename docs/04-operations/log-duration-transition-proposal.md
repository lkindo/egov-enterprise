# 로그 처리 소요량 표준 전환 적용 패킷

`tb_sys_log`·`tb_web_log`의 밀리초 소요량을 승인된 **처리소요밀리초 / PRCS_REQ_MSEC / 밀리초N19**로 맞춘다([ADR-0046](../02-architecture/decisions/ADR-0046-empty-numeric-transition-and-log-duration-standard.md)). 사용자는 숫자 3개 적용 완료 뒤 2026-10-30 “로그2개 도 진행”을 지시했다. 이번 범위는 두 로그의 메타 등록·Expand·Sync·앱 Redirect이며, 구 컬럼 제거는 별도 Contract다. 이 문서는 구현·검증·실행 원본을 연결하며 실제 적용 결과는 [공유 OCI 적용 로그](shared-oci-migration-apply-log.md)의 기록 규칙에 따라 남긴다.

| D-n | 결정 | 관련 H | 영향 계약 파일 | 부정 시험 |
|---|---|---|---|---|
| D-1 | BIGINT·밀리초·NULL·API prcsTm 보존 | H1 | Entity·DTO·V2_145 | NULL·64비트·기존 DTO 형식 |
| D-2 | 구 writer와 공존하는 새 컬럼·양방향 트리거 | H1·H3 | V2_145 | 메타/객체 충돌·서로 다른 값 거부 |
| D-3 | 500행씩 Sync 후 전체 대사 0을 V2_146이 확인 | H1·H5 | 운영 SQL·배치 실행기·V2_146 | 잠긴 잔여 행·정의/RLS/메타 변조·미완료 Redirect 거부 |
| D-4 | 구 컬럼·메타·이력 보존, 후속 Contract에서 정리 | H2 | 복구 후보·배포/관측 | 철회 시 불일치·외부 의존성 거부 |

## 대상과 실측

2026-10-30 19:16 KST 공유 개발 PostgreSQL 17.9/public을 읽기 전용으로 재확인했다. Flyway는 2.144이고 두 `prcs_tm`은 BIGINT NULL/기본값 없음이다. 시스템 로그 71행(0~169ms), 웹 로그 36,473행(0~2,750ms), NULL 0이다. 새 단어·도메인·용어·컬럼·사용자 트리거는 없었고 publication/subscription 및 다른 DB 접속도 0이었다. 적용 직전에 다시 확인한다.

| 대상 | 기존 호환 구조 | 새 구조 |
|---|---|---|
| 두 로그 표 | prcs_tm BIGINT NULL | prcs_req_msec BIGINT NULL, 기본값 없음 |
| 단어 | 처리/PRCS·소요/REQ 재사용 | 밀리초 / MSEC / 대표 Y |
| 도메인 | 기존 도메인 유지 | 수량 / 밀리초N19 / BIGINT / 19 |
| 용어 | PRCS_TM 표준 유지 | 처리소요밀리초 / PRCS_REQ_MSEC / 밀리초N19 / 폐기 N |
| Java·API | Long prcsTm 및 기존 DTO | 이름·밀리초·NULL 유지, Entity 물리 매핑만 새 컬럼 |

`PRCS_TM`의 기존 시각 표준을 고치거나 값을 시각으로 포맷하지 않는다. 초로 나누거나 범위를 좁히지도 않는다. 메타 N19는 BIGINT의 십진 자릿수 표기이며 NUMERIC(19,0)의 전체 범위가 아니다. 시스템 로그 API의 기존 문자열 제약과 웹 로그 API의 JavaScript number 한계도 유지한다. DB의 64비트 보존을 API 전체 범위의 무손실 보장으로 확대하지 않는다. 숫자 3개는 [별도 적용 패킷](numeric-column-transition-proposal.md)의 완료 범위이며 `ans_lv`는 보류다.

## 실행 원본과 단계

SQL 정본을 테스트 리소스에서 운영 경로로 승격했다. 같은 SQL의 복사본을 유지하지 않는다.

- [V2_145 Expand](../../api-server/src/main/resources/db/migration/V2_145__expand_log_duration_milliseconds.sql): 정확한 메타 3행, 새 컬럼 2개, 함수·트리거 각 2개. 기존 행 백필과 기존 메타 UPDATE는 하지 않는다.
- [Sync SQL](../../api-server/src/main/resources/db/operations/log-duration/backfill.sql)·[전체 대사](../../api-server/src/main/resources/db/operations/log-duration/verify-parity.sql): 한 트랜잭션에 표마다 최대 500행, 합계 최대 1,000행. 비NULL 새 값의 drift는 덮지 않고 실패한다.
- [배치 실행기](../../scripts/backfill-log-duration.mjs): 기본 읽기 전용. 두 모드 모두 정확한 호스트·DB 이름과 main에 포함된 소스 커밋이 필요하며, 쓰기에는 --apply도 필요하다. 실행기·두 migration·운영 SQL을 Git 원본과 대조하고 검증한 SQL 스냅샷으로 실행한다. V2_145 성공 이력·객체 정의·대사가 어긋나면 쓰기를 시작하지 않는다.
- [V2_146 전환 조건](../../api-server/src/main/resources/db/migration/V2_146__require_log_duration_parity_before_redirect.sql): 메타·함수 본문·트리거·표 형태를 확인하고 두 표의 NULL 포함 불일치가 모두 0일 때 성공한다. 백필·보정 DML은 하지 않는다.
- 새 앱은 SysLog·WebLog의 prcsTm을 새 컬럼으로 매핑한다. dev 감사 로그 시드는 과거 2.99 초기화와 호환되도록 구 컬럼을 계속 사용하고 트리거가 새 컬럼에도 반영한다. 명시적으로 승인한 로컬 폐기용 E2E 초기화는 실제 Expand → 배치 Sync → V2_146 순서로 진행한다. 과거 Flyway·fixture는 보존한다.
- [앱 시작 검사](../../api-server/src/main/java/nuri/api/config/LogDurationReadinessConfig.java)는 원격 Flyway가 꺼져 있어도 JPA 초기화 전에 읽기 전용으로 컬럼·활성 트리거·함수 본문을 검사한다. V2_146 또는 생성된 V1_0 baseline의 성공 이력이 있으면 카탈로그만 확인해 로그 규모에 따른 기동 지연을 피한다. 이행 중이거나 완료 이력이 없는 환경은 NULL 포함 전체 대사도 수행하고 Sync 미완료 시 기동을 거부한다. 로그 기능이 없는 재사용 구성은 대상 표가 모두 없을 때 검사 대상에서 빠진다.

**공유 DB는 main 병합본만 적용한다.** dev runner는 원격 Flyway를 끄고 JPA validate로 시작하므로, 새 매핑의 병합과 스키마/Sync 적용은 같은 승인 정비창에서 묶는다. 새 코드를 V2_145 이전 DB에서 시작하지 않는다.

1. writer·DDL 작업을 확인하고 정비창을 확보한다. 현재 타입·NULL·기본값·PK·메타·RLS·트리거·상속·RULE·의존성과 복제를 재확인한다. 구독 측 스키마/trigger를 검증하지 않은 복제 환경은 보류한다.
2. 적용 직전 pg_dump 백업을 만들고 대상 표·메타·Flyway 이력 목차를 확인한다. 격리 PostgreSQL에서 public 스키마 복원과 로그 행 수·원문 행 해시 대사를 확인한다. 비밀·원문 로그·사용자·URL·IP·백업 경로를 PR·이 문서·공용 메모리에 기록하지 않는다.
3. 최신 PR HEAD의 required CI 확인 뒤 병합하고, 병합 커밋의 migration 폴더를 원본 바이트로 추출한다. info가 예상한 V2_145·V2_146만 대기로 보고하는지 확인한다. seed-dev를 공유 DB 적용 위치에 넣지 않는다.
4. Flyway target=2.145로 Expand만 적용한다. 메타 3표 → sys → web 순서로 NOWAIT 잠금을 잡는다. 새 메타·컬럼·함수·트리거를 확인한다. 구 writer는 계속 구 컬럼을 사용할 수 있다.
5. 전용 실행기로 Sync한다. 매 배치는 메타 SHARE → sys ROW EXCLUSIVE → web ROW EXCLUSIVE 순서이며 READ COMMITTED·origin·메타/함수/트리거/표 형태를 검사한다. 실패한 배치는 전체 롤백하고 중단한다. 앞서 커밋한 배치는 보존되며 재실행하면 잔여 행부터 진행한다.
6. SKIP LOCKED의 변경 0행만으로 완료를 판단하지 않는다. 전체 대사의 pending·nonnull drift·NULL 포함 mismatches가 모두 0이어야 한다. 잔여 행이 있는데 0행을 바꾸면 LOCKED_PENDING_ROWS로 중단한다.
7. Flyway target=2.146으로 전환 조건을 적용하고 validate한다. 적용 전후의 기존 모든 열을 해시로 대사해 값·NULL·행 수·PK·감사 필드 보존을 확인한다. 새 읽기·새 쓰기는 이 단계 성공 뒤 활성화한다.
8. 새 앱 validate 기동 및 JPA/서비스·DTO 검증을 수행한다. 새 컬럼 단독 쓰기·구 writer 호환·NULL·단위·대사와 시험 행 정리를 확인한 뒤 정비창을 종료한다. 실행 결과를 공유 OCI 적용 로그에 남긴다.

소스 커밋은 실제 병합 SHA로 채운다. 실행기는 자격증명 값을 인자로 받거나 출력하지 않는다.

```powershell
# 기본 읽기 전용. DB_URL·DB_HOST·DB_USERNAME·DB_PASSWORD는 기존 환경으로 주입한다.
node --env-file=.env scripts/backfill-log-duration.mjs --expected-host <검증한-호스트> --expected-database egovdb --source-commit <병합-SHA>

# V2_145 적용·정확한 대상·소스 확인 뒤에만 실행한다.
node --env-file=.env scripts/backfill-log-duration.mjs --expected-host <검증한-호스트> --expected-database egovdb --source-commit <병합-SHA> --apply --max-batches 200 --max-runtime-ms 300000
```

## 예산·환경별 중단과 재개

각 SQL 트랜잭션은 PostgreSQL 17의 transaction_timeout=15s, 문장 5초, 잠금 3초를 사용한다. 전체 제한을 넘으면 서버가 연결을 종료하고 해당 트랜잭션을 되돌린다. 정비창 전체나 앱 기동 시간이 15초라는 뜻은 아니다. 실행 시간 예산은 **배치 사이**에서 확인하며 진행 중인 트랜잭션의 상한은 서버가 담당한다. timeout을 늘리거나 autovacuum/보호를 꺼서 우회하지 않는다.

NOWAIT가 55P03으로 실패하면 `pg_stat_progress_vacuum`과 다른 잠금 보유자를 확인하고, 롤백·이력 부재를 확인한 뒤 원인이 끝나면 같은 단계부터 재시도한다. Sync 직후 autovacuum도 원인이 될 수 있다. 실행기는 알려지지 않은 URL 옵션·중복 옵션·TLS 설정 충돌을 거부한다. `currentSchema=public`과 JDBC 전용 정수 `prepareThreshold`만 호환하며 `sslmode=disable/require/verify-full`을 명시적으로 처리한다. TLS 인증서 검증은 기본으로 유지한다.

로그가 없는 신규 DB는 V2_145·V2_146을 같은 체인으로 통과한다. 이후 dev 시드/앱의 새 쓰기는 트리거로 구 컬럼에도 반영된다. 기존 로그가 있는 환경은 V2_145 → Sync → V2_146 순서다. 전체 migrate를 먼저 실행해 V2_146이 실패해도 가드 제거·이력 repair를 하지 않는다. V2_145 성공·V2_146 대기를 확인하고 승인된 Sync 뒤 재시도한다.

추가 읽기 조회에서 실제 로그 행의 최대 크기는 두 표 모두 184바이트였다. 격리 시험은 같은 71/36,473행에 최소 184바이트 이상의 합성 행을 사용했다. 73개 배치와 시작·중간·종료 EXPLAIN (ANALYZE, BUFFERS)를 확인했으며, 첫 표적 실행에서 웹 로그 UPDATE 계획은 약 20ms 이내였다. 따뜻한 캐시의 격리 결과이며 공유 DB의 네트워크·잠금·디스크 시간 보장은 아니다. 실제 적용도 같은 5초/15초 예산 안에서 측정하고 초과하면 중단한다.

매 배치는 비NULL drift를 전수 검사하고 기본키 앞부분에서 미이행 행을 찾는다. 500행 상한은 갱신량을 제한하며 스캔량을 제한하지 않는다. 이 규모의 검증을 수백만 행 처리 능력으로 확대하지 않는다. 더 큰 환경은 행 수·행 폭·시작/중간/종료 계획을 따로 검증하고 필요하면 keyset/부분 인덱스를 별도 설계한다.

지원 writer는 한쪽 표현만 바꾼다. SET 절에 양쪽을 명시해도 한쪽 값이 원래와 같으면 SQL의 의도를 판별할 수 없다. 백필 전 (구 값, 새 NULL)에 새 NULL을 쓰는 것도 명시적 삭제와 구분할 수 없다. 새 읽기·쓰기는 전체 대사 뒤 활성화한다. 구 컬럼을 읽는 SQL·BI·ETL은 구 컬럼과 동기화가 남는 동안 호환되지만, 구 사용 0의 증거는 저장소 검색만으로 확보하지 않는다.

완료 이력 뒤에도 양방향 트리거를 우회해 로그를 적재하지 않는다. `session_replication_role=replica`, 트리거 비활성화, `--disable-triggers` 적재는 이 호환 계약을 깨뜨린다. 후속 Contract 전에는 완료 이력과 별개로 NULL 포함 전체 대사를 다시 수행한다.

## 복구와 후속 Contract

Expand 실패는 메타·DDL 전체를 롤백한다. sequence가 소비한 번호는 되돌리지 않는다. Sync 실패는 해당 배치만 롤백한다. commit 응답이 끊겼다면 먼저 전체 대사로 실제 상태를 확인한다. drift를 임의로 덮거나 0·빈값으로 바꾸지 않는다.

Redirect 뒤 구 앱으로 복귀할 때는 구 컬럼·양방향 트리거·대사를 확인하고 메타·이력을 보존한다. 스키마 철회는 [후보 SQL](../../api-server/src/test/resources/db/proposals/log-duration/rollback.sql)을 후속 versioned Flyway·정확한 승인·ZDM waiver로 확정한 뒤 수행한다. 자동 실행하지 않는다. 새 소비자가 없고 새 비NULL 불일치가 0일 때 두 표를 잠그고 트리거 → 함수 → 새 컬럼 순서로 제거하며 CASCADE를 쓰지 않는다.

구 prcs_tm 제거는 [DB 헌법 제7조](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)·[무중단 이행 가이드](../02-architecture/zero-downtime-migration.md)의 후속 Contract다. 선행 Expand의 실제 배포/릴리스 기록, 최소 7일 관측, 구 소비자 0, 새 대사 0, 정확한 삭제 승인·waiver가 필요하다. 이번 지시를 관측 기간의 예외나 즉시 DROP 승인으로 확대하지 않는다. 실제 배포 사실이 없는 릴리스 태그나 관측 완료 기록을 만들지 않는다.

Contract의 선행 앱 릴리스에서는 시작 검사의 구 컬럼 비교도 제거해야 한다. 현재 호환 단계의 대사 검사를 남긴 채 구 컬럼부터 DROP하지 않는다.

## 검증 경로

기존 schema-validation 경로에서 검증한다. 새 파이프라인이나 검사 제외를 만들지 않는다.

- LogDurationTransitionMigrationIntegrationTest: 실제 V2_145/운영 SQL을 읽는다. 메타 충돌·동시 등록·NULL/64비트·501행·양방향 writer·잠긴 잔여 행·철회 보존을 검사한다. 승격된 과거 이행 시험은 기존 MigrationIntegrationTest 분류를 사용하며, V2 이력이 없는 생성물에서는 기존 생성기가 걷고 현재 V1 스키마의 JPA 시험은 유지한다.
- LogDurationMigrationIntegrationTest: 실제 Flyway·미완료 거부와 이력 부재, 71/36,473행·보수적 행 폭·73배치·계획/버퍼·기존 행 해시·함수/RLS/메타 변조 거부를 검사한다. 실제 PG 최소 Spring context로 JPA 초기화 전 차단·완료 후 heap 조회 없음·트리거 비활성 거부를 확인하고 dev 시드를 포함한 실제 폐기용 E2E 초기화도 실행한다.
- LogDurationJpaIntegrationTest: SQL 수집기로 새 컬럼만 INSERT함을 확인하고 구 writer·NULL·64비트·실제 시스템/웹 DTO 형식을 검사한다.
- 기존 로그 PK 이행 시험은 과거 fixture·검증을 보존하고 명시적인 Expand → Sync → 전환 조건을 추가했다.
- scripts/backfill-log-duration.test.mjs는 기존 운영 계약 glob에서 커밋/롤백·재개·0행 오판·drift/정의/이력·500행·예산·미병합/변조 소스 거부를 확인한다.

격리 시험·정적 검색은 공유 DB 적용, 외부 소비자 종료, 운영 백업 복원, 무중단 보장을 대신하지 않는다. 실행 사실은 해당 커밋의 로그·CI와 실제 적용 기록으로 판단한다.
