# 표준 스키마 메타 처분안 (GAP-STD-001)

> **검토 자료이며 승인이 아니다.** DB/표준 소유자가 컬럼마다 용어 등록·물리 정정을 승인하기 전의 처분 후보다. 이 문서는 DB 를 바꾸지 않으며, 등록·정정은 각각 새 Flyway 와 별도 승인으로 한다.

## 1. 머리

### 목적

GAP-STD-001(`.agent/memory/known-gaps.md`)의 다음 행동("컬럼마다 표준 용어 등록(DB 헌법 제9조)이나 물리 타입 정정 중 하나를 판정")을 위해, 표준 용어가 없는 컬럼과 도메인·물리 타입이 다른 컬럼마다 처분 후보를 제시한다.

- 상세 처분표 최초 조사 기준일: **2026-10-18** — 아래 표 1·표 2와 A/B/C 건수는 이 시점의 후보를 보존한다. 현재 관측 차분은 다음 절에 따로 적는다.
- 원천: 공유 OCI 개발 DB(`egovdb`, 운영 아님) 읽기 전용 조회 — `.agent/scripts/db-bridge.js`(SELECT·WITH만). 수치는 그날의 DB 실측이며 저장소에 남는 증거가 아니다.
- 보조 원천: JPA 엔티티 필드 타입(정적 파싱), 컬럼 COMMENT, 화면 라벨, 시드 마이그레이션(V2_1·V2_15·V2_17·V2_112·V2_128·V2_129·V2_56·V2_69·V2_76).

### 2026-10-29 재실측 차분

같은 공유 개발 DB에서 아래 **기존 SQL 두 개를 변경 없이** 읽기 전용으로 재실행했다(2026-10-29 10:21 UTC). 사전 규모와 대소문자 비교는 메타 테이블만 추가 조회했다(10:22 UTC). 업무 행 데이터·행 수·변환 가능한 값의 범위는 조회하지 않았다. 현재 수치가 과거 상세표의 처분을 다시 승인하거나 데이터 정정의 안전성을 증명하는 것은 아니다.

| 항목 | 2026-10-18 상세표 | 2026-10-29 재실측 |
|---|---:|---:|
| public `tb_` 기본 테이블 / 컬럼 | 88 / 1,011 | 94 / 1,082 |
| 표준 영문약어와 일치하는 용어 없음: 컬럼 / 표 / 고유 이름 | 276 / 66 / 212 | 291 / 69 / 213 |
| 용어 있고 도메인 타입이 다름 | 26 | 28 |
| 그중 같은 종류 / 다른 종류 | 20 / 6 | 22 / 6 |
| 폐기 용어에 걸린 컬럼 | 0 | 0 |
| 표준 단어 / 용어 / 도메인 | 3,387 / 13,232 / 130 | 3,387 / 13,245 / 131 |

문서 SQL은 `st.eng_abbr = upper(cols.column_name)`로 대조한다. 재평가 요약에서 사용한 `upper(st.eng_abbr)` 대조와 차이가 있는지 확인했으며, 현재 소문자가 섞인 사전 약어와 두 대조 방식의 결과 차이는 모두 0개였다. 현재 타입 대조는 아래 SQL 결과에 `JSONB↔jsonb` 일치도 반영한다. **같은 종류 허용은 이관 도구의 판정이며, 도메인의 타입·길이가 정확히 일치하거나 용어의 업무 의미가 맞다는 뜻은 아니다.**

과거 표 1의 고유 이름은 모두 현재 미등록 목록에도 있다. 컬럼 증가 15개는 `version` 3→16개(+13), `bbs_id` 8→9개(+1), 새 이름 `bbs_chg_hstry_sn` 1개(+1)로 대조됐다. `bbs_id`의 새 사용처는 `tb_bbs_chg_hstry`다. `version`은 [DEC-OPS-378](../archived/operational-decisions-history.md#dec-ops-378)로 확정한 기술 컬럼 예외이므로 새 용어를 만들거나 재승인 대상으로 돌리지 않는다. 따라서 **미등록 291개는 미승인 결함 291개가 아니다.** 이 집계가 각 `version`의 기본값·CHECK까지 검증한 것은 아니다.

| 새로 확인된 대상 | 현재 메타·물리 상태 | 처분 상태와 다음 판단 |
|---|---|---|
| `tb_bbs_chg_hstry.bbs_chg_hstry_sn` | 용어 없음 / `bigint` identity | [V2_139](../../api-server/src/main/resources/db/migration/V2_139__add_board_change_history_and_master_version.sql)가 GAP-STD-001 등록 후보로 남긴 식별자다. 표준 용어명·대표 약어·도메인은 아직 확정하지 않는다. 사전 의미와 기존 용어를 재대조한 뒤 등록 여부를 승인한다. 과거 A 107건에 자동 가산하지 않는다. |
| `tb_bbs_chg_hstry.pst_sn` | 게시물일련번호·일련번호N22(`NUMERIC(22)`) / `bigint` | 같은 숫자 종류의 새 사용처다. 표 2의 PST_SN 도메인 정정 후보와 함께 모든 현재 사용처를 대조한 뒤 판단한다. 기존 후보가 이 컬럼의 정정 승인인 것은 아니다. |
| `tb_cms_conts_file.atch_file_seq` | 첨부파일순서·순서N10(`NUMERIC(10)`) / `integer` | 같은 숫자 종류의 새 사용처다. [V2_137](../../api-server/src/main/resources/db/migration/V2_137__add_cms_content_pages.sql)은 참조 대상 `tb_file_detail.atch_file_seq`와 같은 타입으로 FK를 구성한다. 해당 컬럼만 사전 타입으로 바꾸지 않고 참조 양쪽과 표준 도메인을 함께 판단한다. |

과거 표 2의 타입 차이 26개는 모두 남아 있고 위 두 사용처가 추가됐다. 다른 종류인 6개는 `tb_bbs_item.ans_lv`, `tb_dept_task_info.prrty_rnk`, `tb_popup_info.popup_vrtc_sz`·`popup_wdth_sz`, `tb_sys_log.prcs_tm`, `tb_web_log.prcs_tm`으로 기존과 같다. 이 컬럼들은 이미 사전 용어가 있으므로 `nonStandardTarget`으로 확정해 이관 차단을 우회할 수 없다([검증기](../../migration-tool/src/main/java/nuri/migration/validate/ledger/TermLedgerValidator.java), [부정 시험](../../migration-tool/src/test/java/nuri/migration/validate/ledger/TermLedgerValidatorTest.java)). 이번 변경은 문서 정합만 수행하며 용어 등록·도메인 수정·DDL·DML을 하지 않는다.

### 실측 쿼리

집계(과거 1,011·276·212, 2026-10-29에는 1,082·291·213):

```sql
WITH cols AS (
  SELECT c.table_name, c.column_name, c.data_type, c.character_maximum_length AS char_len,
         c.numeric_precision, c.numeric_scale, c.ordinal_position
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
   WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND c.table_name LIKE 'tb\_%'
), m AS (
  SELECT cols.*, st.term_name, st.domain_name, st.deprecated_yn, d.data_type AS dom_type, d.data_length AS dom_len
    FROM cols
    LEFT JOIN meta_standard_terms st ON st.eng_abbr = upper(cols.column_name)
    LEFT JOIN meta_standard_domains d ON d.domain_name = st.domain_name
)
SELECT count(*) AS total_rows,
       count(DISTINCT table_name || '.' || column_name) AS cols,
       count(DISTINCT table_name) AS tbls,
       count(DISTINCT CASE WHEN term_name IS NULL THEN table_name || '.' || column_name END) AS no_term_cols,
       count(DISTINCT CASE WHEN term_name IS NULL THEN table_name END) AS no_term_tbls,
       count(DISTINCT CASE WHEN term_name IS NULL THEN column_name END) AS no_term_names,
       count(DISTINCT CASE WHEN deprecated_yn = 'Y' THEN table_name || '.' || column_name END) AS deprecated_cols
  FROM m
```

컬럼별 추출(표 1·표 2의 원천, 아래 결과를 로컬에서 단어·도메인과 대조):

```sql
WITH cols AS (
  SELECT c.table_name, c.column_name, c.data_type, c.character_maximum_length AS char_len,
         c.numeric_precision, c.numeric_scale, c.is_nullable, c.is_identity, c.ordinal_position
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
   WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND c.table_name LIKE 'tb\_%'
)
SELECT cols.*, st.term_name, st.domain_name, d.data_type AS dom_type, d.data_length AS dom_len
  FROM cols
  LEFT JOIN meta_standard_terms st ON st.eng_abbr = upper(cols.column_name)
  LEFT JOIN meta_standard_domains d ON d.domain_name = st.domain_name
 ORDER BY cols.table_name, cols.ordinal_position
```

타입 불일치 판정은 `도메인 VARCHAR↔character varying`, `NUMERIC↔numeric`, `BIGINT↔bigint`, `DATETIME↔timestamp` 를 일치로 보고 나머지를 불일치로 셌다. 종류(같음/다름)는 이관 도구 `TargetLimit.sameKind` 규칙(정수·소수는 서로 같은 종류)을 따랐다. 단어 대조는 `meta_standard_words`(3,387행)를 `_` 로 나눈 토큰의 `eng_abbr` 와 맞췄다(열 word_name·eng_abbr·word_dc·rprs_yn — V2_1 시드, rprs_yn 과 PK 는 V2_15). 같은 종류 비교에는 NUMERIC 소수 자릿수도 넣었다.

### 수치 요약 — 2026-10-18 상세 분류

| 항목 | 값 |
|---|---|
| public `tb_` 기본 테이블 컬럼 | 1,011개 / 88개 표 |
| 표준 용어 없음 | 276개 컬럼 / 66개 표 / 고유 이름 212개 |
| 용어 있고 도메인 타입이 다름 | 26개 — NUMERIC→bigint 13·integer 7·varchar 3, VARCHAR→bigint 2·integer 1 |
| 그중 종류가 달라 이관 매핑이 실패 | 6개 — tb_bbs_item.ans_lv, tb_dept_task_info.prrty_rnk, tb_popup_info.popup_vrtc_sz·popup_wdth_sz, tb_sys_log.prcs_tm, tb_web_log.prcs_tm |
| 같은 종류인데 길이·자릿수가 다름(VARCHAR·NUMERIC) | 0개 |
| 폐기(deprecated_yn=Y) 용어에 걸린 컬럼 | 0개 |
| 고유 이름 212개 중 등록 단어로만 이루어진 것 | 211개(`version` 만 단어 없음) |
| 그중 비대표 약어(rprs_yn=N) 포함 | 46개 |
| 그중 프로젝트가 나중에 넣은 단어(word_dc='신규등록', 103개) 포함 | 64개 |
| 메타 규모 | 단어 3,387 · 용어 13,232(프로젝트 추가 59) · 도메인 130 |

"211개가 등록 단어 조합"은 표준 적합의 증거가 아니다. 프로젝트 단어 103개는 스키마의 약어를 사후에 단어로 올린 것이 많고(V2_15 의 "신규등록" 표식), 비대표 약어 73개는 대표 약어가 따로 있다. 또 공통표준 단어 가운데 뜻이 컬럼 용도와 다른 것이 있다(AREA=면적·HR=시간·SCRT=증권·ORDR=주문·SVC=봉사·ESNTL=필수·CRTR=기준·ODR=발주자·RTN=반납, 프로젝트 단어 PREP=전임·IVL=개별·ESTN=연장). 그래서 단어 조합만으로 A 로 두지 않았다.

### 처분 3분류

| 분류 | 정의 | 필요한 변경 |
|---|---|---|
| **A** 표준 용어 등록 후보 | 컬럼명이 대표 약어의 표준 단어 조합이고, 뜻이 단어와 맞으며, 같은 뜻의 기존 용어가 없고, 물리 타입·길이가 기존 도메인 하나와 같다. **A\*** 는 integer 를 NUMERIC 도메인에 잇는 동종 등록이다(INTEGER 도메인이 없다 — 등록하면 "같은 종류 불일치" 집계에 더해진다). | 용어 행 추가(메타 시드 마이그레이션)만. DDL 없음 |
| **B** 물리 타입/이름 정정 후보 | 용어는 있거나 만들 수 있으나 ① 같은 뜻의 기존 용어가 다른 약어로 있거나, ② 비대표·뜻이 다른 약어를 쓰거나, ③ 물리 타입·길이가 도메인과 다르다. 세부 표기: B(이름)·B(이름+길이)·B(이름+타입)·B(타입)·B(길이). | DDL(RENAME·ALTER TYPE) — Flyway, 헌법 제7조 Expand-and-Contract, ZDM waiver, 엔티티·API 계약 변경, 승인 필요 |
| **C** 예외 유지(승인 확정·후보 구분) | 기술 컬럼(uuid·bytea·@Version·라우트), 외부 공급 형식(GAP-CODE-001), 의미 미정(PD-DB-002), 퇴역 후보처럼 지금 표준화 실익이 없거나 판단을 미룬다. `version`은 DEC-OPS-378로 승인 확정됐으며 다른 후보까지 일괄 승인한 것은 아니다. | 해당 schema의 live 메타에 용어가 없는 대상만 이관 원장에서 `nonStandardTarget` 과 사유로 확정할 수 있다. |

### 등록이 바꾸는 것

- **등록은 시드 마이그레이션이다.** 용어 메타는 DB 가 정본이므로(헌법 제2조) 새 Flyway 파일로 넣는다. 선례: 용어 추가는 V2_112(`api-server/src/main/resources/db/migration/V2_112__expand_local_totp_credentials.sql`)·V2_129(`api-server/src/main/resources/db/migration/V2_129__add_approval_saved_lines.sql`)(`INSERT … ON CONFLICT (eng_abbr) DO NOTHING` 뒤 DO 블록으로 이름·약어·도메인 검증), 메타 열 확장·값 채우기는 V2_128(`api-server/src/main/resources/db/migration/V2_128__extend_meta_standard_terms.sql`), 기존 용어 도메인 정정은 V2_56·V2_76(`UPDATE … SET domain_name = '일련번호N19'`). `eng_abbr` 는 UNIQUE(V2_15)라 같은 약어로 두 번 등록할 수 없다. 공유 OCI 적용은 별도 승인이다(DEC-OPS-314 선례).
- **등록하면 이관 원장 동작이 바뀐다.** DEC-OPS-317 ② 는 표준 용어가 없는 대상 컬럼만 `nonStandardTarget: {reason}` 으로 확정하게 하고 "live 메타에 그 컬럼의 용어가 없다는 증명"을 요구한다. 그래서 용어를 등록하면 그 컬럼의 비표준 대상 확정은 plan 에서 막힌다(`TermLedgerValidator.live` — "live 메타의 표준 용어가 있어 비표준 대상으로 확정할 수 없습니다"). GAP-STD-001 도 "표준 용어를 등록하면 … 원장도 용어로 고친다"고 적는다. 등록 뒤에는 그 컬럼에 도메인·적합성 대조가 새로 걸린다.
- **B 의 이름 정정은 원장 대상 컬럼명도 바꾼다.** 확정 원장은 대상 컬럼이 표준 영문약어와 같아야 하므로(`confirmed`), 이름을 바꾸면 그 컬럼을 가리키는 원장을 다시 만든다.
- 단어가 없는 경우(인사·준비·밀리초)는 제9조에 따라 단어 등록부터 요청한다. 프로젝트 단어 PREP=전임은 뜻이 잘못 올라간 것으로 보인다.

## 2. 표 1 — 2026-10-18 표준 용어가 없는 고유 이름 212개

표기: 단어 분해의 `†` 는 비대표 약어(rprs_yn=N, 화살표는 대표 약어), `*` 는 프로젝트 등록 단어(word_dc='신규등록'). A 의 용어명은 단어 한글명을 이은 것이다. "확인 필요"는 뜻·관례를 사람이 봐야 하는 항목이다. "기존"은 live 메타에 이미 있는 용어다.

| # | 컬럼명 | 표 수(대표) | 물리 타입 | 단어 분해(한글명) | 처분 | 후보 도메인(근거) | 용어명 제안·비고 |
|---|---|---|---|---|---|---|---|
| 1 | `admdst_cd` | 1 (tb_admdst_cd) | varchar(12) | ADMDST 행정구역 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **행정구역코드** |
| 2 | `admdst_se_cd` | 1 (tb_admdst_cd) | varchar(12) | ADMDST 행정구역 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **행정구역구분코드** |
| 3 | `admdst_zone_nm` | 1 (tb_admdst_cd) | varchar(100) | ADMDST 행정구역 + ZONE 구역 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **행정구역구역명**. 용어명에 "구역"이 겹친다 — 확인 필요 |
| 4 | `all_inst_nm` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(100) | ALL†* 전체→WHOL + INST 기관 + NM 명 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정. 기존 용어 WHOL_INST_NM 전체기관명(명V200) |
| 5 | `aplcnt_id` | 2 (tb_ifml_atrz_info, tb_ifml_atrz_tmpr_strg) | varchar(20) | APLCNT 신청자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **신청자아이디** |
| 6 | `aprvr_id` | 1 (tb_ifml_atrz_info) | varchar(20) | APRVR 결재자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **결재자아이디** |
| 7 | `area_no` | 2 (tb_extrl_hr_info, tb_user_info) | varchar(4) | AREA 면적 + NO 번호 | B(이름) | 전화번호V4 — 대상 용어 도메인(VARCHAR(4)) | → RGN_TELNO 지역전화번호(기존). AREA=면적은 뜻이 다름(화면 라벨 "지역번호") |
| 8 | `atch_psblty_file_qty` | 1 (tb_bbs_master) | integer | ATCH 첨부 + PSBLTY 가능 + FILE 파일 + QTY 수량 | B(이름) | 수N10 — 대상 용어 도메인(NUMERIC(10)) | → ATCH_PSBLTY_FILE_CNT 첨부가능파일수(기존). 물리 integer — 동종 |
| 9 | `atrzr_id` | 1 (tb_rward_manage) | varchar(20) | ATRZR†* 결재자→APRVR + ID 아이디 | B(이름) | 명V20 — 대상 용어 도메인(VARCHAR(20)) | → APRVR_ID(aprvr_id 등록 뒤). ATRZR 비대표. 대안 C |
| 10 | `bbs_atrb_cd` | 1 (tb_bbs_master) | varchar(12) | BBS 게시판 + ATRB 속성 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **게시판속성코드** |
| 11 | `bbs_id` | 8 (tb_bbs_comment, tb_bbs_item) | varchar(20) | BBS 게시판 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **게시판아이디** |
| 12 | `bbs_ttl` | 1 (tb_bbs_master) | varchar(100) | BBS 게시판 + TTL 제목 | B(이름+길이) | 명V256 — 대상 용어 도메인(VARCHAR(256)) | → BBS_NM 게시판명(기존). 표에 bbs_nm이 따로 없어 게시판 이름으로 쓰임. 100 → 256 확장. 대안 A(게시판제목, 명V100) |
| 13 | `bbs_type_cd` | 1 (tb_bbs_master) | varchar(12) | BBS 게시판 + TYPE 유형 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **게시판유형코드** |
| 14 | `bfr_user_id` | 1 (tb_ifml_atrz_prcs_hstry) | varchar(20) | BFR 이전 + USER 사용자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **이전사용자아이디** |
| 15 | `bizr_no` | 1 (tb_user_info) | varchar(10) | BIZR†* 사업자→BZMN + NO 번호 | B(이름) | 사업자등록번호C10 — 대상 용어 도메인(VARCHAR(10)) | → BRNO 사업자등록번호(기존). BIZR 비대표 |
| 16 | `bnr_img_nm` | 1 (tb_bnr_info) | varchar(100) | BNR 배너 + IMG 이미지 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **배너이미지명** |
| 17 | `bnr_nm` | 1 (tb_bnr_info) | varchar(100) | BNR 배너 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **배너명** |
| 18 | `brdt_ymd` | 1 (tb_extrl_hr_info) | varchar(8) | BRDT 생년월일 + YMD 일자 | B(이름) | 연월일C8 — 대상 용어 도메인(VARCHAR(8)) | → BRDT 생년월일(기존). "생년월일일자"는 중복 분류어 |
| 19 | `cd_id` | 3 (tb_com_cd, tb_com_cd_chg_hstry) | varchar(20) | CD 코드 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **코드아이디**. 선례 UP_CD_ID 상위코드아이디(명V20) |
| 20 | `cd_id_expln` | 1 (tb_com_cd) | varchar(4000) | CD 코드 + ID 아이디 + EXPLN 설명 | A | 내용V4000 — VARCHAR(4000) 일치, 분류어 EXPLN 기존 117건 | 용어명: **코드아이디설명** |
| 21 | `cd_id_nm` | 1 (tb_com_cd) | varchar(100) | CD 코드 + ID 아이디 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **코드아이디명** |
| 22 | `cert_dn_vl` | 1 (tb_user_info) | varchar(100) | CERT 인증 + DN* 고유명 + VL 값 | A | 명V100 — VARCHAR(100) 일치, 분류어 VL 사례 없음 | 용어명: **인증고유명값**. VL 기존 용어 1건은 해시값V64 — 확인 필요 |
| 23 | `chg_pswd_last_dt` | 1 (tb_user_info) | timestamp | CHG 변경 + PSWD 비밀번호 + LAST 최종 + DT 일시 | B(이름) | 연월일시분초D — 대상 용어 도메인(DATETIME) | → PSWD_CHG_DT 비밀번호변경일시(기존). 뜻이 같은지 확인 필요. 대안 A(변경비밀번호최종일시) |
| 24 | `chg_pwd_cnt` | 1 (tb_user_info) | integer | CHG 변경 + PWD†* 비밀번호→PSWD + CNT 수 | B(이름) | 수N10 — 대상 용어 도메인(NUMERIC(10)) | → CHG_PSWD_CNT(대표 약어로 정정 뒤 등록). PWD 비대표. 대안 C |
| 25 | `chg_se_cd` | 1 (tb_inst_cd_rcptn_log) | varchar(12) | CHG 변경 + SE 구분 + CD 코드 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정(chgSeCd 의미 미확정) |
| 26 | `clsf_cd` | 3 (tb_com_cd, tb_com_cd_chg_hstry) | varchar(12) | CLSF 분류 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **분류코드** |
| 27 | `clsf_cd_expln` | 1 (tb_com_clsf_cd) | varchar(4000) | CLSF 분류 + CD 코드 + EXPLN 설명 | A | 내용V4000 — VARCHAR(4000) 일치, 분류어 EXPLN 기존 117건 | 용어명: **분류코드설명** |
| 28 | `cmnty_intro_cn` | 1 (tb_cmnty_info) | varchar(4000) | CMNTY 커뮤니티 + INTRO 소개 + CN 내용 | A | 내용V4000 — VARCHAR(4000) 일치, 분류어 CN 기존 863건 | 용어명: **커뮤니티소개내용** |
| 29 | `cmpny_nm` | 1 (tb_user_info) | varchar(300) | CMPNY†* 회사→CO + NM 명 | B(이름+길이) | 명V100 — 대상 용어 도메인(VARCHAR(100)) | → CO_NM 회사명(기존, 명V100). CMPNY 비대표, 물리 300 → 100 축소는 데이터 확인 필요. 대안 C |
| 30 | `cntn_mthd_cd` | 1 (tb_login_log) | varchar(12) | CNTN 접속 + MTHD 방법 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **접속방법코드** |
| 31 | `com_cd_chg_hstry_sn` | 1 (tb_com_cd_chg_hstry) | bigint | COM 공통 + CD 코드 + CHG 변경 + HSTRY 이력 + SN 일련번호 | A | 일련번호N19 — BIGINT(19) 일치, 분류어 SN 기존 50건 | 용어명: **공통코드변경이력일련번호**. bigint 내부키 — 일련번호N19 선례 50건 |
| 32 | `confm_yn` | 1 (tb_rward_manage) | varchar(1) | CONFM†* 승인→APRV + YN 여부 | B(이름) | 여부C1 — 대상 용어 도메인(VARCHAR(1)) | → APRV_YN 승인여부(기존). CONFM 비대표 |
| 33 | `cr_type_cd` | 2 (tb_extrl_hr_info, tb_srvy_rspdnt) | varchar(12) | CR 직업 + TYPE 유형 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **직업유형코드** |
| 34 | `crt_cnt` | 1 (tb_user_log) | integer | CRT 생성 + CNT 수 | B(이름) | 수N10 — 대상 용어 도메인(NUMERIC(10)) | → CRT_NOCS 생성건수(기존). 물리 integer — 동종. 대안 A* |
| 35 | `crtr_id` | 1 (tb_stmp_info) | varchar(20) | CRTR 기준 + ID 아이디 | B(이름) | 명V20 — 대상 용어 도메인(VARCHAR(20)) | → CREATR_ID(생성자아이디, 신규 등록). CRTR=기준 — 뜻이 생성자면 정정. 확인 필요 |
| 36 | `del_cnt` | 1 (tb_user_log) | integer | DEL 삭제 + CNT 수 | B(이름) | 수N10 — 대상 용어 도메인(NUMERIC(10)) | → DEL_NOCS 삭제건수(기존). 물리 integer — 동종. 대안 A* |
| 37 | `dept_id` | 1 (tb_dept_job_bx) | varchar(20) | DEPT 부서 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **부서아이디** |
| 38 | `dept_task_box_nm` | 1 (tb_dept_job_bx) | varchar(100) | DEPT 부서 + TASK 업무 + BOX* 함 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **부서업무함명** |
| 39 | `dept_task_nm` | 1 (tb_dept_task_info) | varchar(100) | DEPT 부서 + TASK 업무 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **부서업무명** |
| 40 | `dgstfn_sn` | 1 (tb_dgstfn_info) | bigint | DGSTFN 만족도 + SN 일련번호 | A | 일련번호N19 — BIGINT(19) 일치, 분류어 SN 기존 50건 | 용어명: **만족도일련번호** |
| 41 | `diary_nm` | 1 (tb_diary_info) | varchar(100) | DIARY* 일기 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **일기명** |
| 42 | `diary_prgrs_rt` | 1 (tb_diary_info) | integer | DIARY* 일기 + PRGRS 진행 + RT 비율 | A* | 율N5,2 — 동종(integer→NUMERIC(5)), 분류어 RT 기존 104건 | 용어명: **일기진행비율**. 선례 PRGRS_RT 진행비율(율N5,2) |
| 43 | `dmnd_id` | 2 (tb_privacy_log, tb_sys_log) | varchar(20) | DMND 요청 + ID 아이디 | B(이름+길이) | 번호V50 — 대상 용어 도메인(VARCHAR(50)) | → DMND_IDNTFR 요청식별자(기존). 업무 상관관계 키. 20 → 50 확장. 대안 A(요청아이디, 명V20) |
| 44 | `dmnd_user_id` | 4 (tb_privacy_log, tb_sys_log) | varchar(20) | DMND 요청 + USER 사용자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **요청사용자아이디** |
| 45 | `dmnd_user_ip_addr` | 3 (tb_privacy_log, tb_sys_log) | varchar(45) | DMND 요청 + USER 사용자 + IP IP + ADDR 주소 | A | 주소V45 — VARCHAR(45) 일치, 분류어 ADDR 기존 29건 | 용어명: **요청사용자IP주소**. IP주소 계열 29건이 주소V45 |
| 46 | `drctn_mttr` | 2 (tb_diary_info, tb_memo_rpt_info) | varchar(4000) | DRCTN 지시 + MTTR 사항 | A | 내용V4000 — VARCHAR(4000) 일치, 분류어 MTTR 기존 46건 | 용어명: **지시사항**. 비슷한 기존 용어 DRCTN_CN 지시내용(내용V4000) — 같은 뜻이면 B(이름) |
| 47 | `drctn_mttr_reg_dt` | 1 (tb_memo_rpt_info) | timestamp | DRCTN 지시 + MTTR 사항 + REG 등록 + DT 일시 | A | 연월일시분초D — DATETIME 일치, 분류어 DT 기존 855건 | 용어명: **지시사항등록일시** |
| 48 | `dsptch_rslt_cd` | 1 (tb_email_dsptch_manage) | varchar(12) | DSPTCH 발신 + RSLT 결과 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **발신결과코드** |
| 49 | `dtl_cd` | 2 (tb_com_cd_chg_hstry, tb_com_dtl_cd) | varchar(12) | DTL 상세 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **상세코드** |
| 50 | `dtl_cd_nm` | 1 (tb_com_dtl_cd) | varchar(100) | DTL 상세 + CD 코드 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **상세코드명** |
| 51 | `empl_no` | 1 (tb_user_info) | varchar(20) | EMPL* 사원 + NO 번호 | B(이름) | 번호V20 — 대상 용어 도메인(VARCHAR(20)) | → EMP_NO 직원번호(기존, 동의어 "사원번호") |
| 52 | `end_telno` | 3 (tb_extrl_hr_info, tb_srvy_rspdnt) | varchar(4) | END 종료 + TELNO 전화번호 | B(이름) | 전화번호V4 — 대상 용어 도메인(VARCHAR(4)) | → INDIV_TELNO 개별전화번호(기존). 대안 C |
| 53 | `ent_se_cd` | 1 (tb_user_info) | varchar(12) | ENT 기업 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **기업구분코드** |
| 54 | `err_cd` | 2 (tb_login_log, tb_sys_log) | varchar(12) | ERR 오류 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **오류코드** |
| 55 | `err_cnt` | 1 (tb_user_log) | integer | ERR 오류 + CNT 수 | B(이름) | 수N10 — 대상 용어 도메인(NUMERIC(10)) | → ERR_NOCS 오류건수(기존). 물리 integer — 동종. 대안 A* |
| 56 | `err_se_cd` | 1 (tb_sys_log) | varchar(12) | ERR 오류 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **오류구분코드** |
| 57 | `esntl_id` | 1 (tb_user_info) | varchar(20) | ESNTL 필수 + ID 아이디 | B(이름) | 명V20 — 대상 용어 도메인(VARCHAR(20)) | → USER_INSD_IDNTFR 사용자내부식별자(V2_112 등록, 설명이 이 컬럼). ESNTL=필수는 뜻이 다름. esntlId 축이 앱 전역이라 대안 C |
| 58 | `etc_cd` | 1 (tb_inst_cd_rcptn_log) | varchar(20) | ETC 기타 + CD 코드 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정 |
| 59 | `evnt_aprv_ymd` | 1 (tb_event_info) | varchar(8) | EVNT 행사 + APRV 승인 + YMD 일자 | A | 연월일C8 — VARCHAR(8) 일치, 분류어 YMD 기존 1828건 | 용어명: **행사승인일자** |
| 60 | `evnt_aprv_yn` | 1 (tb_event_info) | varchar(1) | EVNT 행사 + APRV 승인 + YN 여부 | A | 여부C1 — VARCHAR(1) 일치, 분류어 YN 기존 1424건 | 용어명: **행사승인여부** |
| 61 | `evnt_type_cd` | 1 (tb_event_info) | varchar(12) | EVNT 행사 + TYPE 유형 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **행사유형코드** |
| 62 | `evnt_use_cnt` | 1 (tb_event_info) | bigint | EVNT 행사 + USE 사용 + CNT 수 | B(이름) | — | → 뜻이 "참여 정원"(화면) — 단어 정원(PSCP)으로 새 용어. 후보 도메인 미정(bigint, 수N10 동종) — 확인 필요 |
| 63 | `exprtn_dt` | 1 (tb_auth_rfsh_tk) | timestamp | EXPRTN†* 만료→EXPRY + DT 일시 | B(이름) | 연월일시분초D — 대상 용어 도메인(DATETIME) | → EXPRY_DT 만료일시(기존). EXPRTN 비대표 |
| 64 | `fax_no` | 4 (tb_adbk_info, tb_inst_cd) | varchar(20) | FAX 팩스 + NO 번호 | B(이름) | 팩스번호V20 — 대상 용어 도메인(VARCHAR(20)) | → FXNO 팩스번호(기존). 4개 표(기관코드 표 포함) |
| 65 | `file_detail_id` | 1 (tb_file_detail) | uuid | FILE 파일 + DETAIL†* 상세→DTL + ID 아이디 | C | — | uuid — 맞는 도메인 없음(기술 키) |
| 66 | `file_estn` | 1 (tb_file_detail) | varchar(20) | FILE 파일 + ESTN†* 연장→PRLG | B(이름+길이) | 명V5 — 대상 용어 도메인(VARCHAR(5)) | → FILE_EXTN_NM 파일확장자명(기존, 명V5). ESTN 비대표(뜻 "연장"). 20 → 5 축소는 데이터 확인 필요. 대안 C |
| 67 | `file_strg_path` | 1 (tb_file_detail) | varchar(1000) | FILE 파일 + STRG 저장 + PATH 경로 | A | 내용V1000 — VARCHAR(1000) 일치, 분류어 PATH 사례 없음 | 용어명: **파일저장경로**. 경로 관례는 "~경로명"(PATH_NM, 명V300) — 길이 1000에 맞는 도메인은 내용V1000뿐. 확인 필요 |
| 68 | `file_url` | 1 (tb_popup_info) | varchar(1000) | FILE 파일 + URL URL | A | 내용V1000 — VARCHAR(1000) 일치, 분류어 URL 사례 없음 | 용어명: **파일URL**. URL 관례는 "~URL주소"(주소V2000). 확인 필요 |
| 69 | `gndr_cd` | 3 (tb_extrl_hr_info, tb_srvy_rspdnt) | varchar(12) | GNDR 성별 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **성별코드** |
| 70 | `group_dc` | 1 (tb_authrt_group_info) | varchar(4000) | GROUP 그룹 + DC†* 설명→EXPLN | B(이름) | 내용V4000 — 대상 용어 도메인(VARCHAR(4000)) | → GROUP_EXPLN 그룹설명(기존). DC 비대표 |
| 71 | `group_id` | 2 (tb_authrt_group_info, tb_user_info) | varchar(20) | GROUP 그룹 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **그룹아이디** |
| 72 | `hlp_dfn` | 1 (tb_hlp_info) | varchar(1000) | HLP 도움말 + DFN 정의 | A | 내용V1000 — VARCHAR(1000) 일치, 분류어 DFN 사례 없음 | 용어명: **도움말정의**. DFN 기존 용어는 내용V4000 — 길이 1000이라 내용V1000. 비슷한 HLP_CN 도움말내용 |
| 73 | `hlp_se_cd` | 1 (tb_hlp_info) | varchar(3) | HLP 도움말 + SE 구분 + CD 코드 | A | 코드C3 — VARCHAR(3) 일치, 분류어 CD 기존 16건 | 용어명: **도움말구분코드** |
| 74 | `ifml_atrz_prcs_hstry_sn` | 1 (tb_ifml_atrz_prcs_hstry) | bigint | IFML* 비공식 + ATRZ 결재 + PRCS 처리 + HSTRY 이력 + SN 일련번호 | A | 일련번호N19 — BIGINT(19) 일치, 분류어 SN 기존 50건 | 용어명: **비공식결재처리이력일련번호** |
| 75 | `induty_cd` | 1 (tb_user_info) | varchar(12) | INDUTY†* 업종→TPBIZ + CD 코드 | B(이름) | 코드C12 — 대상 용어 도메인(VARCHAR(12)) | → TPBIZ_CD(업종코드, 대표 약어로 정정 뒤 등록). INDUTY 비대표. 대안 C |
| 76 | `inq_info` | 1 (tb_privacy_log) | varchar(255) | INQ 조회 + INFO 정보 | B(길이) | 명V256 — 대상 용어 도메인(VARCHAR(256)) | → 조회정보(255 → 256 확장 뒤 등록). 255에 맞는 도메인 없음. 대안 C |
| 77 | `inst_type_lclsf` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(2) | INST 기관 + TYPE 유형 + LCLSF 대분류 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정(코드C2와 길이는 맞음) |
| 78 | `inst_type_mclsf` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(2) | INST 기관 + TYPE 유형 + MCLSF 중분류 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정(코드C2와 길이는 맞음) |
| 79 | `inst_type_sclsf` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(2) | INST 기관 + TYPE 유형 + SCLSF 소분류 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정(코드C2와 길이는 맞음) |
| 80 | `itnt_svc_expln` | 1 (tb_intrn_svc) | varchar(4000) | ITNT 인터넷 + SVC 봉사 + EXPLN 설명 | B(이름) | 내용V4000 — 대상 용어 도메인(VARCHAR(4000)) | → ITNT_SRVC_EXPLN(인터넷서비스설명, 신규 등록). SVC=봉사는 뜻이 다름. 선례 ITNT_SRVC_SN |
| 81 | `itnt_svc_nm` | 1 (tb_intrn_svc) | varchar(100) | ITNT 인터넷 + SVC 봉사 + NM 명 | B(이름) | 명V100 — 대상 용어 도메인(VARCHAR(100)) | → ITNT_SRVC_NM(인터넷서비스명, 신규 등록). SVC=봉사는 뜻이 다름 |
| 82 | `jurir_no` | 1 (tb_user_info) | varchar(13) | JURIR†* 법인→CORP + NO 번호 | B(이름) | 법인등록번호C13 — 대상 용어 도메인(VARCHAR(13)) | → CRNO 법인등록번호(기존). JURIR 비대표 |
| 83 | `lck_cnt` | 1 (tb_user_info) | integer | LCK 잠금 + CNT 수 | B(이름) | 수N10 — 대상 용어 도메인(NUMERIC(10)) | → LGN_FAIL_NMTM 로그인실패횟수(기존). 잠금까지 센 실패 횟수인지 확인 필요. 대안 A*(잠금수, 수N10) |
| 84 | `lck_last_pnttm` | 1 (tb_user_info) | timestamp | LCK 잠금 + LAST 최종 + PNTTM* 시점 | B(이름) | 연월일시분초D — 대상 용어 도메인(DATETIME) | → LCK_DT 잠금일시(기존). 뜻이 같은지 확인 필요. 대안 A(잠금최종시점) |
| 85 | `like_cnt` | 1 (tb_bbs_item) | integer | LIKE†* 추천→RCMDTN + CNT 수 | B(이름) | 수N10 — 대상 용어 도메인(NUMERIC(10)) | → RCMDTN_CNT 추천수(기존). LIKE 비대표, 물리 integer — 동종 |
| 86 | `link_url` | 2 (tb_bnr_info, tb_user_noti) | varchar(2000) | LINK 연계 + URL URL | B(이름) | 주소V2000 — 대상 용어 도메인(VARCHAR(2000)) | → LINK_URL_ADDR 연계URL주소(기존, 길이 같음) |
| 87 | `lwst_inst_nm` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(100) | LWST†* 최저→LOWST + INST 기관 + NM 명 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정 |
| 88 | `max_chc_cnt` | 1 (tb_srvy_qstn) | integer | MAX 최대 + CHC 선택 + CNT 수 | A* | 수N10 — 동종(integer→NUMERIC(10)), 분류어 CNT 기존 113건 | 용어명: **최대선택수** |
| 89 | `mbr_stts_cd` | 1 (tb_cmnty_user_map) | varchar(12) | MBR 회원 + STTS 상태 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **회원상태코드** |
| 90 | `md_telno` | 1 (tb_extrl_hr_info) | varchar(4) | MD 중간 + TELNO 전화번호 | B(이름) | 전화번호V4 — 대상 용어 도메인(VARCHAR(4)) | → TELOFC_TELNO 국전화번호(기존, 동의어 "중간전화번호"). 대안 C |
| 91 | `mdfcn_cnt` | 1 (tb_user_log) | integer | MDFCN 수정 + CNT 수 | B(이름) | 수N10 — 대상 용어 도메인(NUMERIC(10)) | → MDFCN_NOCS 수정건수(기존). 물리 integer — 동종. 대안 A* |
| 92 | `memo_rpt_ymd` | 1 (tb_memo_rpt_info) | varchar(8) | MEMO 메모 + RPT 보고 + YMD 일자 | A | 연월일C8 — VARCHAR(8) 일치, 분류어 YMD 기존 1828건 | 용어명: **메모보고일자** |
| 93 | `menu_id` | 1 (tb_bkmk_menu_mng_rslt) | bigint | MENU 메뉴 + ID 아이디 | B(이름) | 일련번호N19 — 대상 용어 도메인(BIGINT(19)) | → MENU_SN 메뉴일련번호(기존). ID 분류어인데 bigint |
| 94 | `menu_ordr` | 1 (tb_menu_info) | integer | MENU 메뉴 + ORDR 주문 | B(이름) | 순서N10 — 대상 용어 도메인(NUMERIC(10)) | → MENU_SEQ 메뉴순서(기존). ORDR=주문은 뜻이 다름 |
| 95 | `mid_telno` | 1 (tb_srvy_rspdnt) | varchar(4) | MID†* 중간→MD + TELNO 전화번호 | B(이름) | 전화번호V4 — 대상 용어 도메인(VARCHAR(4)) | → TELOFC_TELNO 국전화번호(기존). MID 비대표 |
| 96 | `middle_telno` | 1 (tb_user_info) | varchar(4) | MIDDLE†* 중간→MD + TELNO 전화번호 | B(이름) | 전화번호V4 — 대상 용어 도메인(VARCHAR(4)) | → TELOFC_TELNO 국전화번호(기존). MIDDLE 비대표 |
| 97 | `modern_route` | 1 (tb_menu_info) | varchar(500) | MODERN* 모던 + ROUTE†* 경로→PATH | C | — | Next.js 라우트 기술 컬럼, 500에 맞는 도메인 없음, ROUTE 비대표 |
| 98 | `mpng_file_path` | 1 (tb_stmp_info) | varchar(1000) | MPNG 매핑 + FILE 파일 + PATH 경로 | B(이름+길이) | 명V300 — 대상 용어 도메인(VARCHAR(300)) | → MPNG_FILE_PATH_NM 매핑파일경로명(기존). 1000 → 300 축소는 데이터 확인 필요. 대안 C |
| 99 | `mthd_nm` | 2 (tb_sys_log, tb_user_log) | varchar(100) | MTHD 방법 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **방법명**. 값은 Java 메서드 이름 — 용어명 확인 필요 |
| 100 | `nm` | 1 (tb_adbk_info) | varchar(100) | NM 명 | B(이름) | 명V100 — 대상 용어 도메인(VARCHAR(100)) | → FLNM(성명, 신규 등록). 용어 "명" 단독은 너무 넓다. 대안 C |
| 101 | `noti_ivl_val` | 1 (tb_user_noti) | varchar(100) | NOTI 알림 + IVL†* 개별→INDIV + VAL†* 값→VL | C | — | IVL·VAL 비대표. 엔티티 빌더가 값을 받지 않고 매퍼가 무시한다(@Mapping ignore) — 퇴역 후보, 확인 필요 |
| 102 | `noti_ttl_nm` | 1 (tb_user_noti) | varchar(100) | NOTI 알림 + TTL 제목 + NM 명 | B(이름+길이) | 명V256 — 대상 용어 도메인(VARCHAR(256)) | → NOTI_TTL 알림제목(기존). 물리 100 → 256 확장 |
| 103 | `ntce_bgnde` | 1 (tb_popup_info) | date | NTCE†* 공지→NTC + BGNDE* 시작일 | B(이름+타입) | 연월일C8 — 대상 용어 도메인(VARCHAR(8)) | → NTC_BGNG_YMD 공지시작일자(기존). date → varchar(8) 정정(LocalDate 소비). DATE 도메인이 없다 — 대안 C |
| 104 | `ntce_endde` | 1 (tb_popup_info) | date | NTCE†* 공지→NTC + ENDDE* 종료일 | B(이름+타입) | 연월일C8 — 대상 용어 도메인(VARCHAR(8)) | → NTC_END_YMD 공지종료일자(기존). date → varchar(8) 정정. 대안 C |
| 105 | `ntce_yn` | 1 (tb_popup_info) | varchar(1) | NTCE†* 공지→NTC + YN 여부 | B(이름) | 여부C1 — 대상 용어 도메인(VARCHAR(1)) | → NTC_YN 공지여부(기존). NTCE 비대표 |
| 106 | `occr_ymd` | 1 (tb_web_log) | varchar(8) | OCCR†* 발생→OCRN + YMD 일자 | B(이름) | 연월일C8 — 대상 용어 도메인(VARCHAR(8)) | → OCRN_YMD 발생일자(기존). OCCR 비대표. tb_web_log 35,518행 |
| 107 | `odr` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(2) | ODR 발주자 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정. ODR=발주자는 뜻이 다를 수 있음 |
| 108 | `ofcps_nm` | 1 (tb_user_info) | varchar(300) | OFCPS†* 직위→JBPS + NM 명 | B(이름+길이) | 명V100 — 대상 용어 도메인(VARCHAR(100)) | → JBPS_NM 직위명(기존, 명V100). OFCPS 비대표, 300 → 100 축소는 데이터 확인 필요. 대안 C |
| 109 | `office_telno` | 1 (tb_user_info) | varchar(20) | OFFICE†* 사무소→OFCE + TELNO 전화번호 | B(이름+길이) | 전화번호V11 — 대상 용어 도메인(VARCHAR(11)) | → OFC_TELNO 사무실전화번호(기존). OFFICE 비대표, 20 → 11 축소는 데이터 확인 필요. 대안 C |
| 110 | `ognz_id` | 2 (tb_ognz_info, tb_user_info) | varchar(20) | OGNZ 조직 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **조직아이디** |
| 111 | `onln_mnl_dfn` | 1 (tb_onln_mnl_info) | varchar(4000) | ONLN 온라인 + MNL 매뉴얼 + DFN 정의 | A | 내용V4000 — VARCHAR(4000) 일치, 분류어 DFN 기존 3건 | 용어명: **온라인매뉴얼정의** |
| 112 | `onln_mnl_expln` | 1 (tb_onln_mnl_info) | varchar(4000) | ONLN 온라인 + MNL 매뉴얼 + EXPLN 설명 | A | 내용V4000 — VARCHAR(4000) 일치, 분류어 EXPLN 기존 117건 | 용어명: **온라인매뉴얼설명** |
| 113 | `onln_mnl_nm` | 1 (tb_onln_mnl_info) | varchar(100) | ONLN 온라인 + MNL 매뉴얼 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **온라인매뉴얼명** |
| 114 | `onln_mnl_se_cd` | 1 (tb_onln_mnl_info) | varchar(12) | ONLN 온라인 + MNL 매뉴얼 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **온라인매뉴얼구분코드** |
| 115 | `ord` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(3) | ORD†* 순서→SEQ | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정. ORD 비대표 |
| 116 | `otp_secret` | 1 (tb_user_info) | varchar(32) | OTP OTP + SECRET* 비밀 | C | — | User 엔티티 밖 Java 참조 없음 — OTP 자격은 tb_auth_otp_cert(V2_112)로 옮김. 퇴역 후보(확인 필요), 32에 맞는 도메인 없음 |
| 117 | `otpt_cnt` | 1 (tb_user_log) | integer | OTPT 출력 + CNT 수 | B(이름) | 수N10 — 대상 용어 도메인(NUMERIC(10)) | → OTPT_NOCS 출력건수(기존). 물리 integer — 동종. 대안 A* |
| 118 | `otsd_hr_id` | 1 (tb_extrl_hr_info) | varchar(20) | OTSD 외부 + HR 시간 + ID 아이디 | B(이름) | 명V20 — 대상 용어 도메인(VARCHAR(20)) | → 외부인사아이디(단어 "인사" 등록 필요). HR=시간은 뜻이 다름. 대안 C |
| 119 | `otsd_hr_nm` | 1 (tb_extrl_hr_info) | varchar(100) | OTSD 외부 + HR 시간 + NM 명 | B(이름) | 명V100 — 대상 용어 도메인(VARCHAR(100)) | → 외부인사명(단어 "인사" 등록 필요). HR=시간은 뜻이 다름. 대안 C |
| 120 | `pic_id` | 1 (tb_dept_task_info) | varchar(20) | PIC 담당자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **담당자아이디** |
| 121 | `plcy_ttl` | 1 (tb_plcy_manage) | varchar(100) | PLCY 정책 + TTL 제목 | B(이름+길이) | 명V300 — 대상 용어 도메인(VARCHAR(300)) | → PLCY_NM 정책명(기존). 뜻이 같은지 확인 필요. 100 → 300 확장. 대안 A(정책제목, 명V100) |
| 122 | `plcy_type_cd` | 1 (tb_plcy_manage) | varchar(12) | PLCY 정책 + TYPE 유형 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **정책유형코드** |
| 123 | `poll_artcl_nm` | 1 (tb_onln_poll_artcl) | varchar(100) | POLL* 여론조사 + ARTCL 항목 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **여론조사항목명** |
| 124 | `poll_atmc_dsuse_yn` | 1 (tb_onln_poll_manage) | varchar(1) | POLL* 여론조사 + ATMC†* 자동→AUTO + DSUSE†* 폐기→DSCD + YN 여부 | B(이름) | 여부C1 — 대상 용어 도메인(VARCHAR(1)) | → POLL_AUTO_DSCD_YN(대표 약어로 정정 뒤 등록). ATMC·DSUSE 비대표. 대안 C |
| 125 | `poll_bgng_ymd` | 1 (tb_onln_poll_manage) | varchar(8) | POLL* 여론조사 + BGNG 시작 + YMD 일자 | A | 연월일C8 — VARCHAR(8) 일치, 분류어 YMD 기존 1828건 | 용어명: **여론조사시작일자** |
| 126 | `poll_dsuse_yn` | 1 (tb_onln_poll_manage) | varchar(1) | POLL* 여론조사 + DSUSE†* 폐기→DSCD + YN 여부 | B(이름) | 여부C1 — 대상 용어 도메인(VARCHAR(1)) | → POLL_DSCD_YN(대표 약어로 정정 뒤 등록). DSUSE 비대표. 대안 C |
| 127 | `poll_end_ymd` | 1 (tb_onln_poll_manage) | varchar(8) | POLL* 여론조사 + END 종료 + YMD 일자 | A | 연월일C8 — VARCHAR(8) 일치, 분류어 YMD 기존 1828건 | 용어명: **여론조사종료일자** |
| 128 | `poll_knd_cd` | 1 (tb_onln_poll_manage) | varchar(12) | POLL* 여론조사 + KND 종류 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **여론조사종류코드** |
| 129 | `poll_nm` | 1 (tb_onln_poll_manage) | varchar(100) | POLL* 여론조사 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **여론조사명** |
| 130 | `popup_ttl_nm` | 1 (tb_popup_info) | varchar(100) | POPUP 팝업 + TTL 제목 + NM 명 | B(이름+길이) | 명V256 — 대상 용어 도메인(VARCHAR(256)) | → POPUP_TTL 팝업제목(기존). 물리 100 → 256 확장 |
| 131 | `popup_vrtc_pstn` | 1 (tb_popup_info) | varchar(12) | POPUP 팝업 + VRTC 세로 + PSTN 위치 | B(타입) | 수N7 — 대상 용어 도메인(NUMERIC(7)) | → 팝업세로위치(정수로 정정 뒤 등록). 화면이 숫자로 다룸(popupNumberSchema). 같은 표 크기 컬럼(표 2)과 함께. 0행 |
| 132 | `popup_wdth_pstn` | 1 (tb_popup_info) | varchar(12) | POPUP 팝업 + WDTH 가로 + PSTN 위치 | B(타입) | 수N7 — 대상 용어 도메인(NUMERIC(7)) | → 팝업가로위치(정수로 정정 뒤 등록). 같은 이유. 0행 |
| 133 | `prcs_se_cd` | 1 (tb_sys_log) | varchar(12) | PRCS 처리 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **처리구분코드** |
| 134 | `prcs_type_cd` | 1 (tb_ifml_atrz_prcs_hstry) | varchar(12) | PRCS 처리 + TYPE 유형 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **처리유형코드** |
| 135 | `prep_mttr` | 1 (tb_event_info) | varchar(2500) | PREP* 전임 + MTTR 사항 | B(이름+길이) | 내용V4000 — 대상 용어 도메인(VARCHAR(4000)) | → 준비사항(단어 "준비" 등록 필요). PREP=전임은 뜻이 다름(화면 "준비사항"), 2500에 맞는 도메인 없음. 대안 C |
| 136 | `proc_se` | 1 (tb_inst_cd_rcptn_log) | varchar(1) | PROC 프로세스 + SE 구분 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정(수신 처리 표시) |
| 137 | `progrm_stre_path` | 1 (tb_bkmk_menu_mng_rslt) | varchar(100) | PROGRM†* 프로그램→PRGRM + STRE†* 저장→STRG + PATH 경로 | B(이름) | 명V100 — 대상 용어 도메인(VARCHAR(100)) | → PRGRM_STRG_PATH(대표 약어로 정정 뒤 등록). PROGRM·STRE 비대표, 관례는 PRGRM_PATH_NM(명V300). 대안 C |
| 138 | `pst_bgng_ymd` | 1 (tb_bbs_item) | varchar(8) | PST 게시물 + BGNG 시작 + YMD 일자 | B(이름) | 연월일C8 — 대상 용어 도메인(VARCHAR(8)) | → PSTG_BGNG_YMD 게시시작일자(기존). 뜻(게시 기간 시작)이 같은지 확인 필요. 대안 A |
| 139 | `pst_end_ymd` | 1 (tb_bbs_item) | varchar(8) | PST 게시물 + END 종료 + YMD 일자 | B(이름) | 연월일C8 — 대상 용어 도메인(VARCHAR(8)) | → PSTG_END_YMD 게시종료일자(기존). 같은 확인. 대안 A |
| 140 | `pstinst_cd` | 1 (tb_user_info) | varchar(12) | PSTINST* 소속기관 + CD 코드 | B(이름+길이) | 코드C7 — 대상 용어 도메인(VARCHAR(7)) | → OGDP_INST_CD 소속기관코드(기존, 코드C7). 12 → 7 축소는 데이터 확인 필요. 대안 C |
| 141 | `pswd` | 4 (tb_bbs_comment, tb_bbs_item) | varchar(256) | PSWD 비밀번호 | A | 암호화번호V256 — VARCHAR(256) 일치, 분류어 PSWD 사례 없음 | 용어명: **비밀번호**. 해시 저장(256). 기존 ~PSWD 용어는 번호V25 관례. 게시글·댓글·만족도의 pswd는 미사용(ADR-0011, GAP-BOARD-001) — 제거는 별도 승인. 확인 필요 |
| 142 | `pswd_crans` | 1 (tb_user_info) | varchar(300) | PSWD 비밀번호 + CRANS 정답 | B(이름+길이) | 내용V4000 — 대상 용어 도메인(VARCHAR(4000)) | → PSWD_CRANS_CN 비밀번호정답내용(기존). 300 → 4000 확장. 대안 A(비밀번호정답, 명V300) |
| 143 | `pswd_hint` | 1 (tb_user_info) | varchar(300) | PSWD 비밀번호 + HINT 힌트 | B(이름+길이) | 내용V4000 — 대상 용어 도메인(VARCHAR(4000)) | → PSWD_HINT_CN 비밀번호힌트내용(기존). 300 → 4000 확장. 대안 A(비밀번호힌트, 명V300) |
| 144 | `qna_cat_cd` | 1 (tb_bbs_item) | varchar(12) | QNA 질의응답 + CAT* 카테고리 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **질의응답카테고리코드** |
| 145 | `qna_stts_cd` | 1 (tb_bbs_item) | varchar(12) | QNA 질의응답 + STTS 상태 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **질의응답상태코드** |
| 146 | `qstn_sn` | 1 (tb_srvy_qstn) | bigint | QSTN 질문 + SN 일련번호 | A | 일련번호N19 — BIGINT(19) 일치, 분류어 SN 기존 50건 | 용어명: **질문일련번호** |
| 147 | `qstn_type_cd` | 1 (tb_srvy_qstn) | varchar(12) | QSTN 질문 + TYPE 유형 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **질문유형코드** |
| 148 | `rcptn_se_cd` | 1 (tb_note_rcptn) | varchar(12) | RCPTN 수신 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **수신구분코드** |
| 149 | `rcvr_id` | 3 (tb_email_dsptch_manage, tb_note_rcptn) | varchar(20) | RCVR 수신자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **수신자아이디** |
| 150 | `read_yn` | 1 (tb_user_noti) | varchar(1) | READ†* 조회→INQ + YN 여부 | B(이름) | 여부C1 — 대상 용어 도메인(VARCHAR(1)) | → INQ_YN 조회여부(기존) 또는 PRSL_YN 열람여부. READ 비대표. 뜻(읽음)에 맞는 쪽 확인 필요 |
| 151 | `reg_se_cd` | 1 (tb_cmnty_info) | varchar(12) | REG 등록 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **등록구분코드** |
| 152 | `rel_img_path` | 1 (tb_menu_info) | varchar(100) | REL 관계 + IMG 이미지 + PATH 경로 | A | 명V100 — VARCHAR(100) 일치, 분류어 PATH 사례 없음 | 용어명: **관계이미지경로**. 경로 관례 "~경로명"(명V300). 확인 필요 |
| 153 | `reprs_inst_cd` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(7) | REPRS†* 대표→RPRS + INST 기관 + CD 코드 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정. 기존 용어 RPRS_INST_CD 대표기관코드(코드C7, 길이 같음) |
| 154 | `reprt_sttus` | 1 (tb_rptp_stats) | varchar(1) | REPRT†* 보고서→RPTP + STTUS†* 상태→STTS | B(이름) | 코드C1 — 대상 용어 도메인(VARCHAR(1)) | → RPTP_STTS_CD(보고서상태코드, 신규 등록). REPRT·STTUS 비대표, 분류어 없음. 대안 C |
| 155 | `reprt_type` | 1 (tb_rptp_stats) | varchar(1) | REPRT†* 보고서→RPTP + TYPE 유형 | B(이름) | 코드C1 — 대상 용어 도메인(VARCHAR(1)) | → RPTP_TYPE_CD(보고서유형코드, 신규 등록). REPRT 비대표, 분류어 없음. 대안 C |
| 156 | `rept_se_cd` | 1 (tb_schdl_info) | varchar(12) | REPT 반복 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **반복구분코드** |
| 157 | `rfsh_tkn` | 1 (tb_auth_rfsh_tk) | varchar(4000) | RFSH* 리프레시 + TKN 토큰 | A | 내용V4000 — VARCHAR(4000) 일치, 분류어 TKN 사례 없음 | 용어명: **리프레시토큰**. 해시 저장(DEC-OPS-136) — 뜻은 해시값V64지만 길이가 다름. 기존 TKN_CN 토큰내용. 확인 필요 |
| 158 | `rgstr_se_cd` | 1 (tb_bbs_use_info) | varchar(12) | RGSTR†* 등록자→RGTR + SE 구분 + CD 코드 | B(이름) | 코드C12 — 대상 용어 도메인(VARCHAR(12)) | → RGTR_SE_CD(대표 약어로 정정 뒤 등록). RGSTR 비대표. 대안 C |
| 159 | `rjct_rsn_cn` | 2 (tb_ifml_atrz_hstry, tb_ifml_atrz_info) | varchar(4000) | RJCT 반려 + RSN 사유 + CN 내용 | B(이름) | 내용V4000 — 대상 용어 도메인(VARCHAR(4000)) | → RJCT_RSN 반려사유(기존). "반려사유내용" 등록은 이중 표준. 대안 A |
| 160 | `rls_scope_cd` | 1 (tb_adbk_manage) | varchar(12) | RLS 공개 + SCOPE†* 범위→SCP + CD 코드 | B(이름) | 코드C12 — 대상 용어 도메인(VARCHAR(12)) | → RLS_SCP_CD(대표 약어로 정정 뒤 등록). SCOPE 비대표. 대안 C |
| 161 | `role` | 1 (tb_user_info) | varchar(50) | ROLE 역할 | C | — | enum 문자열(Role), 50에 맞는 명칭·코드 도메인 없음. 인가 전환(ADR-0016) 뒤 소비 확인 필요 |
| 162 | `route_mdfcn_yn` | 1 (tb_menu_info) | varchar(1) | ROUTE†* 경로→PATH + MDFCN 수정 + YN 여부 | C | — | PD-DB-002 — 값 "2"를 쓰는 오명명, 의미 결정 대기 |
| 163 | `rpt_se_cd` | 1 (tb_rpt_info) | varchar(12) | RPT 보고 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **보고구분코드** |
| 164 | `rpt_stts_cd` | 1 (tb_rpt_info) | varchar(12) | RPT 보고 + STTS 상태 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **보고상태코드** |
| 165 | `rpt_ttl` | 2 (tb_memo_rpt_info, tb_rpt_info) | varchar(100) | RPT 보고 + TTL 제목 | A | 명V100 — VARCHAR(100) 일치, 분류어 TTL 사례 없음 | 용어명: **보고제목**. TTL 관례 명V256 — 확인 필요 |
| 166 | `rptr_id` | 1 (tb_memo_rpt_info) | varchar(20) | RPTR 보고자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **보고자아이디** |
| 167 | `rptr_inq_dt` | 1 (tb_memo_rpt_info) | timestamp | RPTR 보고자 + INQ 조회 + DT 일시 | A | 연월일시분초D — DATETIME 일치, 분류어 DT 기존 855건 | 용어명: **보고자조회일시** |
| 168 | `rslt_cd` | 1 (tb_sms_rcptn) | varchar(12) | RSLT 결과 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **결과코드** |
| 169 | `rslt_msg` | 1 (tb_sms_rcptn) | varchar(4000) | RSLT 결과 + MSG 메시지 | B(이름) | 내용V4000 — 대상 용어 도메인(VARCHAR(4000)) | → RSLT_MSG_CN 결과메시지내용(기존) |
| 170 | `rspns_cd` | 1 (tb_sys_log) | varchar(12) | RSPNS 응답 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **응답코드** |
| 171 | `rspns_nm` | 1 (tb_srvy_rslt) | varchar(100) | RSPNS 응답 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **응답명**. 값의 뜻 확인 필요 |
| 172 | `rtn_rsn_cn` | 1 (tb_rward_manage) | varchar(4000) | RTN 반납 + RSN 사유 + CN 내용 | B(이름) | 내용V4000 — 대상 용어 도메인(VARCHAR(4000)) | → RJCT_RSN 반려사유 또는 RTN_RSN 반납사유(둘 다 기존). 포상 승인 흐름의 뜻 확인 필요 |
| 173 | `rwrd_cd` | 1 (tb_rward_manage) | varchar(12) | RWRD 포상 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **포상코드** |
| 174 | `rwrd_user_id` | 1 (tb_rward_manage) | varchar(20) | RWRD 포상 + USER 사용자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **포상사용자아이디** |
| 175 | `sbscrb_ymd` | 1 (tb_user_info) | varchar(8) | SBSCRB†* 가입→JOIN + YMD 일자 | B(이름) | 연월일C8 — 대상 용어 도메인(VARCHAR(8)) | → JOIN_YMD 가입일자(기존). SBSCRB 비대표 |
| 176 | `schdl_dept_id` | 1 (tb_schdl_info) | varchar(20) | SCHDL 일정 + DEPT 부서 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **일정부서아이디** |
| 177 | `schdl_imprt_cd` | 1 (tb_schdl_info) | varchar(12) | SCHDL 일정 + IMPRT 중요도 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **일정중요도코드** |
| 178 | `schdl_knd_cd` | 1 (tb_schdl_info) | varchar(12) | SCHDL 일정 + KND 종류 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **일정종류코드** |
| 179 | `schdl_pic_id` | 1 (tb_schdl_info) | varchar(20) | SCHDL 일정 + PIC 담당자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **일정담당자아이디** |
| 180 | `schdl_plc_nm` | 1 (tb_schdl_info) | varchar(100) | SCHDL 일정 + PLC 장소 + NM 명 | A | 명V100 — VARCHAR(100) 일치, 분류어 NM 기존 1110건 | 용어명: **일정장소명** |
| 181 | `schdl_se_cd` | 1 (tb_schdl_info) | varchar(12) | SCHDL 일정 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **일정구분코드** |
| 182 | `scrap_expln` | 1 (tb_bbs_scrap) | varchar(4000) | SCRAP†* 스크랩→SCRP + EXPLN 설명 | B(이름) | 내용V4000 — 대상 용어 도메인(VARCHAR(4000)) | → SCRP_EXPLN(대표 약어로 정정 뒤 등록). SCRAP 비대표 |
| 183 | `scrap_nm` | 1 (tb_bbs_scrap) | varchar(100) | SCRAP†* 스크랩→SCRP + NM 명 | B(이름+길이) | 명V200 — 대상 용어 도메인(VARCHAR(200)) | → SCRP_NM 스크랩명(기존, 명V200). 100 → 200 확장 |
| 184 | `scrap_url` | 1 (tb_bbs_scrap) | varchar(1000) | SCRAP†* 스크랩→SCRP + URL URL | B(이름+길이) | 주소V2000 — 대상 용어 도메인(VARCHAR(2000)) | → SCRP_URL_ADDR(신규 등록). SCRAP 비대표, URL 관례 주소V2000(1000 → 2000). 대안 C |
| 185 | `scrt_yn` | 1 (tb_bbs_item) | varchar(1) | SCRT 증권 + YN 여부 | B(이름) | 여부C1 — 대상 용어 도메인(VARCHAR(1)) | → PRVT_YN 비공개여부(기존). SCRT=증권은 뜻이 다름(비밀글). 확인 필요 |
| 186 | `sndng_telno` | 1 (tb_sms_info) | varchar(13) | SNDNG 발송 + TELNO 전화번호 | A | 번호C13 — VARCHAR(13) 일치, 분류어 TELNO 사례 없음 | 용어명: **발송전화번호**. TELNO 관례 전화번호V11 — 길이 13에 맞는 것은 번호C13 계열. 확인 필요 |
| 187 | `sndr_id` | 1 (tb_note_sndng) | varchar(20) | SNDR 발송자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **발송자아이디** |
| 188 | `sort_ordr` | 6 (tb_bbs_item, tb_bnr_info) | bigint·integer | SORT 정렬 + ORDR 주문 | B(이름) | 순서N10 — 대상 용어 도메인(NUMERIC(10)) | → SORT_SEQ 정렬순서(기존). ORDR=주문은 뜻이 다름. 6개 표(bigint·integer 섞임), tb_bbs_item UNIQUE 구성 컬럼 |
| 189 | `srvy_rspdnt_id` | 1 (tb_srvy_rspdnt) | varchar(20) | SRVY 설문 + RSPDNT 응답자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **설문응답자아이디** |
| 190 | `srvy_tmplt_img_info` | 1 (tb_srvy_tmplt) | bytea | SRVY 설문 + TMPLT 서식 + IMG 이미지 + INFO 정보 | C | — | bytea — 이진 도메인 없음 |
| 191 | `srvy_tmplt_type_cd` | 1 (tb_srvy_tmplt) | varchar(12) | SRVY 설문 + TMPLT 서식 + TYPE 유형 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **설문서식유형코드** |
| 192 | `srvy_trgt` | 1 (tb_srvy_info) | varchar(1000) | SRVY 설문 + TRGT 대상 | A | 내용V1000 — VARCHAR(1000) 일치, 분류어 TRGT 사례 없음 | 용어명: **설문대상**. 분류어 TRGT 기존 용어 없음. 확인 필요 |
| 193 | `stopvew_setup_yn` | 1 (tb_popup_info) | varchar(1) | STOPVEW†* 그만보기→STVW + SETUP†* 설정→STNG + YN 여부 | B(이름) | 여부C1 — 대상 용어 도메인(VARCHAR(1)) | → STVW_STNG_YN 그만보기설정여부(기존). STOPVEW·SETUP 비대표 |
| 194 | `stsfdg_yn` | 2 (tb_bbs_master, tb_bbs_master_optn) | varchar(1) | STSFDG†* 만족도→DGSTFN + YN 여부 | B(이름) | 여부C1 — 대상 용어 도메인(VARCHAR(1)) | → DGSTFN_YN(대표 약어로 정정 뒤 등록). STSFDG 비대표. 뜻이 "만족도 사용 여부"면 DGSTFN_USE_YN — 확인 필요 |
| 195 | `task_se_cd` | 3 (tb_ifml_atrz_hstry, tb_ifml_atrz_info) | varchar(12) | TASK 업무 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **업무구분코드** |
| 196 | `tmplt_id` | 3 (tb_bbs_master, tb_cmnty_info) | varchar(20) | TMPLT 서식 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **서식아이디** |
| 197 | `tmplt_path` | 1 (tb_tmplt_info) | varchar(1000) | TMPLT 서식 + PATH 경로 | B(이름+길이) | 명V300 — 대상 용어 도메인(VARCHAR(300)) | → TMPLT_PATH_NM 서식경로명(기존). 1000 → 300 축소는 데이터 확인 필요. 대안 C |
| 198 | `tmplt_se_cd` | 1 (tb_tmplt_info) | varchar(12) | TMPLT 서식 + SE 구분 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **서식구분코드** |
| 199 | `top_inst_cd` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(7) | TOP†* 상위→UP + INST 기관 + CD 코드 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정. 기존 용어 UP_INST_CD 상위기관코드(코드C7) |
| 200 | `trget_ognz_id` | 1 (tb_adbk_manage) | varchar(20) | TRGET†* 대상→TRGT + OGNZ 조직 + ID 아이디 | B(이름) | 명V20 — 대상 용어 도메인(VARCHAR(20)) | → TRGT_OGNZ_ID(대표 약어로 정정 뒤 등록). TRGET 비대표 |
| 201 | `trgt_id` | 1 (tb_bbs_use_info) | varchar(20) | TRGT 대상 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **대상아이디** |
| 202 | `trgt_user_id` | 1 (tb_ifml_atrz_prcs_hstry) | varchar(20) | TRGT 대상 + USER 사용자 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **대상사용자아이디** |
| 203 | `ttl_bold_yn` | 1 (tb_bbs_item) | varchar(1) | TTL 제목 + BOLD* 볼드 + YN 여부 | A | 여부C1 — VARCHAR(1) 일치, 분류어 YN 기존 1424건 | 용어명: **제목볼드여부** |
| 204 | `up_admdst_cd` | 1 (tb_admdst_cd) | varchar(12) | UP 상위 + ADMDST 행정구역 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **상위행정구역코드** |
| 205 | `up_ognz_id` | 1 (tb_ognz_info) | varchar(20) | UP 상위 + OGNZ 조직 + ID 아이디 | A | 명V20 — VARCHAR(20) 일치, 분류어 ID 기존 8건 | 용어명: **상위조직아이디** |
| 206 | `upr_inst_cd` | 2 (tb_inst_cd, tb_inst_cd_rcptn_log) | varchar(7) | UPR†* 상위→UP + INST 기관 + CD 코드 | C | — | 기관코드 공급 형식 컬럼 — GAP-CODE-001(공급처 명세 미확정)이 풀릴 때 일괄 판정. 기존 용어 UP_INST_CD 상위기관코드(코드C7) |
| 207 | `url` | 1 (tb_web_log) | varchar(1000) | URL URL | B(이름+길이) | 주소V2000 — 대상 용어 도메인(VARCHAR(2000)) | → URL_ADDR URL주소(기존). 1000 → 2000 확장. tb_web_log 35,518행 |
| 208 | `user_stts_cd` | 1 (tb_user_info) | varchar(12) | USER 사용자 + STTS 상태 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **사용자상태코드** |
| 209 | `user_type_cd` | 1 (tb_user_info) | varchar(12) | USER 사용자 + TYPE 유형 + CD 코드 | A | 코드C12 — VARCHAR(12) 일치, 분류어 CD 기존 5건 | 용어명: **사용자유형코드** |
| 210 | `version` | 3 (tb_bbs_item, tb_ifml_atrz_info) | integer | VERSION(단어 없음) | C | — | JPA @Version 낙관적 잠금 기술 컬럼. 단어 VERSION 미등록(단어 "버전"은 VER). 2026-10-19 V2_133(DEC-OPS-359)이 10개 표에 같은 기술 컬럼을 더한다 — 수는 OCI 적용 뒤 집계로 갱신한다. 2026-10-22 DEC-OPS-378 이 C 를 확정했다 — 새 표도 같은 기술 컬럼을 쓰고 표준 용어를 만들지 않는다 |
| 211 | `wrter_id` | 2 (tb_adbk_manage, tb_bbs_comment) | varchar(20) | WRTER†* 작성자→WRTR + ID 아이디 | B(이름) | 명V20 — 대상 용어 도메인(VARCHAR(20)) | → WRTR_ID(대표 약어로 정정 뒤 등록). WRTER 비대표 |
| 212 | `wrter_nm` | 1 (tb_bbs_comment) | varchar(100) | WRTER†* 작성자→WRTR + NM 명 | B(이름) | 명V100 — 대상 용어 도메인(VARCHAR(100)) | → WRTR_NM 작성자명(기존). WRTER 비대표 |

## 3. 표 2 — 용어는 있고 도메인 타입이 다른 컬럼 26개

| 테이블.컬럼 | 용어 | 도메인 타입(길이) | 물리 타입 | 종류 | 제안 | 영향(이관 / 온라인) | 비고 |
|---|---|---|---|---|---|---|---|
| `tb_bbs_comment.pst_sn` | 게시물일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Board board | PST_SN(공통표준)을 쓰는 6개가 모두 bigint. V2_69 가 bigint 전환 때 N22 를 단언한 이유는 기록에 없다 — 확인 필요 |
| `tb_bbs_item.pst_sn` | 게시물일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Long pstSn [name = "pst_sn"] | 위와 같은 용어 PST_SN |
| `tb_bbs_rcmdtn_hstry.pst_sn` | 게시물일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Long pstSn [name = "pst_sn", nullable = false, updatable = false] | 위와 같은 용어 PST_SN |
| `tb_bbs_scrap.pst_sn` | 게시물일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Board board | 위와 같은 용어 PST_SN |
| `tb_dgstfn_info.pst_sn` | 게시물일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Long pstSn [nullable = false] | 위와 같은 용어 PST_SN |
| `tb_dta_use_stats.pst_sn` | 게시물일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Long pstSn | 위와 같은 용어 PST_SN |
| `tb_bbs_comment.ans_sn` | 답변일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Long ansSn | ANS_SN(공통표준)을 쓰는 2개가 모두 bigint. 선례 V2_56·V2_76 |
| `tb_bbs_item.ans_sn` | 답변일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Long ansSn | 위와 같은 용어 ANS_SN |
| `tb_bbs_item.up_pst_sn` | 상위게시물일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Long upPstSn [name = "up_pst_sn"] | 프로젝트 용어(V2_69 등록) |
| `tb_srvy_artcl.artcl_sn` | 항목일련번호 (일련번호N10) | NUMERIC(10) | bigint | 같음 | 도메인 정정 → 일련번호N19 | 이관: 통과(동종) → 정정 뒤 정확 일치 / 온라인: 없음(메타만), 엔티티 Long artclSn | ARTCL_SN 은 이 컬럼만 쓴다. 도메인(10자리)이 물리보다 좁다 |
| `tb_bbs_item.cmnt_cnt` | 댓글수 (수N10) | NUMERIC(10) | integer | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Integer cmntCnt | INTEGER 도메인이 없다 |
| `tb_dgstfn_info.dgstfn_scr` | 만족도점수 (수N7) | NUMERIC(7) | integer | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Integer dgstfnScr [nullable = false] | INTEGER 도메인이 없다 |
| `tb_inst_cd_rcptn_log.job_sn` | 작업일련번호 (일련번호N22) | NUMERIC(22) | bigint | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Long jobSn | JOB_SN 을 쓰는 tb_sys_job.job_sn 은 numeric(22)로 도메인과 맞아, 도메인을 바꾸면 그쪽이 어긋난다. GAP-CODE-001 표 |
| `tb_bbs_item.inq_cnt` | 조회수 (수N10) | NUMERIC(10) | integer | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Integer inqCnt | INTEGER 도메인이 없다 |
| `tb_user_log.inq_cnt` | 조회수 (수N10) | NUMERIC(10) | integer | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Integer inqCnt | INTEGER 도메인이 없다 |
| `tb_bbs_master.atch_psblty_file_sz` | 첨부가능파일크기 (수N14) | NUMERIC(14) | bigint | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Long atchPsbltyFileSz | 바이트 수. BIGINT 수량 도메인이 없고 물리 범위가 도메인보다 넓다 |
| `tb_file_detail.atch_file_seq` | 첨부파일순서 (순서N10) | NUMERIC(10) | integer | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Integer atchFileSeq | INTEGER 도메인이 없다 |
| `tb_bbs_item.file_cnt` | 파일수 (수N10) | NUMERIC(10) | integer | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Integer fileCnt | INTEGER 도메인이 없다 |
| `tb_dta_use_stats.file_sn` | 파일일련번호 (일련번호N22) | NUMERIC(22) | integer | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Integer fileSn | 물리(integer)가 도메인(22자리)보다 좁다 — 이관 값이 integer 를 넘으면 물리 검사에서 걸린다 |
| `tb_file_detail.file_sz` | 파일크기 (수N14) | NUMERIC(14) | bigint | 같음 | 예외 유지 | 이관: 통과(동종) / 온라인: 없음, 엔티티 Long fileSz | 바이트 수. atch_psblty_file_sz 와 같은 이유 |
| `tb_dept_task_info.prrty_rnk` | 우선순위 (수N10) | NUMERIC(10) | varchar(12) | 다름 | 물리 타입 정정 varchar(12) → integer | 이관: **실패**(종류 다름 — 용어가 있어 nonStandardTarget 도 불가) → 정정 뒤 통과 / 온라인: 엔티티 String prrtyRnk [length = 12] → Integer, API·zod 재생성, 화면 | 값이 '1'~'3' 우선순위. 0행 |
| `tb_popup_info.popup_wdth_sz` | 팝업가로크기 (수N7) | NUMERIC(7) | varchar(12) | 다름 | 물리 타입 정정 varchar(12) → integer | 이관: **실패**(종류 다름 — 용어가 있어 nonStandardTarget 도 불가) → 정정 뒤 통과 / 온라인: 엔티티 String popupWdthSz [length = 12] → Integer, API·zod 재생성, 화면 | 화면이 숫자로 다룬다(popupNumberSchema). 표 1 popup_*_pstn 과 한 변경으로. 0행 |
| `tb_popup_info.popup_vrtc_sz` | 팝업세로크기 (수N7) | NUMERIC(7) | varchar(12) | 다름 | 물리 타입 정정 varchar(12) → integer | 이관: **실패**(종류 다름 — 용어가 있어 nonStandardTarget 도 불가) → 정정 뒤 통과 / 온라인: 엔티티 String popupVrtcSz [length = 12] → Integer, API·zod 재생성, 화면 | 화면이 숫자로 다룬다(popupNumberSchema). 표 1 popup_*_pstn 과 한 변경으로. 0행 |
| `tb_bbs_item.ans_lv` | 답변레벨 (번호V10) | VARCHAR(10) | integer | 다름 | 이름 정정 후보(1차는 예외 유지) | 이관: **실패**(종류 다름 — 용어가 있어 nonStandardTarget 도 불가) / 온라인: 이름을 바꾸면 엔티티 Integer ansLv·조회·원장 대상명 | 답변 깊이 정수. 공통 용어 "~레벨" 13개가 모두 번호V10 이라 도메인 정정은 공통표준 이탈. 후보: 답변깊이(ANS_DPTH, 단어 깊이=DPTH 있음, 용어 신규) |
| `tb_sys_log.prcs_tm` | 처리시각 (시분초C6) | VARCHAR(6) | bigint | 다름 | 이름 정정(1차는 예외 유지) | 이관: **실패**(종류 다름 — 용어가 있어 nonStandardTarget 도 불가) / 온라인: 이름을 바꾸면 엔티티 Long prcsTm·조회·원장 대상명 | 값은 처리 소요시간(ms)인데 PRCS_TM 은 "처리시각"(시분초C6). 도메인을 바꾸면 공통 용어의 뜻이 깨진다. 숫자 도메인 새 용어가 필요하고 단어 "밀리초"가 없다(제9조) |
| `tb_web_log.prcs_tm` | 처리시각 (시분초C6) | VARCHAR(6) | bigint | 다름 | 이름 정정(1차는 예외 유지) | 이관: **실패**(종류 다름 — 용어가 있어 nonStandardTarget 도 불가) / 온라인: 이름을 바꾸면 엔티티 Long prcsTm·조회·원장 대상명 | tb_sys_log.prcs_tm 과 같은 이유. 35,518행 |

## 4. 요약

### 분류별 건수 — 2026-10-18 상세 분류, 현행 재분류 아님

| 분류 | 고유 이름 | 컬럼 | 세부 |
|---|---|---|---|
| A 등록 후보 | 107 | 143 | A 105(컬럼 141) · A* 2(컬럼 2) · 그중 확인 필요 12 |
| B 정정 후보 | 84 | 100 | B(길이) 1 · B(이름) 61 · B(이름+길이) 18 · B(이름+타입) 2 · B(타입) 2 — 기존 용어로 정정 57, 정정 뒤 새 등록 27 |
| C 예외 유지 | 21 | 33 | 기관코드 공급 형식 13 · 기술 컬럼·의미 미정·퇴역 후보 8 |
| 합계 | 212 | 276 | |

표 2(26개): 도메인 정정 10 · 예외 유지 10 · 물리 타입 정정 3 · 이름 정정(1차 예외 유지) 3. 종류 같음 20 · 다름 6.

B 의 상당수는 "대안 A" 또는 "대안 C" 를 함께 적었다. 이름 정정은 컬럼마다 Expand-and-Contract 와 엔티티·API·원장 변경이 따르므로, 실익이 비용보다 작으면 C 로 남기는 것이 기본이다.

### 승인 단위 제안

1. **1차 — 현재 재대조·승인한 A 목록 등록**(메타 전용 마이그레이션): 과거 A 107개는 후보 목록이다. 등록 시점의 사전·물리 컬럼과 업무 의미를 다시 대조하고 소유자가 확정한 목록만 `INSERT … ON CONFLICT (eng_abbr) DO NOTHING` + 검증 DO 블록으로 넣는다. "확인 필요" 12개는 소유자 확인 뒤 넣거나 뺀다. 마이그레이션 계약 테스트를 같이 두고, 공유 OCI 적용은 따로 승인한다. 적용 뒤 이 컬럼들을 가리키는 이관 원장의 `nonStandardTarget` 을 용어로 바꾸고, 같은 집계 쿼리로 GAP-STD-001 수와 검증일을 다시 센다. 이미 기술 예외로 승인된 `version`은 등록 대상에서 제외한다.
2. **2차 — 표 2 도메인 정정 10개**(메타 전용): ANS_SN·PST_SN·UP_PST_SN·ARTCL_SN 을 일련번호N19 로. DDL 이 없어 1차와 한 파일에 넣을 수 있지만 공통표준 용어의 도메인을 바꾸는 일이라 승인 항목을 나눈다.
3. **3차 — B 컬럼별 DDL 결정**: 표 단위로 묶는다. tb_popup_info와 tb_dept_task_info의 과거 0행 관측은 현재 데이터량·동시 쓰기·계약 영향의 안전성 증거가 아니다. 정정 직전 실제 값의 범위와 참조·API 영향을 확인하고 이행 계획을 승인한다. 표 2의 `varchar → integer`는 이관 도구의 같은 숫자 종류 판정을 통과하는 후보이지 `NUMERIC` 도메인과 타입·길이가 정확히 일치하는 안은 아니다. 최종 타입은 사전과 업무 의미를 함께 판단한다. 길이 축소(cmpny_nm·ofcps_nm·office_telno·file_estn·mpng_file_path·tmplt_path·pstinst_cd)는 실데이터 최대 길이를 먼저 잰다. 이름 정정은 한 표의 여러 컬럼을 한 Expand-and-Contract 로 묶고 ZDM waiver 를 등록한다.
4. **C 기록**: 해당 schema의 live 메타에 같은 영문약어의 용어가 없는 대상만 이관 원장에서 `nonStandardTarget` 과 사유로 확정한다. 표 2의 이름 정정 대상 3개에 적힌 "1차 예외 유지"는 정정 보류이며 현재 이관 차단은 유지된다. `version`의 기술 예외 승인은 DEC-OPS-378을 따른다. 퇴역 후보(otp_secret·noti_ivl_val, 게시글·댓글·만족도 pswd)의 제거는 별도 스키마 승인이다. 기관코드 공급 형식 컬럼은 GAP-CODE-001 의 재개 조건(공급처 명세 확정)과 묶는다.

### 남는 위험

- 같은 뜻 기존 용어 탐색은 한글 용어명 일치, 대표 약어 치환, V2_128 동의어, 분류어 바꿔 보기(수↔건수·횟수, 아이디↔식별자·번호, 제목↔명, ~경로↔~경로명, ~URL↔~URL주소 등)까지만 했다. 이 범위 밖의 동의어가 있으면 A 가 이중 표준이 된다 — 등록 전 소유자가 표 1 의 A 를 훑어야 한다.
- 뜻 판정은 컬럼 COMMENT(대부분 단어 조합으로 자동 생성돼 근거가 약하다), 엔티티 필드, 화면 라벨로 했다. "확인 필요" 표시는 업무 소유자 판단이 필요하다.
- A\* 와 표 2 의 예외 유지는 INTEGER 도메인이 없어서 생긴다. INTEGER 도메인 신설은 이 처분안 범위 밖이며 따로 정할 일이다. DATE 도메인도 없어 date 컬럼(공지시작·종료일)은 varchar(8) 로 바꾸거나 C 로 남기는 둘 중 하나다.
- 표 1·표 2와 A/B/C 분류는 2026-10-18 공유 OCI 개발 DB 조사다. 2026-10-29 재실측 차분은 머리에 구분했으며 전체 후보의 업무 의미·도메인을 다시 승인한 것은 아니다. 다른 환경이나 이후 스키마 변경은 같은 쿼리로 다시 센다. 재사용 생성물의 메타 시드(V1_1)는 생성 때 Flyway 결과에서 다시 덤프되므로 등록 마이그레이션이 그대로 따라간다.
- 이 처분안은 public 스키마 `tb_` 기본 테이블만 봤다. 뷰·다른 스키마·메타 테이블 자신은 대상이 아니다(헌법 제3조 2항).

