package com.company.project.domain.integration;

import java.util.List;

public interface IntegrationSystemRepositoryCustom {
    List<IntegrationSystem> searchSystems(String insttId);

    long countSystems(String insttId);
}
