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
@Schema(description = "설문템플릿 정보 DTO")
public class QestnrTmplatDto {

    @Schema(description = "템플릿 ID")
    private String qestnrTmplatId;

    @Schema(description = "템플릿 유형")
    private String qestnrTmplatTy;

    @Schema(description = "템플릿 이미지 경로")
    private String qestnrTmplatImagepathnm;

    @Schema(description = "템플릿 설명")
    private String qestnrTmplatCn;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
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
