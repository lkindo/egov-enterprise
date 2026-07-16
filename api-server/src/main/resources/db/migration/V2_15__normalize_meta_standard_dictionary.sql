-- =====================================================================
-- V2_15: SSOT 메타 표준사전 정규화 (P3) — 중복 제거·무결성 제약·CHAR 정정·대표약어
-- =====================================================================
-- 근거: docs/02-architecture/db-standardization-assessment.md §3 (SSOT 구조 결손 HIGH)
--   + 2026-07-17 P3 사전 조사(4개 병렬, 전 수치 실측). 사용자 승인: 전체 적용(2026-07-17).
-- 헌법 정합: 제3조 2항의 "메타 테이블 감사 제외"는 명명 감사 제외이지 무결성 방치가 아님(감사 견해).
--   제5조 4항은 "도메인 가이드"의 char 전면 금지를 명문으로 규정 — §3 정정의 직접 근거.
-- 백업: 삭제·변경 전 전량 JSON 덤프(words 1·terms 3·domains CHAR 38행) — 태스크 기록 참조.
-- 멱등: 전 구문 재실행 안전. fresh DB 재현성: V2_1 시드(무수정 존치)가 중복을 재생성해도
--   본 파일이 제약 부여 전에 정리하므로 최종 상태 동일 (V2_1은 baseline 2.1 라이브에서 영구 스킵).

-- ---------------------------------------------------------------
-- 1) 완전중복 제거
-- ---------------------------------------------------------------
-- 1-1) words: '실효'/ACEF 이중 INSERT 1행 (그룹당 최소 ctid 보존)
--      ⚠ ctid NOT IN (GROUP BY 서브쿼리) 형태는 ctid 가 해시 불가라 O(n²) 플랜으로 타임아웃 —
--      self-join(USING) 형태가 해시 조인으로 즉시 완료 (2026-07-17 실측 교훈)
DELETE FROM meta_standard_words a
 USING meta_standard_words b
 WHERE a.ctid > b.ctid
   AND a.word_name = b.word_name
   AND a.eng_abbr = b.eng_abbr
   AND a.word_dc IS NOT DISTINCT FROM b.word_dc;

-- 1-2) terms: 후행 추가 완전중복 3행 (본체 최소 id 보존 — 명시 화이트리스트로
--      이중표준 5그룹[중권역명·측정지점명 등 합법 동음이의] 오폭을 원천 차단)
DELETE FROM meta_standard_terms t
 USING meta_standard_terms keep
 WHERE (t.term_name, t.eng_abbr) IN (VALUES ('상호', 'CONM'), ('납세자명', 'TXPR_NM'), ('사업자명', 'BZMN_NM'))
   AND keep.term_name = t.term_name
   AND keep.eng_abbr = t.eng_abbr
   AND keep.id < t.id;

-- ---------------------------------------------------------------
-- 2) 무결성 제약 — SSOT 가 스스로 무결성을 보장하도록 봉인 (1) 이후 충돌 0 실측)
-- ---------------------------------------------------------------
ALTER TABLE meta_standard_words ALTER COLUMN word_name SET NOT NULL;
ALTER TABLE meta_standard_words ALTER COLUMN eng_abbr SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pk_meta_standard_words') THEN
    ALTER TABLE meta_standard_words ADD CONSTRAINT pk_meta_standard_words PRIMARY KEY (word_name, eng_abbr);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_meta_standard_terms_term_abbr') THEN
    ALTER TABLE meta_standard_terms ADD CONSTRAINT uk_meta_standard_terms_term_abbr UNIQUE (term_name, eng_abbr);
  END IF;
  -- eng_abbr 는 물리 컬럼명의 SSOT — 단독 UNIQUE 가 최고 가치 (충돌 0 실측)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_meta_standard_terms_eng_abbr') THEN
    ALTER TABLE meta_standard_terms ADD CONSTRAINT uk_meta_standard_terms_eng_abbr UNIQUE (eng_abbr);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 3) 도메인 가이드 CHAR 정정 (헌법 제5조 4항 자기모순 해소)
-- ---------------------------------------------------------------
-- 3-1) CHAR/VARCHAR 이중 등재 3그룹(번호C9/C13/C24): CHAR 행 삭제 — VARCHAR 행이 물리 실태
--      (public 스키마 char 컬럼 0건 실측)와 부합
DELETE FROM meta_standard_domains c
 WHERE upper(c.data_type) = 'CHAR'
   AND EXISTS (SELECT 1 FROM meta_standard_domains v
                WHERE v.domain_name = c.domain_name
                  AND upper(v.data_type) = 'VARCHAR');

-- 3-2) 잔여 CHAR 단독 35행: VARCHAR 일괄 전환 (data_length 불변).
--      domain_name 의 'C' 접미(예: 여부C1)는 원 표준 표기 유래로 존치 — 헌법 예시도 개명을 요구하지 않음
UPDATE meta_standard_domains
   SET data_type = 'VARCHAR'
 WHERE upper(data_type) = 'CHAR';

-- 3-3) 정정 후 domain_name 유일성 봉인 (잔여 중복 0 실측)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_meta_standard_domains_domain_name') THEN
    ALTER TABLE meta_standard_domains ADD CONSTRAINT uk_meta_standard_domains_domain_name UNIQUE (domain_name);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 4) 대표 약어 플래그 (다중 약어 69그룹 결정성 확보 — 헌법 제5조 1~2단계)
-- ---------------------------------------------------------------
-- '대표여부' 표준 용어 = RPRS_YN (여부 도메인 VARCHAR(1), 제5조 4항)
ALTER TABLE meta_standard_words ADD COLUMN IF NOT EXISTS rprs_yn varchar(1) NOT NULL DEFAULT 'Y';

-- 67그룹 자동 시드: 출처 마커(word_dc='신규등록' = 프로젝트 후행 추가)와 사용 빈도(terms/물리컬럼)
-- 신호가 100% 수렴함을 실측 확인 — 다중 약어 그룹에서 신규등록 행만 비대표(N) 처리.
-- 보훈(PV/RWDPTR)·중권역(MSIRB/SBSN) 2그룹은 원 표준 약어 2개 병존이라 양쪽 Y 유지(사용자 결정,
-- 2026-07-17) — 따라서 "대표 1개" 부분 유니크 인덱스는 2그룹 결정 시까지 보류.
UPDATE meta_standard_words w
   SET rprs_yn = 'N'
 WHERE w.word_dc = '신규등록'
   AND EXISTS (SELECT 1 FROM meta_standard_words o
                WHERE o.word_name = w.word_name
                  AND o.eng_abbr <> w.eng_abbr
                  AND o.word_dc <> '신규등록');

-- 검증(참고): 적용 후 기대 — words 3,386행(PK 존재, rprs_yn N=다중그룹 신규등록 행수),
--   terms 13,173행(UNIQUE 2종), domains 126행(CHAR 0, domain_name UNIQUE)
