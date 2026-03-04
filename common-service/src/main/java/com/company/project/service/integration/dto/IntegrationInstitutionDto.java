package com.company.project.service.integration.dto;

import com.company.project.domain.integration.IntegrationInstitution;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * ?곌?湲곌? DTO
 */
@Getter
@Builder
public class IntegrationInstitutionDto {
    private String insttId;
    private String insttNm;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static IntegrationInstitutionDto from(IntegrationInstitution entity) {
        return IntegrationInstitutionDto.builder()
                .insttId(entity.getInsttId())
                .insttNm(entity.getInsttNm())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegistPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
