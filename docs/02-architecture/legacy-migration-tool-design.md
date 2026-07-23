# 레거시 데이터 이관 도구 설계 (Legacy Data Migration Tool — Design / Phase 4a)

> **목적**: 기존(레거시) 프로젝트를 본 프레임워크로 **재개발**할 때, 레거시 소스 DB의 데이터를 본 프레임워크의 **표준 스키마(V2_0 baseline)** 로 안전하게 이관한다.
> **위치**: 재사용성 로드맵 §5의 최상위 공백 "레거시 데이터 이관 지원"의 실체화. 본 문서는 **Phase 4a(설계)** 이며, **Phase 4b(골격 구현)** 의 계약(contract)을 확정한다.
> **작성**: 2026-07-11 · Claude Code · **등급**: L2(신규 서브시스템 설계)
> **⚠ 현황(2026-07-23)**: Phase 4b 골격(2026-07-11 `17042a105`, 14 클래스)에 더해 **2026-07-23 완성도 보강**이 적재됐다 — 키 재매핑 레지스트리(keystone)·`idStrategy`/`type` 死 DSL 활성화·FK 위상정렬·스트리밍/배치/트랜잭션 write·실증 검증기(PASS/WARN/FAIL). 구현 현황과 잔여 로드맵은 **§7**을 SSOT 로 참조한다. (§5/§6 은 초기 골격 시점 기록으로 보존.)

---

## 0. 한 문단 요지
레거시 소스 스키마는 프로젝트마다 다르므로 도구는 **소스 무지(source-agnostic)** 여야 한다. 핵심은 **선언적 매핑 DSL**(소스 테이블·컬럼 → 표준 테이블·컬럼 + 타입/코드 변환)을 진실원천으로 삼고, ① 소스 인트로스펙션 → ② 매핑 검증(meta 표준 대조) → ③ ETL 실행(배치·트랜잭션·재개) → ④ 이관 후 무결성 검증 리포트의 4단계 파이프라인으로 구성한다. 표준 명명·타입은 이미 존재하는 **`meta_standard_words/terms/domains` SSOT**(DB 헌법 제2조)와 **`db_columns.json`** 을 재사용해 강제한다.

---

## 1. 설계 원칙 (Constraints)
1. **소스 무지**: 소스 스키마를 하드코딩하지 않는다. 소스 접속정보 + 매핑 파일만으로 동작한다.
2. **표준 강제**: 타깃 컬럼/테이블은 `meta_standard_*` 와 `V2_0 baseline` 에 실재하는 것만 허용(DB 헌법 제2조). 매핑 검증 단계에서 위반을 빌드 실패로 차단.
3. **비파괴·재개 가능**: 소스는 읽기 전용. 타깃 쓰기는 배치·트랜잭션·체크포인트로 중단 후 재개 가능. dry-run 우선.
4. **증거 기반 완료**: 이관 후 행수·제약·널·고아·샘플 diff 리포트 없이는 "완료" 없음(오케스트레이션 §4).
5. **프레임워크 정합**: Flyway(타깃 스키마)·`db-bridge`·`ApiResponse`/`BusinessException` 규범 재사용. 신규 접속 스택 도입 금지.

---

## 2. 아키텍처 — 4단계 파이프라인

```
[소스 DB] --(1)introspect--> [SourceCatalog]
                                   |
[mapping.yml] --(2)validate(meta 표준·baseline 대조)--> [ValidatedPlan]
                                   |
                          (3)execute(batch/tx/checkpoint, dry-run|commit)
                                   |
                             [타깃 표준 DB] --(4)verify--> [MigrationReport]
```

### 2.1 컴포넌트 배치(모듈)
- 신규 Gradle 모듈 **`migration-tool`**(독립 실행 Spring Boot CLI, `api-server` 미의존). 코어 재사용 위해 `foundation` 만 의존.
- 파생 프로젝트는 이 모듈을 **선택적으로** 포함(이관 시에만). 프레임워크 코어와 분리되어 삭제/유지가 자유롭다.
- 실행: `java -jar migration-tool.jar --mapping=mapping.yml --mode=dry-run|commit`.

### 2.2 단계별 계약

**① SourceIntrospector** — 소스 `information_schema` 조회 → `SourceCatalog`(테이블·컬럼·타입·PK/FK·행수). JDBC 범용(PostgreSQL/Oracle/MySQL 드라이버 런타임 주입). **읽기 전용**.

**② MappingValidator** — `mapping.yml`(§3) 로드 → 타깃 이름을 `meta_standard_terms`/`db_columns.json`/`V2_0 baseline` 과 대조. 위반(비표준 컬럼·부재 테이블·타입 불일치·미매핑 NOT NULL) 발견 시 **중단·리포트**. 산출물 `ValidatedPlan`.

**③ EtlExecutor** — plan 순회. 테이블별로:
  - 소스 배치 SELECT(커서/keyset 페이징) → 행 변환(리네임·타입변환·코드매핑·기본값) → 타깃 배치 INSERT/UPSERT(트랜잭션).
  - **체크포인트**(`migration_checkpoint` 테이블: 테이블명·마지막 오프셋)로 재개.
  - `dry-run`: 변환만 수행·카운트·오류 집계(쓰기 없음). `commit`: 실제 적재.
  - FK 순서: plan 의 위상정렬(부모 먼저)로 참조 무결성 보장.

**④ MigrationVerifier** — 소스 행수 vs 타깃 행수, NOT NULL/FK/UNIQUE 제약 위반 스캔, 코드값 도메인 적합성(`meta_standard_domains`), 샘플 N행 소스↔타깃 diff → `MigrationReport`(JSON + 사람용 md).

---

## 3. 매핑 DSL (mapping.yml) — 진실원천

```yaml
# 소스 접속 (읽기 전용)
source:
  url: ${SOURCE_DB_URL}
  username: ${SOURCE_DB_USER}
  password: ${SOURCE_DB_PASSWORD}
  driver: org.postgresql.Driver

# 테이블 매핑 (타깃은 V2_0 baseline·meta 표준에 실재해야 함)
tables:
  - source: LEGACY_USER          # 소스 테이블
    target: tb_user_info         # 표준 타깃(검증됨)
    where: "use_yn = 'Y'"        # 선택 필터
    columns:
      - { source: USER_ID,   target: user_id }                       # 1:1
      - { source: USER_NM,   target: user_nm, transform: trim }      # 변환함수
      - { source: REG_DT,    target: frst_regist_pnttm, type: timestamp } # 타입변환
      - { source: STAT,      target: user_stts_cd, codemap: user_status } # 코드매핑
      - { target: frst_rgtr_id, const: "MIGRATION" }                 # 상수 주입(소스 없음)
    id_strategy: { column: esntl_id, generator: USR }                # 표준 ID 생성기 연동

# 코드값 매핑 테이블 (레거시 코드 → 표준 공통코드)
codemaps:
  user_status:
    "1": "A"      # 활성
    "0": "D"      # 삭제
    default: "P"  # 미매핑 기본
```

- **transform**: 내장(trim/upper/lower/date-format/substring) + 확장 가능한 `Transformer` SPI.
- **codemap**: 레거시 코드 → 표준 공통코드(`tb_com_cd` 검증). `default` 로 미매핑 방어.
- **const**: 소스에 없는 표준 감사컬럼(frst_rgtr_id 등) 상수/기본 주입.
- **id_strategy**: 표준 ID 생성기(`IdGenerationUtil` prefix) 연동해 esntl_id 등 생성.

---

## 4. 기존 자산 재사용
| 자산 | 용도 |
|---|---|
| `meta_standard_words/terms/domains` (DB 헌법 2조) | 타깃 컬럼/타입/도메인 표준 검증 |
| `db_columns.json` | 타깃 실재 컬럼 인벤토리(빠른 대조) — **§gap-codegen 의 고아 아티팩트에 실 소비처 부여** |
| `V2_0__baseline.sql` | 타깃 스키마 진실원천(테이블·제약) |
| `IdGenerationUtil`(UUID 절단) + `@GeneratedValue(SEQUENCE)`/`nextval` | 표준 PK 생성 |
| `db-bridge.js` | 개발 중 소스/타깃 수동 점검 |
| Flyway | 타깃 스키마는 이관 전 `flyway migrate` 로 준비(빈 DB 부팅 실증됨) |

---

## 5. Phase 4b 구현 (골격 순서 — 2026-07-11 `17042a105` 구현 완료)
1. `migration-tool` 모듈 + Spring Boot CLI 골격(`ApplicationRunner`, `--mode` 옵션).
2. `mapping.yml` 스키마 + Jackson 바인딩 + `MappingValidator`(meta 표준 대조) — **가장 먼저**(잘못된 매핑을 조기 차단).
3. `SourceIntrospector`(information_schema) + `SourceCatalog`.
4. `EtlExecutor` dry-run(변환·카운트만) → `Transformer`/`CodeMapper` SPI.
5. `EtlExecutor` commit(배치·트랜잭션·`migration_checkpoint` 재개) + FK 위상정렬.
6. `MigrationVerifier` + `MigrationReport`(JSON/md).
7. **검증**: Docker 빈 Postgres 에 소스(샘플 레거시 덤프)→타깃(V2_0) 이관 E2E 스모크 + 리포트 확인.

> **미확정(실 소스 필요)**: 구체 transform/codemap 규칙·성능 튜닝(배치 크기·병렬)·특수 타입(ARIA 암호화 PII 재암호화는 [crypto-key-rotation.md](../04-operations/crypto-key-rotation.md) 연계)은 **실제 레거시 소스 스키마 확보 시** 확정한다. 본 설계는 그 골격과 확장점(SPI)을 규정한다.

---

## 6. 검증 로그
- 본 문서는 **설계(Phase 4a)** 로 작성됐고, **Phase 4b(골격)는 2026-07-11 `17042a105` 로 구현 완료**(migration-tool 14 클래스 + `MigrationPipelineTest`). 실 레거시 소스 확보 시 transform/codemap 규칙·성능 튜닝을 확정하며, 그 전 DB 헌법(제2조 메타 SSOT) 및 §4 자산 재조회가 필요하다.
- 관련: [framework-reusability-assessment.md](./framework-reusability-assessment.md) §5, [getting-started.md](../03-guides/getting-started.md) §6.5.

---

## 7. 구현 현황 & 잔여 로드맵 (2026-07-23 — 완성도 보강 후 SSOT)

> 8차원 복합-시나리오 감사(Workflow) 결과를 기준으로, 초기 골격(PoC ≈ happy-path PG→PG 1:1)에서 **참조 무결성·엔진 견고성·실증 검증** 축을 끌어올렸다. 아래가 실제 코드 기준 현황이다.

### 7.1 이번에 구현된 것 (테스트로 증명 — `:migration-tool:test` 15/15 green)
| 역량 | 내용 | 클래스 |
|---|---|---|
| **키 재매핑 레지스트리 (keystone)** | 레거시키→신규 esntl_id 대응을 인메모리+타깃(`tb_migration_key_map`)에 영속. 재실행 시 preload 로 동일 키 재사용(멱등). | `keymap/KeyMapRegistry`·`StandardIdGenerator` |
| **`idStrategy` 활성화** | 부모 PK 채번(死 DSL → 실동작). `sourceKey` 신설로 레거시 PK 컬럼 지정. | `EtlExecutor.transformRow` |
| **`fkRef` FK 재작성** | 자식 FK 값을 부모 키맵으로 신규 키에 번역 → **대리키 재생성 시 참조 무결성 보존**. 고아는 예외로 격리. | `ColumnMapping.fkRef`·`EtlExecutor.applyFkRef` |
| **FK 위상정렬** | `fkRef` 간선으로 Kahn 정렬 → 부모 먼저 적재(선언 순서 무관). 자기참조 제외. | `etl/TableOrderer` |
| **`type` 타입 강제 활성화** | 死 DSL → int/long/decimal/boolean(Y/N)/date(YYYYMMDD)/timestamp/uuid 변환. | `transform/TypeConverter` |
| **스트리밍 + 배치 + 트랜잭션 write** | `SELECT *` 전량 로드 → fetchSize 스트리밍(메모리 상한). 행단위 autocommit → JDBC 배치 + 청크 트랜잭션(배치 실패 시 행단위 폴백으로 나쁜 행 격리). | `EtlExecutor.runTable/writeBatch` |
| **실증 검증기 (false-green 제거)** | 18줄 카운트-에코 stub → 타깃 재조회 행수 대조 + 조회↔변환↔기록 정합 → **PASS/WARN/FAIL** 등급. | `verify/MigrationVerifier`·`MigrationReport` |
| **스키마 한정 식별자** | `schema.table`(SCOTT.EMP/dbo.USERS) 수용(인젝션 안전). | `SourceIntrospector.qualifiedIdent` |
| **검증 강화** | `fkRef` 부모 실재·`type` 알려짐·`idStrategy.sourceKey` 유무 사전 검증. | `MappingValidator` |

### 7.2 잔여 로드맵 (미착수 — 실검증 환경·제품 결정 필요)
| 우선순위 | 항목 | 사유(보류) |
|---|---|---|
| **P0 연결성** | 멀티-DBMS 드라이버 외부 로더(ojdbc/Tibero) · **`SourceDialect` SPI**(Oracle=`ALL_TAB_COLUMNS`, DB2=`SYSCAT`) · PK/FK/UNIQUE 메타 추출 · **문자셋/인코딩 채널**(EUC-KR/CP949 mojibake 방어) · 비ASCII/한글 식별자 quoting | 실 Oracle/Tibero 없이는 검증 불가. 드라이버 재배포 제약. 현재 PG/H2 만 실동작. |
| **P2 스케일-잔여** | keyset PK **seek**(현재 fetchSize 스트리밍) · PG **COPY** 고속경로 · 테이블간/내 병렬 · 체크포인트 재개(`migration_checkpoint`) | 대용량 성능 튜닝은 실측 데이터 필요. |
| **P3 잔여** | **PII 재암호화 SPI**(ARIA `ariacryptoService` + `crypto-key-rotation` 연계) · BLOB/CLOB 스트림 바인딩 · **dead-letter 격리 테이블**(현재 오류 리스트) · 멱등 upsert(`ON CONFLICT`) | 보안/키 관리 제품 결정. LOB 는 대용량 실측. |
| **P4 잔여** | 고아 FK/NOT-NULL/UNIQUE 스캔 · `meta_standard_domains` 도메인 적합성 · 집계 체크섬 parity · 샘플 diff · `tb_migration_run` 감사 레코드 | 검증 심화(현재 행수 parity + 정합까지). |
| **P5 무중단** | **DELTA 모드**(high-watermark) · 재조정 게이트 · 롤백/스냅샷 · 커트오버 런북 | 무중단 컷오버는 운영 절차·제품 결정. [zero-downtime-migration.md](./zero-downtime-migration.md)(스키마 진화)와 별개. |
| **P6 DX/구조** | 구조 연산자(N:1/1:N split·discriminator route·EAV) · **매핑 스캐폴딩**(introspection→starter yml) · 시크릿 외부화 · testcontainers e2e | 대규모(200테이블) 저작 생산성. |

### 7.3 완성도 평가
- 초기 PoC(감사 평가 ≈11%, 블로커 가중) → **참조 무결성·엔진 견고성·실증 검증 축 확보**로 상향. 단 **P0 연결성 미해소**로 여전히 실 Oracle/Tibero 레거시는 미대응(PG/H2 실동작). 즉 "표준 스키마로 **정확하고 무결하게** 이관하는 엔진"은 성립했고, "**다양한 소스에 물리적으로 붙는** 범위"가 남은 최대 축이다.

---
*1줄 요약: 레거시 이관은 소스 무지·표준 강제 원칙 아래 **선언적 매핑 DSL**을 중심으로 introspect→validate(meta표준)→ETL(스트리밍·배치·트랜잭션·키맵 FK재작성)→verify(PASS/WARN/FAIL) 4단계로 구성한다. 2026-07-23 보강으로 **참조 무결성 keystone·타입강제·위상정렬·실증 검증**을 확보했고(§7.1, 테스트 15/15), 잔여 최대 축은 **P0 멀티-DBMS 연결성**이다(§7.2).*
