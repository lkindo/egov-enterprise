package nuri.business.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, String> {
    List<SurveyQuestion> findBySrvyIdOrderByQstnSnAsc(String srvyId);

    // [V2_13 결속] 설문 삭제 시 문항 선정리용 파생 삭제
    void deleteBySrvyId(String srvyId);
}
