-- V2_9: tb_onln_poll_rslt FK 2건 VALIDATED 승격 (자가치유 orphan 정리 후) — 연결부 완결
-- 배경: V2_6 은 tb_onln_poll_rslt 의 poll_id/poll_artcl_id FK 를 NOT VALID 로 추가했다(당시 라이브 DB 실측 결과
--       부모 여론조사가 삭제된 고아행 316건이 있어 즉시 VALIDATE 가 불가했기 때문). 고아행은 FK 관점에서 무효
--       데이터이므로, V2_4/V2_5 의 자가치유(self-healing) 선례와 동일하게 정리 후 제약을 검증 상태로 승격한다.
-- 방식(무중단, DB 헌법 제7조):
--   (1) 고아행 정리 — poll_id 가 tb_onln_poll_manage 에, 또는 poll_artcl_id 가 tb_onln_poll_artcl 에 없는 행 삭제.
--       fresh/정상 DB 는 고아 0 → 0건 삭제(멱등). (OCI 는 2026-07-16 선적용으로 이미 0건.)
--   (2) VALIDATE CONSTRAINT — 기존 행 소급 검증. 이미 validated 이면 no-op, 제약 부재 시 건너뜀(멱등).
--       VALIDATE 는 SHARE UPDATE EXCLUSIVE 락으로 읽기/쓰기 비차단.
-- 주의: 고아행 삭제는 '부모 없는 자식 = 무효 데이터' 정리이며, V2_4/V2_5 와 동일한 자가치유 정책을 따른다.

DELETE FROM tb_onln_poll_rslt AS r
 WHERE (r.poll_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM tb_onln_poll_manage m WHERE m.poll_id = r.poll_id))
    OR (r.poll_artcl_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM tb_onln_poll_artcl a WHERE a.poll_artcl_id = r.poll_artcl_id));

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint
               WHERE conname = 'fk_tb_onln_poll_rslt_tb_onln_poll_manage' AND NOT convalidated) THEN
        ALTER TABLE public.tb_onln_poll_rslt VALIDATE CONSTRAINT fk_tb_onln_poll_rslt_tb_onln_poll_manage;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint
               WHERE conname = 'fk_tb_onln_poll_rslt_tb_onln_poll_artcl' AND NOT convalidated) THEN
        ALTER TABLE public.tb_onln_poll_rslt VALIDATE CONSTRAINT fk_tb_onln_poll_rslt_tb_onln_poll_artcl;
    END IF;
END $$;
