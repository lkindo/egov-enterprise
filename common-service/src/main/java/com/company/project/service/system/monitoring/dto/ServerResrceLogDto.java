package com.company.project.service.system.monitoring.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServerResrceLogDto {
    private String logId;
    private String serverId;
    private String serverEqpmnId;
    private String serverNm;
    private String serverEqpmnIp;
    private Double cpuUseRt;
    private Double moryUseRt;
    private String svcSttus;
    private String svcSttusNm;
    private String logInfo;
    private String mngrEmailAddr;
    private LocalDateTime creatDt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
}