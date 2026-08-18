-- V2_39: meta_standard_words.rprs_yn 에 누락된 _yn CHECK 을 채운다
--
-- [발견 경위] A-4(실 PG 쓰기 스모크) 신설 중 `WriteSmokeIntegrationTest` 의 판정축 ③
--   "모든 _yn 컬럼에 CHECK 이 있다" 를 라이브 스키마에 대조하다 나왔다.
--   실측(2026-08-04): _yn 컬럼 61개 중 CHECK 이 없는 것은 2개뿐이다.
--     · tb_menu_info.route_mdfcn_yn — 값이 '2' 로 저장되는 **오명명**(불리언이 아님).
--       V2_24 가 의도적으로 제외했고, 컬럼 rename/용도 재정의는 pending-decisions.md §3-B 의 미결 결정이다.
--     · meta_standard_words.rprs_yn — **이건 진짜 불리언이다**(라이브 DISTINCT = {'Y','N'}).
--       V2_24 가 tb_ 접두 테이블만 훑어서 meta_ 테이블이 통째로 빠진 것이다.
--
-- [왜 예외 목록이 아니라 마이그레이션인가] 게이트를 그린으로 만드는 값싼 길은 이 컬럼을 스모크의
--   예외 목록에 적는 것이다. 그건 위반을 고치는 게 아니라 신호를 지우는 것이다(AGENTS.md Evidence guardrails H2).
--   값이 실제로 Y/N 이므로 제약을 채우는 쪽이 옳고, 그러면 예외 목록은 오명명 1건만 남는다.
--
-- [안전] 라이브 실측 DISTINCT rprs_yn = {'Y','N'} 이라 기존 행이 제약을 위반하지 않는다.
--   CHECK 은 NULL 을 통과시키므로 NULL 행이 있어도 안전하다.
-- [무중단] ADD CONSTRAINT CHECK 는 ZeroDowntimeMigrationLinterTest 비대상이며, 대상 테이블이
--   소규모(표준단어 사전)라 검증 lock 은 무시 가능하다. additive·롤포워드 안전.
-- [멱등] 제약 존재 여부를 먼저 확인한다 — 재적용·기적용 DB 양쪽 안전.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'ck_meta_standard_words_rprs_yn'
    ) THEN
        EXECUTE 'ALTER TABLE meta_standard_words '
             || 'ADD CONSTRAINT ck_meta_standard_words_rprs_yn CHECK (rprs_yn IN (''Y'',''N''))';
    END IF;
END $$;
