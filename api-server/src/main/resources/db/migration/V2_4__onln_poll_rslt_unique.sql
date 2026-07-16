-- V2_4: 온라인 여론조사 이중투표(중복 참여) 방지 — (poll_id, frst_rgtr_id) 유니크 제약
-- 근거: OnlinePollService.vote() 는 count(중복검사) 후 insert 하는 check-then-insert 구조라
--       동시 요청 2건이 모두 count=0 을 관측하고 각자 insert → 이중투표(ballot-stuffing) 경합(TOCTOU)이 성립한다.
--       애플리케이션 검사는 경합을 막지 못하므로, DB 유니크 제약을 권위 있는 원자적 백스톱으로 둔다.
-- 식별자 규약: 투표자는 감사 컬럼 frst_rgtr_id(=loginId, LoginUserAuditorAware 가 기록)로 식별한다.
--            제약 대상 (poll_id, frst_rgtr_id) = "한 설문당 사용자 1표" (기존 vote() 의도와 동일).
-- 자가치유: 수정 대상 버그가 실제로 중복행을 만들었으므로, 이 버그를 겪은 DB 는 기존 중복이 있을 수 있다.
--          그대로 ADD CONSTRAINT 하면 실패→Flyway/부팅 차단되므로, 제약 추가 전 (poll_id, frst_rgtr_id)
--          그룹당 poll_rslt_id 최소 1건만 남기고 나머지 중복 투표를 제거한다(공유 OCI DB 는 중복 0 → 0건 삭제).
-- 멱등: 제약이 이미 있으면(재적용) 전체를 건너뛴다 — 신규 DB / 기 적용 DB 양쪽 안전.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_tb_onln_poll_rslt_poll_voter'
          AND conrelid = 'tb_onln_poll_rslt'::regclass
    ) THEN
        -- (1) 기존 중복 투표 정리: 그룹당 가장 작은 poll_rslt_id 1건만 보존.
        DELETE FROM tb_onln_poll_rslt a
        USING tb_onln_poll_rslt b
        WHERE a.poll_id = b.poll_id
          AND a.frst_rgtr_id = b.frst_rgtr_id
          AND a.poll_rslt_id > b.poll_rslt_id;

        -- (2) 유니크 제약 추가.
        ALTER TABLE tb_onln_poll_rslt
            ADD CONSTRAINT uk_tb_onln_poll_rslt_poll_voter UNIQUE (poll_id, frst_rgtr_id);

        -- (3) 문서화(제약이 방금 생성되어 항상 존재하는 시점).
        COMMENT ON CONSTRAINT uk_tb_onln_poll_rslt_poll_voter ON tb_onln_poll_rslt
            IS '이중투표 방지 — 한 설문(poll_id)당 한 투표자(frst_rgtr_id=loginId) 1표';
    END IF;
END $$;
