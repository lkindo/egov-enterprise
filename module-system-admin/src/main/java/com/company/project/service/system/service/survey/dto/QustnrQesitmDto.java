package com.company.project.service.system.service.survey.dto;

import com.company.project.domain.system.service.survey.QustnrQesitm;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class QustnrQesitmDto {

    @Schema(description = "Description")
    private String qestnrQesitmId;

    @Schema(description = "Description")
    private String qestnrId;

    @Schema(description = "Description")
    private Long qestnSn;

    @Schema(description = "Description")
    private String qestnTyCode;

    @Schema(description = "Description")
    private String qestnCn;

    @Schema(description = "Description")
    private Integer mxmmChoiseCo;

    @Schema(description = "Description")
    private String qestnrTmplatId;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    @Schema(description = "Description")
    private List<QustnrIemDto> items;

    public static QustnrQesitmDto from(QustnrQesitm entity) {
        if (entity == null) return null;
        return QustnrQesitmDto.builder()
                .qestnrQesitmId(entity.getQestnrQesitmId())
                .qestnrId(entity.getQestnrId())
                .qestnSn(entity.getQestnSn())
                .qestnTyCode(entity.getQestnTyCode())
                .qestnCn(entity.getQestnCn())
                .mxmmChoiseCo(entity.getMxmmChoiseCo())
                .qestnrTmplatId(entity.getQestnrTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
