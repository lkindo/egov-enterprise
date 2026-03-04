package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.NtwrkSvcMntrngLog;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NtwrkSvcMntrngLogDto {
    private String logId;
    private String sysIp;
    private Integer sysPort;
    private String sysNm;
    private String mntrngSttus;
    private String mntrngSttusNm;
    private String logInfo;
    private LocalDateTime creatDt;
    private String frstRegisterId;

    public static NtwrkSvcMntrngLogDto from(NtwrkSvcMntrngLog entity) {
        return NtwrkSvcMntrngLogDto.builder()
                .logId(entity.getLogId())
                .sysIp(entity.getSysIp())
                .sysPort(entity.getSysPort())
                .sysNm(entity.getSysNm())
                .mntrngSttus(entity.getMntrngSttus())
                .logInfo(entity.getLogInfo())
                .creatDt(entity.getCreatDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .build();
    }
}
