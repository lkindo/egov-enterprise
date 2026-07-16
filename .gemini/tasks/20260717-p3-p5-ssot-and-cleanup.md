# 20260717 — P3(SSOT 정비 V2_15) + P5(고아·cross-type·死엔티티 정리 V2_16)

> **등급**: L2 · **승인**: 사용자 6결정(2026-07-17 AskUserQuestion ×2회 — P3 3건 + P5 3건 전부 승인)
> **선행 조사**: P3 4개 병렬 + P5 3개 병렬 워크플로우 (전 수치 실측, 판정 근거 journal 보존)

## 1. V2_15 — SSOT 메타 표준사전 정규화 (라이브 적용·검증 완료)

| 항목 | 결과 |
|---|---|
| 완전중복 제거 | words '실효/ACEF' 1행 + terms 3행(상호·납세자명·사업자명, 화이트리스트 한정) — 백업 후 |
| 무결성 제약 | `pk_meta_standard_words`(word_name,eng_abbr) + `uk_meta_standard_terms_term_abbr` + `uk_meta_standard_terms_eng_abbr` + `uk_meta_standard_domains_domain_name` — **SSOT 무제약 상태 종료** |
| CHAR 도메인 정정 | 이중 3행 DELETE + 35행 VARCHAR UPDATE → **CHAR 0/126** (헌법 5조4항 자기모순 해소) |
| 대표 약어 | `rprs_yn` 컬럼 + 67그룹 자동 시드(N=73행, 출처·빈도 신호 100% 수렴) — 보훈·중권역 2그룹 양쪽 Y 유지(사용자 결정), "대표 1개" 부분 유니크는 2그룹 결정 시까지 보류 |
| 검증 | words 3,386 / terms 13,173 / domains 126·CHAR 0 / 제약 4종 존재 — 라이브 실측 |

### ⚠ 적용 중 발견한 함정 (재사용 지식)
- **db-bridge statement_timeout=3000ms**: `ctid NOT IN (GROUP BY 서브쿼리)`는 ctid 해시 불가로 O(n²) → 타임아웃. **self-join(USING) 형태**로 교체(파일에도 반영). 복합 UNIQUE 빌드(13k행)도 3.2s로 초과 — 배치 선두에 `SET statement_timeout='60s'`를 넣으면 동일 세션에 적용됨.
- 멀티문 --raw 배치는 **암묵 단일 트랜잭션** — 중간 실패 시 전량 롤백(부분 적용 없음, 오히려 안전).

## 2. P3 잔여 (보류 — 재개 조건 명시)
- **terms→domains 정확 매핑**: 원천(행안부 공공데이터 공통표준용어) 리포·DB 부재 실측 확정. eng_name 전량=약어(원본 영문명 소실 물증). **다음 단계: 에이전트 웹 확보 시도(사용자 승인됨)** → 실패 시 사용자 제공. 확보 시 스테이징 반입→term_name 조인 백필→domain FK.
- 규칙 기반 94.2% 그룹 백필은 임시책으로 미적용(사용자 선택은 정확 복원 경로).

## 3. V2_16 — 고아 테이블·cross-type·잔재 정리 (라이브 적용·검증 완료)

| 항목 | 결과 |
|---|---|
| 고아 테이블 10 DROP | admdst_cd_rcptn_log·bbs_stats·club_info·club_user_map·dscsn_manage·indv_pg_set·leader_schdl_dtl·noti_info·role_lyr·user_mdfcn_dtls — **테이블 104→94**. 전건 0행·참조 0·인바운드 의존 0 재실측, CASCADE 미사용(안전장치), git(V2_0) 복원 가능 |
| 고아 시퀀스 | sq_ntt_id DROP (4중 실측 0 — 예외 대장 §4 이행) |
| cross-type 정렬 | dta_use_stats.pst_id bigint→varchar(20) + sys_log.prcs_tm varchar(14)→bigint(12행 무손실, 의미='처리 소요시간 ms' 동일 실측) + COMMENT 2 — noti_sn 충돌은 tb_noti_info DROP 으로 자연 해소 |
| 계약 정합 | ognz_nm SET NOT NULL + OrganizationManage nullable=false (물리·이중 엔티티 3자 일치) |

### 동반 코드
- DtaUseStats.pstId Long→String(+repo @Param) / SysLog.prcsTm String→Long — **DTO(SysLogDto)는 String 유지로 API 계약 불변**, LogManageService 경계 변환(parsePrcsTm 관대 파싱)
- MenuRepositoryImpl 루트 센티널 `eq(0L)`→`isNull()` (기존엔 영구 빈 결과였음)
- 삭제 3파일: board/TemplateRepository.java(참조 0 — ⚠ template/TemplateRepository 는 실사용 KEEP), check-db-standard.js, refactor-db-standard.js(승인분 이행)
- BoardUseRepository 死메서드 3건 제거

### 재검증의 반전 2건 (감사 판정 정정)
1. **board/Template.java 는 KEEP** — 감사의 '참조 0'은 오판: QueryDSL **QTemplate** 경유로 BoardMasterRepositoryImpl 이 실사용(엔티티명 직접 grep 만으로는 Q타입 소비를 놓침 — **Q타입까지 검사 필수** 교훈)
2. tb_indv_pg_set 은 'PK 추가'가 아니라 **DROP 이 정답** — 식별 컬럼 자체가 전무해 후보키가 없음

## 4. 검증 로그 (Stage 4)
- 라이브 실측: 상기 표 전부 기대값 일치
- `compileJava compileTestJava` exit 0 / 린터 2종(ZeroDowntime + SchemaNaming) BUILD SUCCESSFUL — V2_15·V2_16 의 DROP/ALTER TYPE 라인 예외(`-- linter:ignore (근거)`) 정상 동작
- 전체 테스트: 본 문서 커밋 시점 기준 실행 결과 참조 (아래 갱신)

### 정직 보류
- flyway history 등재는 차기 bootRun 수렴(V2_6~V2_16 pending, 전부 멱등)
- FE generated 타입의 tb_* 잔재(삭제 테이블 관련 응답 타입)는 다음 codegen 사이클에서 자연 정리

## 5. 후속 운영자 주의
- 메타 3테이블은 이제 **PK/UNIQUE 로 봉인** — V2_1 시드 재실행(fresh DB)은 V2_15 가 제약 부여 전에 정리하므로 안전. 신규 표준어 등록은 제9조 절차 + (word_name,eng_abbr) 유일성 준수.
- 삭제 10테이블 중 도메인을 재도입하려면 V2_0 정의를 참조하되 헌법·감사컬럼·FK 표준으로 재설계할 것.
