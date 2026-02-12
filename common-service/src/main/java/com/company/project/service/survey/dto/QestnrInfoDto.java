package com.company.project.service.survey.dto;

import com.company.project.domain.survey.QestnrInfo;
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
@Schema(description = "설문 정보 DTO")
public class QestnrInfoDto {

    @Schema(description = "설문 ID")
    private String qestnrId;

    @Schema(description = "설문 제목")
    private String qestnrSj;

    @Schema(description = "설문 목적")
    private String qestnrPurps;

    @Schema(description = "설문 작성 안내 내용")
    private String qestnrWritngGuidanceCn;

    @Schema(description = "설문 시작일")
    private String qestnrBeginDe;

    @Schema(description = "설문 종료일")
    private String qestnrEndDe;

    @Schema(description = "설문 대상")
    private String qestnrTrget;

    @Schema(description = "설문 템플릿 ID")
    private String qestnrTmplatId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QestnrInfoDto from(QestnrInfo entity) {
        if (entity == null) return null;
        return QestnrInfoDto.builder()
                .qestnrId(entity.getQestnrId())
                .qestnrSj(entity.getQestnrSj())
                .qestnrPurps(entity.getQestnrPurps())
                .qestnrWritngGuidanceCn(entity.getQestnrWritngGuidanceCn())
                .qestnrBeginDe(entity.getQestnrBeginDe())
                .qestnrEndDe(entity.getQestnrEndDe())
                .qestnrTrget(entity.getQestnrTrget())
                .qestnrTmplatId(entity.getQestnrTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
