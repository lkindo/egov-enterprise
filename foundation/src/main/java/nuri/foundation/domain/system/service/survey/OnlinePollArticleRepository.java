package nuri.foundation.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * 온라인 설문 항목 Repository (표준화)
 */
public interface OnlinePollArticleRepository extends JpaRepository<OnlinePollArticle, String> {
    List<OnlinePollArticle> findByPollManagePollId(String pollId);
}
