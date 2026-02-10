package com.company.project.domain.integration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IntegrationSystemRepository
        extends JpaRepository<IntegrationSystem, IntegrationSystem.IntegrationSystemId> {
    List<IntegrationSystem> findByIdInsttIdAndUseAt(String insttId, String useAt);
}
