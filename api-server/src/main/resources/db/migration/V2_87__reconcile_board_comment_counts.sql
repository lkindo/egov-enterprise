-- V2_87: 게시글 댓글 수의 historical baseline을 실제 활성 댓글 수로 정합한다.
--
-- V2_87 이전 런타임은 댓글 생성·삭제 시 tb_bbs_item.cmnt_cnt를 유지하지 않았다. 이후
-- 애플리케이션은 단건 +1/-1 delta만 원자 반영하므로, 배포 시점의 0/null/stale 값은 별도
-- baseline 없이는 영구히 남는다.
--
-- comment 쓰기 뒤 board delta를 반영하는 현재 트랜잭션 순서와 동일하게 두 테이블을 잠근다.
-- SHARE ROW EXCLUSIVE는 조회를 허용하되 INSERT/UPDATE/DELETE를 막아 count snapshot과 board
-- UPDATE 사이에 delta가 끼어드는 것을 방지한다. NOWAIT와 statement_timeout으로 운영 경합과
-- 전체 쓰기 정지 시간을 제한하며, 하나라도 실패하면 Flyway transaction 전체가 rollback된다.
--
-- Rollback: 과거의 stale 숫자는 정본이 아니므로 되돌리지 않는다. 애플리케이션은 정합 전후
-- 모두 같은 integer 컬럼을 사용하고, 문제 시 active comment count로 forward-fix한다.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

LOCK TABLE tb_bbs_comment, tb_bbs_item IN SHARE ROW EXCLUSIVE MODE NOWAIT;

DO $$
BEGIN
    -- 활성 댓글은 게시판 업무키와 게시글 기술키가 모두 같은 게시글에 귀속되어야 한다.
    -- 귀속 불명 행을 조용히 제외하면 migration은 green이어도 댓글 수가 거짓이 된다.
    IF EXISTS (
        SELECT 1
        FROM tb_bbs_comment comment
        LEFT JOIN tb_bbs_item post
          ON post.pst_sn = comment.pst_sn
         AND post.bbs_id = comment.bbs_id
        WHERE comment.use_yn = 'Y'
          AND post.pst_sn IS NULL
    ) THEN
        RAISE EXCEPTION 'active board comment has no matching (bbs_id, pst_sn) post';
    END IF;

    WITH active_comment_counts AS (
        SELECT comment.bbs_id,
               comment.pst_sn,
               count(*)::integer AS active_count
        FROM tb_bbs_comment comment
        WHERE comment.use_yn = 'Y'
        GROUP BY comment.bbs_id, comment.pst_sn
    ), reconciled AS (
        SELECT post.pst_sn,
               COALESCE(counts.active_count, 0) AS active_count
        FROM tb_bbs_item post
        LEFT JOIN active_comment_counts counts
          ON counts.pst_sn = post.pst_sn
         AND counts.bbs_id = post.bbs_id
    )
    UPDATE tb_bbs_item post
       SET cmnt_cnt = reconciled.active_count
      FROM reconciled
     WHERE post.pst_sn = reconciled.pst_sn
       AND post.cmnt_cnt IS DISTINCT FROM reconciled.active_count;

    IF EXISTS (
        WITH active_comment_counts AS (
            SELECT comment.bbs_id,
                   comment.pst_sn,
                   count(*)::integer AS active_count
            FROM tb_bbs_comment comment
            WHERE comment.use_yn = 'Y'
            GROUP BY comment.bbs_id, comment.pst_sn
        )
        SELECT 1
        FROM tb_bbs_item post
        LEFT JOIN active_comment_counts counts
          ON counts.pst_sn = post.pst_sn
         AND counts.bbs_id = post.bbs_id
        WHERE post.cmnt_cnt IS DISTINCT FROM COALESCE(counts.active_count, 0)
    ) THEN
        RAISE EXCEPTION 'board comment count reconciliation did not converge';
    END IF;
END $$;
