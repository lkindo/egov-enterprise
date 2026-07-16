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
| `ecopseq` | eGovFrame ID Generation Service | PK 채번 시퀀스 테이블 | `EgovIdGnrService` 가 테이블/컬럼명을 SQL 에 하드코딩 |
| `ids` | eGovFrame ID Generation Service | 채번 상태 테이블 | 동일(채번 엔진 결속) |
| `revinfo` | Hibernate Envers | 감사 리비전 메타 | Envers 리비전 엔티티 매핑에 고정 |

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
| 마이그레이션 `V1__init`~`V1.12` | 레거시 델타 + `V2_0` baseline 공존 | baseline 단일화 | **아카이브 안전 실증됨** — 라이브 OCI `flyway_schema_history`가 `2.1` baseline에서 시작(V1.x 이력 0건, 2026-07-16 db-bridge 실측)이라 V1.x 파일 제거가 `validate`를 깨지 않는다. 다른 DB(개발용)에 V1.x 이력이 있는지만 확인 후 아카이브 |

---

## 5. 이행 이력

- **2026-07-16 (V2_7)**: 표준 tb_ 객체 인덱스 `idx_tb_menu_info_del_yn`→`ix_tb_menu_info_del_yn`,
  프레임워크 예약 PK 제약 `ecopseq_pkey`/`ids_pkey`/`revinfo_pkey`→`pk_*` 표준화(메타데이터 rename).
  본 예외 대장 신설로 §1~§3 을 "명시적 예외"로 확정.
- **2026-07-16 (V2_8, 배포 대기)**: 채번 시퀀스 `answer_no_seq`/`pst_id_seq`/`ntt_id_seq`→`sq_*` 표준화
  (`ALTER SEQUENCE RENAME`, 메타데이터) + 코드 문자열 동반 변경(Comment.java `sequenceName`, BoardRepository.java `nextval`).
  db-bridge 실측으로 컬럼 DEFAULT 비의존 확인. 조율 배포로 적용 예정.

---
**1줄 요약**: 프레임워크 예약(`ecopseq`/`ids`/`revinfo`)·메타(`meta_*`) 객체는 리네임 불가 예외로 등재하고, 시퀀스 `_seq`·레거시 마이그레이션은 "정리 예정 부채"로 분리 추적하여 표준 감사의 오탐과 미결 부채를 구분한다.
