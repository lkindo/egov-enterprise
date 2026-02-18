package com.company.project.service.integration;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.integration.IntegrationInstitution;
import com.company.project.domain.integration.IntegrationInstitutionRepository;
import com.company.project.service.integration.dto.IntegrationInstitutionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * 연계 기관 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IntegrationService implements EgovIntegrationService {

    private final IntegrationInstitutionRepository institutionRepository;

    @Override
    public Page<IntegrationInstitutionDto> getInstitutionList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return institutionRepository.findAll(Objects.requireNonNull(pageable)).map(IntegrationInstitutionDto::from);
        }
        return institutionRepository.findByInsttNmContaining(keyword, Objects.requireNonNull(pageable))
                .map(IntegrationInstitutionDto::from);
    }

    @Override
    public IntegrationInstitutionDto getInstitution(String insttId) {
        IntegrationInstitution institution = institutionRepository.findById(Objects.requireNonNull(insttId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return IntegrationInstitutionDto.from(institution);
    }

    @Override
    @Transactional
    public String createInstitution(String userId, IntegrationInstitutionDto dto) {
        String insttId = "INST_" + String.format("%013d", System.currentTimeMillis());

        IntegrationInstitution institution = IntegrationInstitution.builder()
                .insttId(insttId)
                .insttNm(dto.getInsttNm())
                .frstRegisterId(userId)
                .build();

        institutionRepository.save(Objects.requireNonNull(institution));
        return insttId;
    }

    @Override
    @Transactional
    public void updateInstitution(String insttId, String userId, IntegrationInstitutionDto dto) {
        IntegrationInstitution institution = institutionRepository.findById(Objects.requireNonNull(insttId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        institution.update(dto.getInsttNm(), userId);
    }

    @Override
    @Transactional
    public void deleteInstitution(String insttId) {
        IntegrationInstitution institution = institutionRepository.findById(Objects.requireNonNull(insttId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        institutionRepository.delete(Objects.requireNonNull(institution));
    }
}
