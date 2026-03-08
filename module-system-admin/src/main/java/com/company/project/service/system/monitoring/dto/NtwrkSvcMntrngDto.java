package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.NtwrkSvcMntrng;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NtwrkSvcMntrngDto {
    private String sysIp;
    private Integer sysPort;
    private String sysNm;
    private String mntrngSttus;
    private String mntrngSttusNm;
    private String mngrNm;
    private String mngrEmailAddr;
    private LocalDateTime creatDt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static NtwrkSvcMntrngDto from(NtwrkSvcMntrng entity) {
        return NtwrkSvcMntrngDto.builder()
                .sysIp(entity.getSysIp())
                .sysPort(entity.getSysPort())
                .sysNm(entity.getSysNm())
                .mntrngSttus(entity.getMntrngSttus())
                .mngrNm(entity.getMngrNm())
                .mngrEmailAddr(entity.getMngrEmailAddr())
                .creatDt(entity.getCreatDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
