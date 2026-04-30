package nuri.foundation.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * ㅼ뵬紐Repository
 */
public interface OnlinePollItemRepository extends JpaRepository<OnlinePollItem, String> {
    List<OnlinePollItem> findByPollManagePollId(String pollId);
}
