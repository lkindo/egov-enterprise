package com.company.project.service.event.dto;

import com.company.project.domain.event.ExternalHr;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class ExternalHrDto {

    @Schema(description = "Description")
    private String extrlHrId;

    @Schema(description = "Description")
    private String eventId;

    @Schema(description = "Description")
    private String extrlHrNm;

    @Schema(description = "Description")
    private String sexdstnCode;

    @Schema(description = "Description")
    private String sexdstnCodeNm;

    @Schema(description = "Description")
    private String areaNo;

    @Schema(description = "Description")
    private String middleTelno;

    @Schema(description = "Description")
    private String endTelno;

    @Schema(description = "Description")
    private String emailAdres;

    @Schema(description = "Description")
    private String occpTyCode;

    @Schema(description = "Description")
    private String occpTyCodeNm;

    @Schema(description = "Description")
    private String brth;

    @Schema(description = "Description")
    private String psitnInsttNm;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static ExternalHrDto from(ExternalHr entity) {
        if (entity == null) return null;
        return ExternalHrDto.builder()
                .extrlHrId(entity.getExtrlHrId())
                .eventId(entity.getEventId())
                .extrlHrNm(entity.getExtrlHrNm())
                .sexdstnCode(entity.getSexdstnCode())
                .areaNo(entity.getAreaNo())
                .middleTelno(entity.getMiddleTelno())
                .endTelno(entity.getEndTelno())
                .emailAdres(entity.getEmailAdres())
                .occpTyCode(entity.getOccpTyCode())
                .brth(entity.getBrth())
                .psitnInsttNm(entity.getPsitnInsttNm())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
