package nuri.business.domain.comment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("SELECT c FROM Comment c WHERE c.bbsId = :bbsId AND c.pstId = :pstId")
    Page<Comment> findByBbsIdAndPstId(@Param("bbsId") String bbsId, @Param("pstId") Long pstId, Pageable pageable);

    Page<Comment> findByCmntCnContaining(String cmntCn, Pageable pageable);

    @Query("SELECT COALESCE(MAX(c.id), 0) FROM Comment c")
    Long findMaxId();

    long countByBbsIdAndPstIdAndUseYn(String bbsId, Long pstId, String useYn);
}
