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

    /** 한 사람(작성자 loginId)이 한 글에 남긴 평가 — 1인 1건이라 많아야 하나다(uk_tb_dgstfn_info_pst_rgtr). */
    java.util.Optional<Satisfaction> findByBbsIdAndPstSnAndFrstRgtrId(String bbsId, Long pstSn, String frstRgtrId);

    @Query("SELECT AVG(s.dgstfnScr) FROM Satisfaction s WHERE s.pstSn = :pstSn AND s.bbsId = :bbsId AND s.useYn = 'Y'")
    Double getAverageSatisfaction(@Param("pstSn") Long pstSn, @Param("bbsId") String bbsId);

    // legacy
    default List<Satisfaction> findByArticleIdAndBoardIdAndUseAt(Long articleId, String boardId, String useAt) {
        return findByPstSnAndBbsIdAndUseYn(articleId, boardId, useAt);
    }
}
