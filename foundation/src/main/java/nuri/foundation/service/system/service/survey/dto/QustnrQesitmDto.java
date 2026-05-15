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
    private String srvyQitemId;

    @Schema(description = "설문아이디")
    private String srvyId;

    @Schema(description = "질문순번")
    private Long srvyQitemSn;

    @Schema(description = "질문유형코드")
    private String srvyQitemTypeCd;

    @Schema(description = "질문내용")
    private String srvyQitemCn;

    @Schema(description = "최대선택수")
    private Integer maxChcCnt;

    @Schema(description = "설문템플릿아이디")
    private String srvyTmplatId;

    @Schema(description = "등록자")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    @Schema(description = "설문항목목록")
    private List<QustnrIemDto> items;

    public static QustnrQesitmDto from(QustnrQesitm entity) {
        if (entity == null) return null;
        return QustnrQesitmDto.builder()
                .srvyQitemId(entity.getSrvyQitemId())
                .srvyId(entity.getSrvyId())
                .srvyQitemSn(entity.getSrvyQitemSn())
                .srvyQitemTypeCd(entity.getSrvyQitemTypeCd())
                .srvyQitemCn(entity.getSrvyQitemCn())
                .maxChcCnt(entity.getMaxChcCnt())
                .srvyTmplatId(entity.getSrvyTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
