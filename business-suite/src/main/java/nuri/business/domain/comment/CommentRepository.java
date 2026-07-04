package nuri.business.domain.comment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // ORDER BY 가 없으면 OFFSET/LIMIT 페이징이 비결정적이라 댓글이 페이지 간 중복/누락될 수 있어
    // 안정적 tiebreaker(ans_sn)로 정렬한다.
    @Query("SELECT c FROM Comment c WHERE c.bbsId = :bbsId AND c.pstId = :pstId ORDER BY c.ansSn ASC")
    Page<Comment> findByBbsIdAndPstId(@Param("bbsId") String bbsId, @Param("pstId") String pstId, Pageable pageable);

    Page<Comment> findByAnsCnContaining(String ansCn, Pageable pageable);

    @Query("SELECT COALESCE(MAX(c.ansSn), 0L) FROM Comment c")
    Long findMaxId();

    long countByBbsIdAndPstIdAndUseYn(String bbsId, String pstId, String useYn);
}
