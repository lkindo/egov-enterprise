package com.company.project.service.integration;

import com.company.project.service.integration.dto.IntegrationInstitutionDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 연계 기관 서비스 인터페이스
 */
public interface EgovIntegrationService {

    Page<IntegrationInstitutionDto> getInstitutionList(String keyword, Pageable pageable);

    IntegrationInstitutionDto getInstitution(String insttId);

    String createInstitution(String userId, IntegrationInstitutionDto dto);

    void updateInstitution(String insttId, String userId, IntegrationInstitutionDto dto);

    void deleteInstitution(String insttId);
}
