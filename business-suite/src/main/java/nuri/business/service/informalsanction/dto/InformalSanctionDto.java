package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.InformalSanction;
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
@Schema(description = "비정형 결재 DTO (표준화)")
public class InformalSanctionDto {

    @Schema(description = "비정형 결재 ID")
    private String ifmlAtrzId;

    @Schema(description = "업무 구분 코드")
    private String taskSeCd;

    @Schema(description = "업무 구분 명")
    private String taskSeNm;

    @Schema(description = "신청자 ID")
    private String aplcntId;

    @Schema(description = "신청자 명")
    private String aplcntNm;

    @Schema(description = "신청 일자")
    private String reqYmd;

    @Schema(description = "결재자 ID")
    private String aprvrId;

    @Schema(description = "결재자 명")
    private String aprvrNm;

    @Schema(description = "결재자 조직 명")
    private String aprvrOrgnztNm;

    @Schema(description = "승인 여부")
    private String aprvYn;

    @Schema(description = "결재 일시")
    private LocalDateTime atrzDt;

    @Schema(description = "반려 사유")
    private String rjctRsnCn;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    public static InformalSanctionDto from(InformalSanction entity) {
        if (entity == null)
            return null;
        return InformalSanctionDto.builder()
                .ifmlAtrzId(entity.getIfmlAtrzId())
                .taskSeCd(entity.getTaskSeCd())
                .aplcntId(entity.getAplcntId())
                .reqYmd(entity.getReqYmd())
                .aprvrId(entity.getAprvrId())
                .aprvYn(entity.getAprvYn())
                .atrzDt(entity.getAtrzDt())
                .rjctRsnCn(entity.getRjctRsnCn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}

