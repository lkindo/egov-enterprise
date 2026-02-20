package com.company.project.service.ctsnn.dto;

import com.company.project.domain.ctsnn.CtsnnManage;
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
@Schema(description = "Congratulation/Condolence DTO")
public class CtsnnDto {

    @Schema(description = "ID")
    private String ctsnnId;

    @Schema(description = "User ID")
    private String usid;

    @Schema(description = "Code")
    private String ctsnnCd;

    @Schema(description = "Request Date")
    private String reqstDe;

    @Schema(description = "Name")
    private String ctsnnNm;

    @Schema(description = "Target Name")
    private String trgterNm;

    @Schema(description = "Birth Date")
    private String brth;

    @Schema(description = "Occurrence Date")
    private String occrrDe;

    @Schema(description = "Relation")
    private String relate;

    @Schema(description = "Remark")
    private String remark;

    @Schema(description = "Approver ID")
    private String sanctnerId;

    @Schema(description = "Confirmation Status")
    private String confmAt;

    @Schema(description = "Approval Date")
    private LocalDateTime sanctnDt;

    @Schema(description = "Return Reason")
    private String returnResn;

    @Schema(description = "Informal Sanction ID")
    private String infrmlSanctnId;

    @Schema(description = "Created By ID")
    private String createdBy;

    @Schema(description = "Created Date")
    private LocalDateTime createdDate;

    public static CtsnnDto from(CtsnnManage entity) {
        if (entity == null) return null;
        return CtsnnDto.builder()
                .ctsnnId(entity.getCtsnnId())
                .usid(entity.getUsid())
                .ctsnnCd(entity.getCtsnnCd())
                .reqstDe(entity.getReqstDe())
                .ctsnnNm(entity.getCtsnnNm())
                .trgterNm(entity.getTrgterNm())
                .brth(entity.getBrth())
                .occrrDe(entity.getOccrrDe())
                .relate(entity.getRelate())
                .remark(entity.getRemark())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
