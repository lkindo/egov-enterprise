package com.company.project.service.ctsnn.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CtsnnDto {
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
    private LocalDateTime sanctnDt;
    private String returnResn;
    private String infrmlSanctnId;
}
