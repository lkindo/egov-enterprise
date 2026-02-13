package com.company.project.service.system.dto;

import com.company.project.domain.system.CtsnnManage;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CtsnnManageDto {
    private String ctsnnId;
    private String usid;
    private String ctsnnCd;
    private String reqstDe;
    private String ctsnnNm;
    private String trgterNm;
    private String brth;
    private String occrrDe;
    private String relate;
    private String remark;
    private String sanctnerId;
    private String confmAt;
    private String sanctnDt;
    private String returnResn;
    private String infrmlSanctnId;
    private String createdBy;
    private LocalDateTime createdDate;

    public static CtsnnManageDto from(CtsnnManage entity) {
        return CtsnnManageDto.builder()
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
