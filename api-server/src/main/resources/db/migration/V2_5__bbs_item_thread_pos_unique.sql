-- V2_5: 게시판 스레드 위치 유일성 — (bbs_id, sort_ordr, ans_sn) UNIQUE 제약
-- 근거: BoardService.createPost 는 sort_ordr = findMaxSortOrdr(bbsId)+1,
--       replyPost 는 ans_sn = findMaxAnsSn(bbsId, sortOrdr)+1 로 채번한다. 둘 다 락 없는
--       read-modify-write 라, 동일 게시판/스레드 동시 작성 시 두 트랜잭션이 같은 MAX 를 읽어
--       순번이 중복 저장되는 경합(TOCTOU)이 성립한다(무음 손상: 스레드 정렬 비결정적).
--       애플리케이션은 BoardMaster 비관적 락(findByIdWithPessimisticLock)으로 채번을
--       게시판 단위 직렬화하여 경합을 예방하고, 이 제약을 권위 있는 백스톱으로 둔다.
-- 불변식: root 글=ans_sn 1, 답글=스레드(sort_ordr) 내 MAX+1 → (bbs_id, sort_ordr, ans_sn) 는 글별 유일.
-- 자가치유: 과거 E2E 대량삽입 잔재로 (bbs_id, sort_ordr, ans_sn) 중복이 있을 수 있어(공유 개발 DB),
--          제약 추가 전 그룹당 pst_id 최소 1건만 보존하고 나머지를 제거한다. baseline 신규 DB 는 중복 0 → 삭제 0.
--          (운영 배포는 baseline + 수정된 채번 코드로 시작하므로 중복이 생기지 않는다.)
-- 멱등: 제약이 이미 있으면 전체 건너뜀 — 신규 DB / 라이브 적용된 DB 양쪽 안전.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_tb_bbs_item_thread_pos'
          AND conrelid = 'tb_bbs_item'::regclass
    ) THEN
        -- (1) 기존 중복 정리: (bbs_id, sort_ordr, ans_sn) 그룹당 pst_id 최소값 1건만 보존.
        DELETE FROM tb_bbs_item
        WHERE pst_id IN (
            SELECT pst_id FROM (
                SELECT pst_id,
                       ROW_NUMBER() OVER (PARTITION BY bbs_id, sort_ordr, ans_sn ORDER BY pst_id) AS rn
                FROM tb_bbs_item
            ) t
            WHERE t.rn > 1
        );

        -- (2) 스레드 위치 유니크 제약.
        ALTER TABLE tb_bbs_item
            ADD CONSTRAINT uk_tb_bbs_item_thread_pos UNIQUE (bbs_id, sort_ordr, ans_sn);

        -- (3) 문서화.
        COMMENT ON CONSTRAINT uk_tb_bbs_item_thread_pos ON tb_bbs_item
            IS '스레드 위치 유일성 — createPost(sort_ordr)/replyPost(ans_sn) MAX+1 채번 경합 백스톱';
    END IF;
END $$;
