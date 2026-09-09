-- 보존 결정 전의 읽기 전용 집계. 파기 대상 확정이나 삭제 승인이 아니다.
-- 제목/본문/사용자/파일 경로는 출력하지 않는다.
SELECT 'notifications_total' AS measure, count(*) AS row_count FROM tb_user_noti
UNION ALL
SELECT 'notifications_read_older_than_6_months', count(*) FROM tb_user_noti
WHERE read_yn = 'Y' AND crt_dt < current_timestamp - interval '6 months'
UNION ALL
SELECT 'notes_deleted_by_all_parties', count(*) FROM tb_note_info n
WHERE EXISTS (SELECT 1 FROM tb_note_sndng s WHERE s.note_sn = n.note_sn)
  AND EXISTS (SELECT 1 FROM tb_note_rcptn r WHERE r.note_sn = n.note_sn)
  AND NOT EXISTS (SELECT 1 FROM tb_note_sndng s WHERE s.note_sn = n.note_sn AND s.del_yn IS DISTINCT FROM 'Y')
  AND NOT EXISTS (SELECT 1 FROM tb_note_rcptn r WHERE r.note_sn = n.note_sn AND r.del_yn IS DISTINCT FROM 'Y')
UNION ALL
SELECT 'soft_deleted_posts', count(*) FROM tb_bbs_item WHERE use_yn = 'N'
UNION ALL
SELECT 'soft_deleted_posts_with_attachment_reference', count(*) FROM tb_bbs_item WHERE use_yn = 'N' AND atch_file_sn IS NOT NULL;
