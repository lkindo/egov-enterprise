package com.company.project.service.survey.dto;

import com.company.project.domain.survey.QustnrQesitm;
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
@Schema(description = "설문 문항 정보 DTO")
public class QustnrQesitmDto {

    @Schema(description = "문항 ID")
    private String qestnrQesitmId;

    @Schema(description = "설문 ID")
    private String qestnrId;

    @Schema(description = "질문 순번")
    private Long qestnSn;

    @Schema(description = "질문 유형 코드")
    private String qestnTyCode;

    @Schema(description = "질문 내용")
    private String qestnCn;

    @Schema(description = "최대 선택 수")
    private Integer mxmmChoiseCo;

    @Schema(description = "템플릿 ID")
    private String qestnrTmplatId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    @Schema(description = "설문 항목 목록")
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
