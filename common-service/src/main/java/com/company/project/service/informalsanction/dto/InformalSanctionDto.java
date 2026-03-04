package com.company.project.service.informalsanction.dto;

import com.company.project.domain.informalsanction.InformalSanction;
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
@Schema(description = "비정형 결재 DTO")
public class InformalSanctionDto {

    @Schema(description = "비정형 결재 ID")
    private String informalSanctionId;

    @Schema(description = "업무 구분 코드")
    private String jobSeCode;

    @Schema(description = "업무 구분 명")
    private String jobSeNm;

    @Schema(description = "신청자 ID")
    private String applicantId;

    @Schema(description = "신청자 명")
    private String applicantNm;

    @Schema(description = "신청 일자")
    private String requestDe;

    @Schema(description = "결재자 ID")
    private String sanctionerId;

    @Schema(description = "결재자 명")
    private String sanctionerNm;

    @Schema(description = "결재자 조직 명")
    private String sanctionerOrgnztNm;

    @Schema(description = "승인 여부")
    private String confmAt;

    @Schema(description = "결재 일시")
    private LocalDateTime sanctionDt;

    @Schema(description = "반려 사유")
    private String returnResn;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    public static InformalSanctionDto from(InformalSanction entity) {
        if (entity == null)
            return null;
        return InformalSanctionDto.builder()
                .informalSanctionId(entity.getInformalSanctionId())
                .jobSeCode(entity.getJobSeCode())
                .applicantId(entity.getApplicantId())
                .requestDe(entity.getRequestDe())
                .sanctionerId(entity.getSanctionerId())
                .confmAt(entity.getConfmAt())
                .sanctionDt(entity.getSanctionDt())
                .returnResn(entity.getReturnResn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
