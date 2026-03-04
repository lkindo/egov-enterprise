package com.company.project.domain.integration;

import java.util.List;

public interface IntegrationServiceRepositoryCustom {
    List<IntegrationService> searchServices(String insttId, String sysId);

    long countServices(String insttId, String sysId);
}
