package nuri.business.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, Long> {
    List<SurveyQuestion> findBySrvySnOrderByQstnSnAsc(Long srvySn);

    boolean existsBySrvySn(Long srvySn);

    // [V2_13 결속] 설문 삭제 시 문항 선정리용 파생 삭제
    void deleteBySrvySn(Long srvySn);
}
