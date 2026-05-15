package nuri.business.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SatisfactionRepository extends JpaRepository<Satisfaction, Long> {
    List<Satisfaction> findByPstIdAndBbsIdAndUseYn(Long pstId, String bbsId, String useYn);

    @Query("SELECT COALESCE(AVG(s.stsfdgLevel), 0) FROM Satisfaction s WHERE s.pstId = :pstId AND s.bbsId = :bbsId AND s.useYn = 'Y'")
    Double getAverageSatisfaction(@Param("pstId") Long pstId, @Param("bbsId") String bbsId);
}
