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
@Schema(description = "경조사 정보 DTO")
public class CtsnnDto {

    @Schema(description = "경조사 ID")
    private String ctsnnId;

    @Schema(description = "사용자 ID")
    private String usid;

    @Schema(description = "경조사 코드")
    private String ctsnnCd;

    @Schema(description = "신청 일자")
    private String reqstDe;

    @Schema(description = "경조사 명")
    private String ctsnnNm;

    @Schema(description = "대상자 명")
    private String trgterNm;

    @Schema(description = "생년월일")
    private String brth;

    @Schema(description = "발생 일자")
    private String occrrDe;

    @Schema(description = "관계")
    private String relate;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "승인자 ID")
    private String sanctnerId;

    @Schema(description = "승인 여부")
    private String confmAt;

    @Schema(description = "승인 일시")
    private LocalDateTime sanctnDt;

    @Schema(description = "반려 사유")
    private String returnResn;

    @Schema(description = "내부 결재 ID")
    private String infrmlSanctnId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
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
