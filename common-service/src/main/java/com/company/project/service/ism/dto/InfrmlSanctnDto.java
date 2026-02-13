package com.company.project.service.ism.dto;

import com.company.project.domain.notification.InfrmlSanctn;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InfrmlSanctnDto {
    private String infrmlSanctnId;
    private String jobSeCode;
    private String jobSeNm;
    private String applcntId;
    private String applcntNm;
    private String reqstDe;
    private String sanctnerId;
    private String sanctnerNm;
    private String sanctnerOrgnztNm;
    private String confmAt;
    private String confmAtNm;
    private String sanctnDt;
    private String returnResn;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static InfrmlSanctnDto from(InfrmlSanctn entity) {
        return InfrmlSanctnDto.builder()
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .jobSeCode(entity.getJobSeCode())
                .applcntId(entity.getApplcntId())
                .reqstDe(entity.getReqstDe())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
