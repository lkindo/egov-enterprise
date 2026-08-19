# 레거시 데이터 이관 도구

> **상태: PARTIAL** — `migration-tool`은 온라인 애플리케이션과 분리된 선택형 offline ETL CLI다. 매핑·변환·키 재작성·배치 적재의 골격은 구현되어 있지만, 현재 상태만으로 production cutover를 승인하거나 이관 성공을 보증하지 않는다.

## 목적과 경계

레거시 소스 DB의 데이터를 현재 표준 스키마로 옮길 때 프로젝트별 차이를 코드에 하드코딩하지 않고 `mapping.yml`로 선언한다. 이 모듈은 `foundation`이나 온라인 런타임에 의존하지 않는 독립 `bootJar`이며, 이관이 필요한 프로젝트에서만 실행한다.

```text
mapping.yml
    │
    ▼
load → static validate → live source/target preflight → table order → stream/transform → batch write → verify/report
              │                                      │                              │
              └─ db_columns snapshot                 └─ key map + fkRef translation └─ mapping/result identity
```

## 현재 구현

| 단계 | 구현 | 현재 한계 |
|---|---|---|
| Load | Jackson YAML로 source/target, table/column, codemap을 로드하고 DB 연결 필드의 정확한 `${NAME}` 환경 변수를 치환 | 알 수 없는 속성·중복 YAML key·누락 환경 변수·부분 치환·비어 있지 않은 평문 password는 즉시 실패하지만 외부 secret provider 연동은 실행 환경 책임 |
| Validate | UTF-8 target 컬럼 snapshot, transform/type/codemap/fkRef·ID 전략·식별자·위험한 `where` 토큰을 fail-closed 검사한다. 동일 source 중복을 금지하고 `fkRef`에 source 컬럼과 완전한 부모 `idStrategy`를 요구하며, 실행 전에 JDBC metadata로 실제 source table/column/`sourceKey`와 target table/column을 exact-match한다. | snapshot 생성 계보·신선도와 타입·제약 의미까지는 스스로 증명하지 못함 |
| Order | `fkRef` 간선으로 부모 테이블 우선 위상 정렬 | 자기참조 트리는 별도 2-pass가 없음 |
| Transform | trim/대소문자 등 변환, 타입 변환, codemap, 상수 주입 | 프로젝트별 복합 구조 변환·LOB·PII 재암호화 SPI 미완 |
| Key mapping | `idStrategy`로 신규 키를 만들고 `fkRef`로 자식 FK를 재작성한다. checkpoint 이후 신규 대응은 해당 data chunk/row와 같은 target connection·transaction에서 `tb_migration_key_map`에 기록하며 rollback 시 pending·인메모리 mapping을 함께 제거한다. | keymap PK가 `(source_table, legacy_key)`뿐이라 source-system/run namespace가 없고, 테이블도 Flyway·감사 표준 밖에서 런타임 생성된다. |
| Execute | fetch-size 500 스트리밍과 chunk transaction을 사용한다. data와 해당 keymap을 함께 commit하고, batch 또는 정확한 `updateCounts` 증명 실패 시 chunk를 rollback한 뒤 각 행을 재변환해 data+keymap 단위로 원자 재시도한다. 실패 행 mapping은 제거하고 commit/rollback 결과 불확정은 fatal로 중단한다. | 뒤 chunk 실패 시 이미 commit된 앞선 chunk는 유지된다. DB 계정 권한 read-only, upsert·durable checkpoint/resume, 불확정 commit reconciliation, COPY/병렬 경로가 없다. |
| Verify | 선언된 mapping과 실행 결과의 cardinality·source→target identity, read/transformed/written/error와 target 전체 행 수를 비교한다. 빈 결과와 불일치는 FAIL이고 WARN/FAIL 모두 CLI non-zero 종료다. | FK·NOT NULL·UNIQUE·도메인·checksum·샘플 diff를 검증하지 않고 dry-run PASS는 cutover 준비 완료를 뜻하지 않음 |

구현 근거는 `migration-tool/src/main/java/nuri/migration`이며 활성 위험은 [.agent/memory/known-gaps.md](../../.agent/memory/known-gaps.md)의 `GAP-MIG-001`에서 추적한다.

## 매핑 계약

속성명은 `MappingSpec`의 현재 camelCase 계약을 그대로 사용한다. 특히 `idStrategy`, `sourceKey`, `fkRef`를 snake_case로 쓰면 로드 단계에서 실패한다. `${NAME}`은 DB 연결 필드의 전체 값일 때만 환경 변수로 치환하며, 누락 값이나 `jdbc:...${HOST}...` 같은 부분 치환은 실패한다. password는 테스트용 빈 값 외에는 반드시 `${NAME}`으로 주입하고, 같은 YAML key를 두 번 선언해 뒤 값으로 덮어쓸 수 없다. 한 source 테이블은 한 번만 매핑할 수 있으며, `fkRef` 컬럼에는 번역할 `source`와 `column`·`generator`·`sourceKey`가 모두 있는 부모 `idStrategy`가 필요하다.

```yaml
source:
  url: ${SOURCE_DB_URL}
  username: ${SOURCE_DB_USER}
  password: ${SOURCE_DB_PASSWORD}
  driver: org.postgresql.Driver

target:
  url: ${TARGET_DB_URL}
  username: ${TARGET_DB_USER}
  password: ${TARGET_DB_PASSWORD}
  driver: org.postgresql.Driver

tables:
  - source: LEGACY_USER
    target: tb_user_info
    where: "USE_YN = 'Y'"
    idStrategy:
      column: esntl_id
      generator: USR
      sourceKey: USER_NO
    columns:
      - { source: USER_ID, target: user_id, transform: trim }
      - { source: USER_NM, target: user_nm, transform: trim }
      - { source: REG_DT, target: crt_dt, type: timestamp }
      - { source: STAT, target: user_stts_cd, codemap: user_status }
      - { target: frst_rgtr_id, const: MIGRATION }

  - source: LEGACY_POST
    target: tb_bbs_item
    columns:
      - { source: USER_NO, target: user_id, fkRef: LEGACY_USER }

codemaps:
  user_status:
    "1": A
    "0": D
    default: P
```

`where`와 객체명은 신뢰된 매핑 파일에서만 받아야 한다. 객체명은 식별자 검사를 거치고 `where`의 세미콜론·주석·DDL/DML 키워드는 차단하지만, 이 정적 필터가 SQL 의미 안전성을 완전히 증명하지는 않는다.

## 실행

기본 모드는 쓰지 않는 `dry-run`이며 허용값은 정확히 `dry-run`과 `commit`뿐이다. 오타, mapping/source/table 누락, commit의 target 누락, 정적·live validation 실패, 빈/불일치 실행 결과, 최종 WARN 또는 FAIL은 프로세스를 non-zero로 종료한다. live source 검증은 target 연결·keymap 생성·적재보다 먼저 실행된다.

```powershell
./gradlew :migration-tool:bootRun --args="--mapping=mapping.yml --mode=dry-run"
./gradlew :migration-tool:bootRun --args="--mapping=mapping.yml --mode=commit"
```

배포용 JAR은 `./gradlew :migration-tool:bootJar`로 만든 뒤 `migration-tool/build/libs/`의 실제 산출물 이름을 사용한다. 접속정보는 환경 변수나 승인된 secret provider로 주입하고 파일에 평문 저장하지 않는다.

## production cutover 전 필수 보강

다음 항목이 닫히기 전에는 CLI 로그의 PASS를 운영 이관 승인으로 사용하지 않는다.

1. fail-closed snapshot의 생성 계보·신선도를 검증하거나 승인된 read-only live metadata와 대조한다.
2. source 계정을 DB 권한 수준에서도 read-only로 제한하고 벤더별 transaction 동작을 실증한다.
3. keymap·run metadata 테이블을 Flyway·감사 표준에 편입하고 source-system/run namespace, upsert·durable checkpoint/resume를 정의한다.
4. 뒤 chunk 실패 시 유지되는 앞선 commit과 commit/rollback 결과 불확정 상태를 판별·조정하는 reconciliation 및 복구 절차를 정의한다.
5. FK, NOT NULL, UNIQUE, 도메인, checksum 또는 합계, 표본 diff를 이관 후 검증한다.
6. 실제 대상 DBMS별 dialect, driver 배포 조건, 문자셋, quoting, LOB를 검증한다.
7. 익명화된 대표 데이터로 source→target 실 DB E2E를 실행하고 기계 판독 가능한 JSON/Markdown report artifact를 보존한다.
8. backup, rollback, reconciliation, cutover/rollback 의사결정자를 포함한 운영 런북을 승인받는다.

스키마 자체의 Expand-and-Contract 절차는 [zero-downtime-migration.md](zero-downtime-migration.md)의 영역이며, 데이터 cutover와 같은 것으로 간주하지 않는다.

## 검증

```powershell
./gradlew :migration-tool:test
```

이 테스트는 매핑·변환·키맵·위상정렬·live source/target preflight·JDBC batch 결과 판정·mapping/result identity·strict 종료 신호를 검증한다. H2 통합 테스트는 keymap write 실패 시 같은 transaction의 data rollback, 실패 행 mapping 제거와 자식 FK 차단, 재실행 시 기존 key identity 재사용도 확인한다. Testcontainers 의존성은 선언돼 있지만 migration-tool 테스트에서 실제 PostgreSQL 컨테이너를 기동하지 않으므로, 실제 레거시 DBMS·commit ambiguity reconciliation·운영 규모·계정 권한·cutover 복구 증거는 별도로 수집해야 한다.

---
*Verified against current `migration-tool` implementation and GAP-MIG-001: 2026-08-19*
