-- V2_143: 콘텐츠 페이지 게시본 파기 경로(ADR-0042, 2026-10-26 사용자 승인 — 게시본 삭제 금지 트리거에 파기 트랜잭션 예외).
--
-- V2_137 의 fn_cms_rvsn_chg_prhb 는 게시 리비전·리비전 첨부의 수정과 삭제를 모두 거부한다. 개인정보를 잘못 게시한 사고에서는 게시를
-- 중지해도 그 게시본과 이미지가 관리 조회 권한자에게 남고 DB 에서도 지울 수 없었다. 이 마이그레이션은 삭제에만 좁은 예외를 둔다:
-- 같은 트랜잭션에서 set_config('nuri.cms_purge', 'on', true)(= SET LOCAL)로 파기를 표시한 동안만 삭제를 받는다. 표시는 트랜잭션이
-- 끝나면 풀린다. 앱은 파기 권한(CMS_PURGE)과 처리 근거 번호를 확인한 서비스 한 곳에서만 이 표시를 켠다.
--
-- 수정(UPDATE)은 예외 없이 계속 거부한다 — 게시본의 내용을 바꿔 다른 것처럼 보이게 하는 길은 열지 않는다.
--
-- 표준: 새 표·컬럼·시퀀스가 없다. 함수 본문만 바꾼다(CREATE OR REPLACE — 트리거 두 개는 같은 함수를 그대로 가리킨다).
-- 무중단: 함수 교체는 즉시 적용되는 Expand 다. 예전 앱은 이 표시를 켜지 않으므로 동작이 같다. 되돌리기는 V2_137 의 함수 본문을 다시
--   적용하면 된다(데이터 변경 없음).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION fn_cms_rvsn_chg_prhb() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('nuri.cms_purge', true) = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'CMS published revision is append-only: % on %', TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
END $$;

COMMENT ON FUNCTION fn_cms_rvsn_chg_prhb() IS '콘텐츠 게시 리비전·리비전 첨부의 수정 금지, 삭제는 파기 트랜잭션(nuri.cms_purge=on)에서만 허용 (ADR-0039, ADR-0042)';
