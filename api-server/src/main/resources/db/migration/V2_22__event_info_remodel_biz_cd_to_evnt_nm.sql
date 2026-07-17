-- V2_22: tb_event_info 코드컬럼 오용 정화 — biz_cd(사업코드)에 행사명칭을 저장하던 것을 evnt_nm 으로 재모델링 (biz_cd A)
-- 근거(실측): biz_cd 실데이터 0행(비NULL 83행 전량 'E2E Event %' 가비지), SSOT 에 BIZ_CD 용어 0건 vs
--   행사명 EVNT_NM(명V200) 표준 존재 → 명칭 컬럼 전환이 유일한 무승인 헌법 정합 경로(제9조).
-- Expand-Sync-Contract. 멱등 3경로: fresh(V1/V2_0 이 biz_cd 생성→정상 이관), 재생/재실행(IF NOT EXISTS·DO 가드·IF EXISTS).

-- [Expand] 신규 명칭 컬럼 (명시적 NULL 키워드 금지 — 'IF NOT EXISTS'의 NOT 과 결합 시 ZeroDowntime 린터 오탐)
ALTER TABLE tb_event_info ADD COLUMN IF NOT EXISTS evnt_nm varchar(200);
COMMENT ON COLUMN tb_event_info.evnt_nm IS '행사명 (evnt_nm)';

-- [Sync] biz_cd 잔존 시에만 이관(재실행/재생 경로 안전 — DROP 후엔 no-op)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tb_event_info' AND column_name = 'biz_cd') THEN
        EXECUTE 'UPDATE tb_event_info SET evnt_nm = biz_cd WHERE evnt_nm IS NULL AND biz_cd IS NOT NULL';
    END IF;
END $$;

-- [Contract] 오용 컬럼 제거
ALTER TABLE tb_event_info DROP COLUMN IF EXISTS biz_cd; -- linter:ignore (실측: 실운영 0행·비NULL 83행 전량 E2E 가비지, 동일 릴리스 BE/FE 참조 전량 제거)
