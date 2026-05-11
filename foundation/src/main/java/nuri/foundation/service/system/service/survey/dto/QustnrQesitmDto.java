package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.QustnrQesitm;
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
@Schema(description = "설문문항 DTO")
public class QustnrQesitmDto {

    @Schema(description = "설문문항아이디")
    private String qustnrQesitmId;

    @Schema(description = "설문아이디")
    private String qustnrId;

    @Schema(description = "질문순번")
    private Long qestnSn;

    @Schema(description = "질문유형코드")
    private String qestnTyCode;

    @Schema(description = "질문내용")
    private String qestnCn;

    @Schema(description = "최대선택수")
    private Integer mxmmChoiseCo;

    @Schema(description = "설문템플릿아이디")
    private String qustnrTmplatId;

    @Schema(description = "등록자")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    @Schema(description = "설문항목목록")
    private List<QustnrIemDto> items;

    public static QustnrQesitmDto from(QustnrQesitm entity) {
        if (entity == null) return null;
        return QustnrQesitmDto.builder()
                .qustnrQesitmId(entity.getQustnrQesitmId())
                .qustnrId(entity.getQustnrId())
                .qestnSn(entity.getQestnSn())
                .qestnTyCode(entity.getQestnTyCode())
                .qestnCn(entity.getQestnCn())
                .mxmmChoiseCo(entity.getMxmmChoiseCo())
                .qustnrTmplatId(entity.getQustnrTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
