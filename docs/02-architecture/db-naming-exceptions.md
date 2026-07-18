# DB 명명 표준 예외 대장 (Naming Standard Exception Register)

> **목적**: DB 표준화 헌법(제1·3·6·8조)의 명명 규칙을 **의도적으로 따르지 않는** 물리 객체를 한곳에 등재한다.
> 이로써 "우발적 드리프트(accidental drift)"와 "명시적 예외(intentional exception)"를 분리하여, 표준 감사·린터가
> 예외를 오탐(false positive)으로 지적하지 않게 하고, 향후 담당자가 "왜 이 이름은 표준이 아닌가"를 즉시 확인하게 한다.
>
> **적용 원칙**: 아래 목록에 **없는** 비표준 명명은 전부 "정리 대상 부채"로 간주한다. 예외를 늘리려면 근거와 함께 본 문서에 등재한다.
> **관련**: [DB 표준화 헌법](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md) · [품질 스코어 근본원인 분석](./quality-score-root-cause-analysis.md)
> **작성**: 2026-07-16 · Claude Code (dual-operator)

---

## 1. 프레임워크 예약 테이블 (tb_ 접두 예외)

eGovFrame·Hibernate 가 **이름을 하드코딩으로 소유**하는 인프라 테이블. `tb_` 접두(헌법 제3조)를 적용하면 프레임워크
동작이 파손되므로 원명을 유지한다. **비즈니스 테이블이 아니므로 도메인 표준 감사 대상에서 제외**한다.

| 물리명 | 소유 프레임워크 | 용도 | 리네임 불가 사유 |
|---|---|---|---|
| `ecopseq` | eGovFrame ID Generation Service | PK 채번 시퀀스 테이블 | 프레임워크 레거시 잔존 테이블(V2_0 베이스라인 유지). `EgovIdGnrService`/`EgovIdGnrConfig` 는 2026-07 채번통일로 제거(프로덕션 결합 0, `IdGenerationUtil`=UUID 채번이라 ecopseq/ids 미사용) → 실사용 0 이면 §4 정리 대상 부채 후보 |
| `ids` | eGovFrame ID Generation Service | 채번 상태 테이블 | 동일(레거시 잔존, 실사용 0 시 §4 정리 후보) |
| `revinfo` | Hibernate Envers | 감사 리비전 메타 | Envers 리비전 엔티티 매핑에 고정 |
| `revinfo_seq` | Hibernate Envers | 리비전 채번 시퀀스 | Envers revision generator 자동 생성물 (2026-07-16 감사에서 대장 갭으로 확인, 추기) |
| `flyway_schema_history` (+PK `flyway_schema_history_pk`) | Flyway | 마이그레이션 이력 장부 | Flyway 가 명칭을 소유 (2026-07-16 감사에서 대장 갭으로 확인, 추기) |

## 2. 감사 컬럼 표기 예외 (헌법 제8조)

업무 테이블은 전부 표준 4종(`frst_rgtr_id`/`crt_dt`/`last_mdfr_id`/`mdfcn_dt`)을 준수한다. 아래 **프레임워크 예약
테이블 3곳에 한해** 레거시 표기가 남아 있으며, 위 §1 사유로 리네임하지 않는다.

| 비표준 컬럼 | 대상 테이블 | 표준 대응 |
|---|---|---|
| `frst_register_id` | `ecopseq`, `ids`, `revinfo` | (표준: `frst_rgtr_id`) |
| `last_updusr_id` | `ecopseq`, `ids`, `revinfo` | (표준: `last_mdfr_id`) |

## 3. 메타 표준 테이블·객체 (meta_ 예약)

DB 표준 거버넌스의 원천(SSOT). 헌법 제3조 2항·제8조 4항이 **모든 표준 감사에서 원천 제외**로 규정한다.

| 물리명 | 종류 | 비고 |
|---|---|---|
| `meta_standard_words` / `meta_standard_terms` / `meta_standard_domains` | 테이블 | `tb_` 예외(제3조 2항) |
| `meta_standard_domains_pkey` / `meta_standard_terms_pkey` | PK 제약 | `pk_` 예외(meta_ 체계 유지) |
| `seq_meta_standard_domains` / `seq_meta_standard_terms` | 시퀀스 | `sq_` 예외(meta_ 체계 유지) |

## 4. 정리 예정(부채) — 예외 아님, 표준화 대상

아래는 예외가 **아니며**, 안전 조건이 충족되는 대로 표준화한다(추적 목적 등재).

| 대상 | 현재 | 표준 | 상태 / 선행 조건 |
|---|---|---|---|
| 시퀀스 `answer_no_seq`→`sq_answer_no`, `pst_id_seq`→`sq_pst_id`, `ntt_id_seq`→`sq_ntt_id` | `_seq` 접미 | `sq_` 접두 | **이행 준비 완료 (V2_8 + 코드 동기화, 배포 대기)**. 실측: 3개 모두 컬럼 DEFAULT 의존 0건. 소비처 = Comment.@SequenceGenerator·BoardRepository.nextval (동반 변경 완료), `ntt_id_seq`는 소비처 0건(제거 후보). ⚠ rename↔코드는 동일 릴리스로 조율 배포 필수 |
| ~~마이그레이션 `V1__init`~`V1.12`~~ | ~~레거시 델타 + `V2_0` baseline 공존~~ | ~~baseline 단일화~~ | **✅ 완료(2026-07-16)** — 아래 §5 참조 |
| 시퀀스 `seq_tb_hldy_info` | `seq_` 접두 | `sq_` 접두 | 정리 대상. `tb_hldy_info.hldy_sn` identity 귀속(deptype='i') — 리네임만으로 안전하나 코드 결속 확인 후 이행 |
| FK `fk_role_prgrm_map_role`/`fk_role_prgrm_map_prgrm` | tb_ 접두 탈락 축약명 | `fk_tb_role_prgrm_map_tb_role_info`/`_tb_prgrm_lst` | **RENAME 보류(2026-07-17 사용자 결정)**. 재개 시 ⚠ 라이브 `RENAME CONSTRAINT` + V2_11 파일 4개 라인 치환을 **원자적으로** 시행할 것 — 편측 정정 시 동일 컬럼 이중 FK가 무에러 생성됨. SchemaNamingLinterTest 화이트리스트에 등재됨(정정 시 제거) |

---

## 5. 이행 이력

- **2026-07-16 (V2_7)**: 표준 tb_ 객체 인덱스 `idx_tb_menu_info_del_yn`→`ix_tb_menu_info_del_yn`,
  프레임워크 예약 PK 제약 `ecopseq_pkey`/`ids_pkey`/`revinfo_pkey`→`pk_*` 표준화(메타데이터 rename).
  본 예외 대장 신설로 §1~§3 을 "명시적 예외"로 확정.
- **2026-07-16 (V2_8)**: 채번 시퀀스 `answer_no_seq`/`pst_id_seq`/`ntt_id_seq`→`sq_*` 표준화
  (`ALTER SEQUENCE RENAME`, 메타데이터) + 코드 문자열 동반 변경(Comment.java `sequenceName`, BoardRepository.java `nextval`).
  db-bridge 실측으로 컬럼 DEFAULT 비의존 확인. OCI 선적용·검증(값 보존·`nextval` 실동작) 완료.
- **2026-07-16 (V2_9)**: `tb_onln_poll_rslt` FK 2건 VALIDATED 승격 — 고아행(테스트 잔재 316건) 자가치유 정리 후 검증. OCI 적용 완료(신규 FK 7건 전부 `convalidated=true`).
- **2026-07-16 (마이그레이션 이력 단일화)**: 레거시 `V1__init`~`V1.12`(13개) 제거 → 마이그레이션 계보를 `V2_0` baseline 단일 출발점으로 정리. 근거: 테스트 `flyway.enabled=false`(H2 사용), OCI `flyway_schema_history` 2.1 baseline 시작(V1.x 이력 0건), V1.x는 V2_0에 없는 레거시 테이블(`NEMPLYRINFO`/`nuserlog` 등) 대상이라 fresh DB 부팅 시 오히려 충돌 유발 → 제거로 정상화. git history 로 복원 가능.

## 6. baseline 범위 & 호스팅 컨텍스트 (드리프트 오탐 방지)

라이브 OCI(`egovdb`, 129.154.54.178)는 **Supabase 호스팅 인스턴스**다. 따라서 DB에는 **앱 스키마 `public`** 외에
Supabase 플랫폼이 소유·관리하는 시스템 스키마가 공존한다. **V2_0 baseline 은 `public` 스키마만 담으며 이것이 정상이다.**

| 스키마 | 소유 | 앱 baseline 포함 |
|---|---|:---:|
| `public` | eGov 앱 | ✅ (V2_0 baseline = 101테이블 + V2_3의 `tb_role_hierarchy` + Flyway `flyway_schema_history`) |
| `auth` (23) · `storage` (8) · `realtime` (3) · `supabase_migrations` | Supabase 플랫폼 | ❌ (플랫폼 관리, 앱 무관) |

- **드리프트 검증(2026-07-16 db-bridge 실측)**: `public` 앱 테이블·시퀀스가 baseline과 완전 일치(누락/초과 0). `tb_role_hierarchy` 는 V2_3 가 `CREATE TABLE IF NOT EXISTS` 로 생성하는 정식 후속 객체이지 드리프트가 아니다.
- **주의**: OCI 전체 FK/시퀀스 카운트(예: FK 38건)는 **Supabase 스키마의 객체를 포함**하므로, 앱 스키마 정합성 판단 시 반드시 `table_schema='public'` 로 한정해 비교한다. 전역 카운트로 드리프트를 판정하지 말 것.

---
**1줄 요약**: 프레임워크 예약(`ecopseq`/`ids`/`revinfo`)·메타(`meta_*`) 객체는 리네임 불가 예외로 등재하고, 레거시 시퀀스·마이그레이션은 이행 완료로 정리했으며, OCI의 Supabase 플랫폼 스키마(`auth`/`storage`/`realtime`)는 앱 baseline 범위 밖으로 명시해 드리프트 오탐을 차단한다.
