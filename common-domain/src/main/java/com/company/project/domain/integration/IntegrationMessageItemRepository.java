package com.company.project.domain.integration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IntegrationMessageItemRepository
        extends JpaRepository<IntegrationMessageItem, IntegrationMessageItem.IntegrationMessageItemId>,
        IntegrationMessageItemRepositoryCustom {
    List<IntegrationMessageItem> findByIdCntcMessageIdAndUseAt(String cntcMessageId, String useAt);
}
