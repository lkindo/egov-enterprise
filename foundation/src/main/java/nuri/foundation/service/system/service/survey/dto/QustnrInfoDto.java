package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.QustnrInfo;
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
@Schema(description = "설문정보 DTO")
public class QustnrInfoDto {

    @Schema(description = "설문아이디")
    private String srvyId;

    @Schema(description = "설문제목")
    private String srvyTtl;

    @Schema(description = "설문목적")
    private String srvyPrpsCn;

    @Schema(description = "설문작성안내내용")
    private String srvyGuidCn;

    @Schema(description = "설문시작일자")
    private String srvyBgngYmd;

    @Schema(description = "설문종료일자")
    private String srvyEndYmd;

    @Schema(description = "설문대상")
    private String srvyTrgtCn;

    @Schema(description = "설문템플릿아이디")
    private String srvyTmplatId;

    @Schema(description = "등록자")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static QustnrInfoDto from(QustnrInfo entity) {
        if (entity == null)
            return null;
        return QustnrInfoDto.builder()
                .srvyId(entity.getSrvyId())
                .srvyTtl(entity.getSrvyTtl())
                .srvyPrpsCn(entity.getSrvyPrpsCn())
                .srvyGuidCn(entity.getSrvyGuidCn())
                .srvyBgngYmd(entity.getSrvyBgngYmd())
                .srvyEndYmd(entity.getSrvyEndYmd())
                .srvyTrgtCn(entity.getSrvyTrgtCn())
                .srvyTmplatId(entity.getSrvyTmplatId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
