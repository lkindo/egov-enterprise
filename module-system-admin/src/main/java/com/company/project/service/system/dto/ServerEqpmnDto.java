package com.company.project.service.system.dto;

import com.company.project.domain.system.ServerEqpmn;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServerEqpmnDto {
    private String serverEqpmnId;
    private String serverEqpmnNm;
    private String serverEqpmnIp;
    private String serverEqpmnMngr;
    private String mngrEmailAddr;
    private String opersysmInfo;
    private String cpuInfo;
    private String moryInfo;
    private String hdDisk;
    private String etcInfo;
    private LocalDate regstYmd;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static ServerEqpmnDto from(ServerEqpmn entity) {
        return ServerEqpmnDto.builder()
                .serverEqpmnId(entity.getServerEqpmnId())
                .serverEqpmnNm(entity.getServerEqpmnNm())
                .serverEqpmnIp(entity.getServerEqpmnIp())
                .serverEqpmnMngr(entity.getServerEqpmnMngr())
                .mngrEmailAddr(entity.getMngrEmailAddr())
                .opersysmInfo(entity.getOpersysmInfo())
                .cpuInfo(entity.getCpuInfo())
                .moryInfo(entity.getMoryInfo())
                .hdDisk(entity.getHdDisk())
                .etcInfo(entity.getEtcInfo())
                .regstYmd(entity.getRegstYmd())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}
