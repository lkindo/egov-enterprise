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
@Schema(description = "Description")
public class InformalSanctnDto {

    @Schema(description = "Description")
    private String infrmlSanctnId;

    @Schema(description = "Description")
    private String jobSeCode;

    @Schema(description = "Description")
    private String jobSeNm;

    @Schema(description = "Description")
    private String applcntId;

    @Schema(description = "Description")
    private String applcntNm;

    @Schema(description = "Description")
    private String reqstDe;

    @Schema(description = "Description")
    private String sanctnerId;

    @Schema(description = "Description")
    private String sanctnerNm;

    @Schema(description = "Description")
    private String sanctnerOrgnztNm;

    @Schema(description = "Description")
    private String confmAt;

    @Schema(description = "Description")
    private LocalDateTime sanctnDt;

    @Schema(description = "Description")
    private String returnResn;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
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
