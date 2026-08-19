# 레거시 데이터 이관 도구

> **상태: PARTIAL** — `migration-tool`은 온라인 애플리케이션과 분리된 선택형 offline ETL CLI다. 매핑·변환·키 재작성·배치 적재의 골격은 구현되어 있지만, 현재 상태만으로 production cutover를 승인하거나 이관 성공을 보증하지 않는다.

## 목적과 경계

레거시 소스 DB의 데이터를 현재 표준 스키마로 옮길 때 프로젝트별 차이를 코드에 하드코딩하지 않고 `mapping.yml`로 선언한다. 이 모듈은 `foundation`이나 온라인 런타임에 의존하지 않는 독립 `bootJar`이며, 이관이 필요한 프로젝트에서만 실행한다.

```text
mapping.yml
    │
    ▼
load → validate → table order → stream/transform → batch write → verify/report
          │                              │
          └─ db_columns snapshot         └─ key map + fkRef translation
```

## 현재 구현

| 단계 | 구현 | 현재 한계 |
|---|---|---|
| Load | Jackson YAML로 source/target, table/column, codemap을 로드 | 알 수 없는 속성을 무시하므로 오타가 조용히 누락될 수 있음 |
| Validate | target 컬럼 snapshot, transform/type/codemap/fkRef 참조 검사 | `db_columns.json` 부재·파싱 실패와 일부 위험을 warning으로 허용함 |
| Order | `fkRef` 간선으로 부모 테이블 우선 위상 정렬 | 자기참조 트리는 별도 2-pass가 없음 |
| Transform | trim/대소문자 등 변환, 타입 변환, codemap, 상수 주입 | 프로젝트별 복합 구조 변환·LOB·PII 재암호화 SPI 미완 |
| Key mapping | `idStrategy`로 신규 키 생성, `fkRef`로 자식 FK 재작성, `tb_migration_key_map`에 대응 저장 | 키맵 저장 실패를 현재 실행 실패로 승격하지 않음 |
| Execute | fetch-size 500 스트리밍, 청크 트랜잭션·batch insert, 실패 시 행 단위 격리 | upsert/checkpoint/resume/COPY/병렬 경로 없음 |
| Verify | read/transformed/written/error와 target 전체 행 수를 비교해 PASS/WARN/FAIL | FK·NOT NULL·UNIQUE·도메인·checksum·샘플 diff를 검증하지 않으며 CLI 종료 코드에 FAIL이 반영되지 않음 |

구현 근거는 `migration-tool/src/main/java/nuri/migration`이며 활성 위험은 [.agent/memory/known-gaps.md](../../.agent/memory/known-gaps.md)의 `GAP-MIG-001`에서 추적한다.

## 매핑 계약

속성명은 `MappingSpec`의 현재 camelCase 계약을 그대로 사용한다. 특히 `idStrategy`, `sourceKey`, `fkRef`를 snake_case로 쓰면 무시될 수 있다.

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

`where`와 객체명은 신뢰된 매핑 파일에서만 받아야 한다. 객체명은 식별자 검사를 거치지만 `where`는 SQL 조각으로 직접 결합된다.

## 실행

기본 모드는 쓰지 않는 `dry-run`이다.

```powershell
./gradlew :migration-tool:bootRun --args="--mapping=mapping.yml --mode=dry-run"
./gradlew :migration-tool:bootRun --args="--mapping=mapping.yml --mode=commit"
```

배포용 JAR은 `./gradlew :migration-tool:bootJar`로 만든 뒤 `migration-tool/build/libs/`의 실제 산출물 이름을 사용한다. 접속정보는 환경 변수나 승인된 secret provider로 주입하고 파일에 평문 저장하지 않는다.

## production cutover 전 필수 보강

다음 항목이 닫히기 전에는 CLI 로그의 PASS를 운영 이관 승인으로 사용하지 않는다.

1. validation/report FAIL과 필수 warning을 non-zero process exit로 연결한다.
2. target schema를 live metadata 또는 fail-closed snapshot으로 검증하고 snapshot 부재 시 중단한다.
3. source 연결을 read-only 계정과 JDBC read-only transaction으로 강제한다.
4. 키맵·checkpoint·재실행·부분 실패의 원자성과 복구 절차를 정의한다.
5. FK, NOT NULL, UNIQUE, 도메인, checksum 또는 합계, 표본 diff를 이관 후 검증한다.
6. 실제 대상 DBMS별 dialect, driver 배포 조건, 문자셋, quoting, LOB를 검증한다.
7. 익명화된 대표 데이터로 source→target 실 DB E2E를 실행하고 report artifact를 보존한다.
8. backup, rollback, reconciliation, cutover/rollback 의사결정자를 포함한 운영 런북을 승인받는다.

스키마 자체의 Expand-and-Contract 절차는 [zero-downtime-migration.md](zero-downtime-migration.md)의 영역이며, 데이터 cutover와 같은 것으로 간주하지 않는다.

## 검증

```powershell
./gradlew :migration-tool:test
```

이 테스트는 매핑·변환·키맵·위상정렬·H2/테스트 컨테이너 경로를 검증한다. 실제 레거시 DBMS, 운영 규모, 계정 권한, cutover 복구를 검증한 증거는 별도로 수집해야 한다.

---
*Verified against current `migration-tool` implementation and GAP-MIG-001: 2026-08-19*
