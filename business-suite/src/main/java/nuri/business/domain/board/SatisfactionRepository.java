package nuri.business.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SatisfactionRepository extends JpaRepository<Satisfaction, Long> {
    @Query("SELECT s FROM Satisfaction s WHERE s.nttId = :pstId AND s.bbsId = :bbsId AND s.useYn = :useYn")
    List<Satisfaction> findByPstIdAndBbsIdAndUseYn(@Param("pstId") String pstId, @Param("bbsId") String bbsId, @Param("useYn") String useYn);

    @Query("SELECT AVG(s.dgstfnScr) FROM Satisfaction s WHERE s.nttId = :pstId AND s.bbsId = :bbsId AND s.useYn = 'Y'")
    Double getAverageSatisfaction(@Param("pstId") String pstId, @Param("bbsId") String bbsId);

    // legacy
    default List<Satisfaction> findByArticleIdAndBoardIdAndUseAt(String articleId, String boardId, String useAt) {
        return findByPstIdAndBbsIdAndUseYn(articleId, boardId, useAt);
    }
}
