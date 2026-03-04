package com.company.project.domain.integration;

import java.util.List;

public interface IntegrationInstitutionRepositoryCustom {
    List<IntegrationInstitution> searchInstitutions(String searchKeyword);

    long countInstitutions(String searchKeyword);
}