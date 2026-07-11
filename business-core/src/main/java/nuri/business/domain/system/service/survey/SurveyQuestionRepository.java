package nuri.business.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, String> {
    List<SurveyQuestion> findBySrvyIdOrderByQstnSnAsc(String srvyId);
}
