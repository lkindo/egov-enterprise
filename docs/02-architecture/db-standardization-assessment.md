# DB 표준화 수준 종합 진단 (DB Standardization Assessment)

> **작성**: 2026-07-16 · Claude Code (9차원 병렬 감사 워크플로우 + 메인 에이전트 교차 재검증)
> **대상**: OCI PostgreSQL 17 `egovdb` `public` 스키마 (테이블 104 · 컬럼 1,155 · 시퀀스 8 · FK 18) + 리포지토리 하네스
> **기준**: [DB 표준화 헌법](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md) 10조 전문 + [예외 대장](db-naming-exceptions.md)
> **방법**: 전 수치 db-bridge SELECT 실측(추정 0건), Supabase 플랫폼 스키마 제외, CRITICAL 판정은 메인 에이전트가 독립 쿼리로 재확인

---

## 1. 종합 스코어카드

**종합: ≈77 / 100** — 단, 단일 점수보다 **이원 구조**로 읽어야 정확하다:

| 축 | 점수 | 해석 |
|---|:---:|---|
| **명세 합치 (표면 표준화)** | **≈89** | 명명·타입·감사컬럼은 사실상 완성 단계 |
| **실질 무결성·집행 (심층 표준화)** | **≈62** | FK 커버리지·SSOT 구조·자동 게이트가 공백 |

| # | 차원 | 헌법 근거 | 점수 | 핵심 실측 |
|:---:|---|---|:---:|---|
| 1 | 오브젝트 명명 (테이블·시퀀스) | 제1·3·4조 | **92** | tb_ 97/97(100%) · 복수형 위반 0 · 잔여 부채 2(seq_tb_hldy_info, tb_role_hierarchy) |
| 2 | 컬럼 명명 (SSOT 용어) | 제2·5조 | **87** | 단어수준 99.6% 준수 · 완전 미등록 3건뿐 · 단 용어사전(terms) 등재율 41.1% |
| 3 | 데이터 타입·도메인 | 제5조 3~4항 | **88** | **char 금지 100%(0/1,155)** · _yn 100% · 접미사-도메인 93.6% · cross-type 분열 3건 |
| 4 | 제약·인덱스 명명 | 제6조 | **83** | PK 명명 100%(99/99) · FK 접두 100% · 자동생성명 잔존 0 · 독립 인덱스 ix_ 60% |
| 5 | **참조 무결성 (FK 실질)** | 전문 | **40** | FK 18/107 관계(~17%) · **고아행 ~729행** · 자식 인덱스 부재 11/18 |
| 6 | Audit 컬럼 | 제8조 | **96** | 4종 완비 97/97(100%) · 짝깨짐 0 · 레거시 표기 유출 0 · 이형 1건(tb_event_info 30자) |
| 7 | 마이그레이션 계보 | 제7조 | **78**\* | 기록구간 checksum까지 100% 정합 · V2_6~11 라이브 선적용(history 미등재, 차기 기동 수렴) |
| 8 | 엔티티↔스키마 드리프트 | 제2조 | **83** | 엔티티→DB 86/86(100%) · 고아 테이블 10(전부 0행) · 死엔티티 지뢰 1 |
| 9 | **거버넌스 집행 인프라** | 제2·9조 | **45** | 자동 게이트 1개(ZeroDowntime 린터)뿐 · 명명 스캐너 형해화 · CI 게이트 0 |

\* 감사 에이전트 원점수 74에서 조정: "V2_6~V2_11 untracked 유실 위험" 주장은 메인 재검증 결과 **기각** — 2026-07-16 pull로 전부 커밋 완료(`git ls-files` 실측). history 공백(rank 9=V2_5까지)만 잔존하며 전 파일 멱등 가드로 차기 bootRun 시 무해 수렴.

---

## 2. 확실히 잘된 것 (강점 — 실측 근거)

1. **명명 표준의 물리 이행 완결**: tb_ 접두 100%, PK `pk_*` 100%(프레임워크 예약 3건까지 V2_7로 표준화), 자동생성명(`_pkey`/`_fkey`) 잔존 0, 진성 복수형 0. 비표준 7개 테이블은 전부 예외 대장 소명(ecopseq/ids/revinfo/meta×3/flyway).
2. **char 전면 금지(제5조 4항) 100%**: 1,155컬럼 전수에서 char/bpchar 0건. `*_yn` 64건 전부 varchar(1).
3. **감사컬럼(제8조) 100%**: 97개 tb_ 테이블 전수 4종 완비, 타입 일관(timestamp 100%), 레거시 표기(frst_register_id 등)의 예외 밖 유출 0.
4. **적용 구간 계보 무결**: V2_2~V2_5 checksum 재계산 완전 일치(Flyway CRC32 Node 재구현 검증), 실패 이력 0, baseline 2.1 정합.
5. **기선언 FK 18건의 품질**: NOT VALID 0(V2_9 승격 완결), 정책 NO ACTION 18/18 일관, 기존 FK 경로 고아 0.
6. **V2_6~V2_11 작업 패턴 자체는 모범**: NOT VALID→고아감사→VALIDATE 2단, 멱등 가드 전 파일 적용.

## 3. 핵심 결손 (심각도순)

### 🔴 CRITICAL — 고아행 실존 (메인 에이전트 재확인 완료) → ✅ **2026-07-16 해소 (V2_12)**
| 대상 | 실측 | 의미 | 조치 |
|---|---|---|---|
| `tb_user_authrt_map.scrty_dcsn_trgt_id` | **173/197 (88%) 고아** | **보안 인가 매핑**이 존재하지 않는 주체를 참조 — FK 부재로 유입 지속 | ✅ 백업→DELETE + FK |
| `tb_bbs_item.user_id` | **180/377 (48%) 고아** | 전량 레거시 placeholder(USRCNFRM_*) + 컬럼명은 user_id인데 값은 esntl_id(식별자 혼용의 물리 증거) | ✅ webmaster 재귀속 + FK |
| 기타 6개 관계 | menu_crt_dtl 18 · user_noti(rcvr_id) 138 · web_log 168 · adbk 34 · comment 25 · rfsh_tk 2 | 합계 ~730행 | ✅ 백업→DELETE (web_log 는 P2 키 단일화 대상으로 잔존) |

> **V2_12 이행 기록**: 고아 7개 관계 0건 실측 + FK 7건(NO ACTION) VALIDATED + 자식 인덱스 7건 + V2_6 잔여 NOT VALID 5건 승격. 재발 방지 코드(UserService 종속 정리 + UserDeletionEvent 동기 리스너 + MenuService crt_dtl 선정리, deleteUserList no-op 버그 수정 포함) 동일 릴리스 결속. 상세: [.gemini/tasks/20260716-orphan-cleanup-referential-fks.md](../../.gemini/tasks/20260716-orphan-cleanup-referential-fks.md)

### 🟠 HIGH — 구조적 공백
1. **FK 커버리지 ~17% (18/107 관계)**: 이름매칭 82 + 의미론 7 후보가 미선언. **고아 0으로 즉시 FK 가능한 관계 25+개 실측 확인** (bbs_comment.pst_id/bbs_id, atch_file_id 13곳, authrt_role_map.authrt_cd, srvy 계열 등) — V2_12+ 즉효 지대.
2. **사용자 참조 키 혼용**: 같은 의미 컬럼이 테이블별로 esntl_id/loginId를 제각각 저장(web_log·sys_log=loginId, adbk·comment=esntl_id, rfsh_tk=혼입). **단일화 없이는 로그·인증 테이블 FK 확장 원천 불가.**
3. **SSOT 구조 결손**: `meta_standard_terms`에 도메인 매핑 컬럼 자체가 부재(5컬럼뿐, 재확인 완료) → 제5조 3단계(도메인 강제)의 기계 검증 원천 불가. words는 PK/UNIQUE 0개로 실중복 유입(완전중복 4쌍, 동일 단어 다중약어 70그룹), CHAR 도메인 38/129건은 제5조 4항과 자기모순.
4. **집행 장치 공백**: 자동 하드게이트는 ZeroDowntime DDL 린터 1개(제7조)뿐. 유일한 명명 스캐너 check-db-standard.js는 존재하지 않는 모듈(business-suite)을 스캔해 엔티티 커버리지 1.1%로 형해화(삭제 예정 문서에 이미 등재). CI/pre-push에 DB 표준 게이트 0. CI 스텝 "Strict Schema Integrity Validation"은 실제 스키마 검증 없음(명칭 과대).

### 🟡 MEDIUM — 정리 대상 부채
- **타입 분열 25건(5.1%)**: cross-type 3건(pst_id varchar↔bigint, noti_sn, prcs_tm) 은 FK/조인 파손급 · varchar(30) 이상치 클러스터(tb_event_info 중심 6컬럼) · `*_cd` 길이 이탈 17건 · `*ymd*` 이탈 9건 · fax_no 4종 길이 등
- **고아 테이블 10개**(전부 0행·코드 참조 0 — tb_role_lyr는 tb_role_hierarchy와 개념 중복) + 고아 시퀀스 sq_ntt_id + 死엔티티 board/Template.java(NOT NULL 미매핑 지뢰) + tb_ognz_info 이중 매핑
- **tb_indv_pg_set PK 부재**(유일, 0행이라 무피해 — 지금이 적기) · fk_role_prgrm_map_* 2건 명명 이탈(V2_11, history 미기록인 지금이 정정 적기)
- **ddl-auto=validate가 기본 profile뿐**: prod/dev/local/e2e 전부 none — 부팅 드리프트 검출 꺼짐
- **린터 사각지대**: ALTER SEQUENCE RENAME/DROP TABLE 무검출, RENAME CONSTRAINT 오탐으로 V2_7이 disable-file 전체 우회. 헌법 제7조 3항 명세(환경 차등·델타 한정)와 구현 불일치
- **fresh-DB 경로 NOT VALID 잔존**: V2_6 FK 5건은 V2_9 VALIDATE 대상에서 빠져 신규 DB에서 카탈로그 상태가 라이브와 갈라짐

### ⚪ LOW/INFO
- 예외 대장 미등재 3건(flyway_schema_history, revinfo_seq, seq_tb_hldy_info) · uk_ 명명 유니크 "인덱스" 5건(제약 승격 권장) · 인덱스 명칭-실컬럼 드리프트 6건 · sort_ordr 의미 드리프트(ORDR=주문 오용) · version/higher/lower 미등록 단어 · tb_user_info.lck_last_pnttm 레거시 단어 · V2_11 검증 주석 오기(42→52)

## 4. 우선순위 로드맵 (제안)

| 순위 | 작업 | 근거 | 성격 |
|:---:|---|---|---|
| ~~**P0**~~ | ~~고아행 정리(729행) + 보안 매핑 FK~~ — ✅ **완료(2026-07-16, V2_12)**: 고아 0건·FK 7건 VALIDATED·재발 방지 코드 결속 | CRITICAL 2 + HIGH | 완료 |
| ~~**P1**~~ | ~~FK 배치 확장~~ — ✅ **대부분 완료(2026-07-17, V2_13·V2_14)**: FK 25→58(+33, 전건 VALIDATED)·인덱스 37 보강·타입 정렬 2건·부모 삭제 플로우 앱 결속 10종(설문 연쇄·권한/그룹/메뉴 가드·키 혼용 정정 포함). **잔여**: fk_role_prgrm_map_* 명명 정정(사용자 보류 — 라이브 RENAME+V2_11 치환 원자 시행 필요), DEFER 2건(leader_schdl — 관계 불성립/부모 사경화). 상세: [.gemini/tasks/20260717-fk-batch-expansion-p1.md](../../.gemini/tasks/20260717-fk-batch-expansion-p1.md) | HIGH | 완료(보류 1) |
| **P2** | 사용자 참조 키 esntl_id 단일화 규약 확정(진행 중 RBAC unification 태스크 연계) → 로그 테이블 백필 | HIGH(구조) | 제품 결정 |
| **P3** | SSOT 정비: terms에 domain 매핑 복원(재시드), words UNIQUE+중복 정리, CHAR 도메인 38건 varchar 정정, 개념당 대표 약어 지정 | HIGH(거버넌스) | 마이그레이션+시드 |
| ~~**P4**~~ | ~~집행 하네스~~ — ✅ **완료(2026-07-17)**: SchemaNamingLinterTest 신설(명명·char금지·감사컬럼 델타 정적검사) + ZeroDowntime 린터 결함 3종 수정. **🚨 뮤테이션 검증에서 기존 게이트가 workingDir 결함으로 처음부터 silent-skip(false-green)이었음을 실증** — 경로 이중해석+미발견 즉시실패+빌드입력 등록으로 정정, 위반 주입→검출→그린 3단계 증명. 잔여: 죽은 스캐너 2파일 삭제(사용자 승인 대기), 헌법 제7조3항 명세-구현 정합(헌법 개정 사안). 상세: [.gemini/tasks/20260717-db-standard-enforcement-harness.md](../../.gemini/tasks/20260717-db-standard-enforcement-harness.md) | HIGH(집행) | 완료 |
| **P5** | 타입 정렬 스윕(cross-type 3 → varchar(30) 클러스터 → cd/ymd 이상치), 고아 테이블 10개 처분 결정, 死엔티티 정리, 예외 대장 3건 추기, dev/local ddl-auto=validate 복원 | MEDIUM | 마이그레이션+코드 |

## 5. 판정 요약

**"이름의 표준화"는 끝났고, "관계의 표준화"는 이제 시작이다.** 명명·타입·감사컬럼 등 눈에 보이는 표준(헌법 제1~6·8조의 명세 합치)은 V2_7~V2_8 시리즈로 사실상 완성 수준(≈89점)에 도달했다. 그러나 데이터 무결성을 실제로 지키는 층위 — FK 커버리지(17%), 고아행(729), SSOT의 기계 검증 가능성(terms→domains 매핑 부재), 자동 집행 게이트(1개) — 는 여전히 취약(≈62점)하며, 특히 보안 인가 매핑 테이블의 88% 고아는 즉시 조치가 필요하다. 표준화의 다음 단계는 리네임이 아니라 **FK 확장 + SSOT 구조 복원 + 집행 하네스**다.

---
*근거 데이터: 9차원 감사 전문은 워크플로우 로그(wf_233dc02b-219) 참조. 본 문서의 CRITICAL·구조 결손 판정은 메인 에이전트가 독립 쿼리로 재확인함.*
