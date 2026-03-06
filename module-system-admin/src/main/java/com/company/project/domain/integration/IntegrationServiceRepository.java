package com.company.project.domain.integration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IntegrationServiceRepository
        extends JpaRepository<IntegrationService, IntegrationService.IntegrationServiceId>,
        IntegrationServiceRepositoryCustom {
    List<IntegrationService> findByIdInsttIdAndUseAt(String insttId, String useAt);

    List<IntegrationService> findByIdInsttIdAndIdSysIdAndUseAt(String insttId, String sysId, String useAt);
}
