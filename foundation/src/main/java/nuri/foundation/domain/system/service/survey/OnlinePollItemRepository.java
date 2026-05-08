package nuri.foundation.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * 온라인 설문 항목 Repository
 */
public interface OnlinePollItemRepository extends JpaRepository<OnlinePollItem, String> {
    List<OnlinePollItem> findByPollManagePollId(String pollId);
}
