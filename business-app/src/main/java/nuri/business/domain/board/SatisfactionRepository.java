package nuri.business.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SatisfactionRepository extends JpaRepository<Satisfaction, Long> {
    @Query("SELECT s FROM Satisfaction s WHERE s.pstSn = :pstSn AND s.bbsId = :bbsId AND s.useYn = :useYn")
    List<Satisfaction> findByPstSnAndBbsIdAndUseYn(@Param("pstSn") Long pstSn, @Param("bbsId") String bbsId, @Param("useYn") String useYn);

    @Query("SELECT AVG(s.dgstfnScr) FROM Satisfaction s WHERE s.pstSn = :pstSn AND s.bbsId = :bbsId AND s.useYn = 'Y'")
    Double getAverageSatisfaction(@Param("pstSn") Long pstSn, @Param("bbsId") String bbsId);

    // legacy
    default List<Satisfaction> findByArticleIdAndBoardIdAndUseAt(Long articleId, String boardId, String useAt) {
        return findByPstSnAndBbsIdAndUseYn(articleId, boardId, useAt);
    }
}
