package com.company.project.service.sanctn.dto;

import com.company.project.domain.sanctn.InformalSanctn;
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
@Schema(description = "약식결재 정보 DTO")
public class InformalSanctnDto {

    @Schema(description = "약식결재 ID")
    private String infrmlSanctnId;

    @Schema(description = "업무 구분 코드")
    private String jobSeCode;

    @Schema(description = "업무 구분 명")
    private String jobSeNm;

    @Schema(description = "신청자 ID")
    private String applcntId;

    @Schema(description = "신청자 명")
    private String applcntNm;

    @Schema(description = "신청 일자")
    private String reqstDe;

    @Schema(description = "결재자 ID")
    private String sanctnerId;

    @Schema(description = "결재자 명")
    private String sanctnerNm;

    @Schema(description = "결재자 조직 명")
    private String sanctnerOrgnztNm;

    @Schema(description = "승인 여부")
    private String confmAt;

    @Schema(description = "승인 일시")
    private LocalDateTime sanctnDt;

    @Schema(description = "반려 사유")
    private String returnResn;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static InformalSanctnDto from(InformalSanctn entity) {
        if (entity == null) return null;
        return InformalSanctnDto.builder()
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .jobSeCode(entity.getJobSeCode())
                .applcntId(entity.getApplcntId())
                .reqstDe(entity.getReqstDe())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
