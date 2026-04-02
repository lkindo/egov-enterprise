package com.company.project.foundation.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * ㅼ뵬紐Repository
 */
public interface OnlinePollItemRepository extends JpaRepository<OnlinePollItem, String> {
    List<OnlinePollItem> findByPollId(String pollId);
}
