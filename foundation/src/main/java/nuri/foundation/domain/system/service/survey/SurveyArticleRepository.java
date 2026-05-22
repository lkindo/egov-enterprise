package nuri.foundation.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SurveyArticleRepository extends JpaRepository<SurveyArticle, String> {
    List<SurveyArticle> findBySrvyQstnIdOrderByArtclSnAsc(String srvyQstnId);
}
