package com.company.project.service.survey.dto;

import com.company.project.domain.survey.QestnrTmplat;
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
public class QestnrTmplatDto {

    @Schema(description = "Description")
    private String qestnrTmplatId;

    @Schema(description = "Description")
    private String qestnrTmplatTy;

    @Schema(description = "Description")
    private String qestnrTmplatImagepathnm;

    @Schema(description = "Description")
    private String qestnrTmplatCn;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static QestnrTmplatDto from(QestnrTmplat entity) {
        if (entity == null) return null;
        return QestnrTmplatDto.builder()
                .qestnrTmplatId(entity.getQestnrTmplatId())
                .qestnrTmplatTy(entity.getQestnrTmplatTy())
                .qestnrTmplatImagepathnm(entity.getQestnrTmplatImagepathnm())
                .qestnrTmplatCn(entity.getQestnrTmplatCn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}