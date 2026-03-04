package com.company.project.domain.integration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IntegrationMessageRepository
        extends JpaRepository<IntegrationMessage, String>, IntegrationMessageRepositoryCustom {
    List<IntegrationMessage> findAllByUseAt(String useAt);
}
