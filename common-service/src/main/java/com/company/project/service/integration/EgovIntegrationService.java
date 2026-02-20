package com.company.project.service.integration;

import com.company.project.service.integration.dto.IntegrationInstitutionDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ?곌퀎 湲곌? ?쒕퉬???명꽣?섏씠??
 */
public interface EgovIntegrationService {

    Page<IntegrationInstitutionDto> getInstitutionList(String keyword, Pageable pageable);

    IntegrationInstitutionDto getInstitution(String insttId);

    String createInstitution(String userId, IntegrationInstitutionDto dto);

    void updateInstitution(String insttId, String userId, IntegrationInstitutionDto dto);

    void deleteInstitution(String insttId);
}
