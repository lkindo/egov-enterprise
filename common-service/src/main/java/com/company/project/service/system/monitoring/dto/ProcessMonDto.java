package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.ProcessMon;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessMonDto {
    private String processNm;
    private String procsSttus;
    private String procsSttusNm;
    private String mngrNm;
    private String mngrEmailAddr;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static ProcessMonDto from(ProcessMon entity) {
        return ProcessMonDto.builder()
                .processNm(entity.getProcessNm())
                .procsSttus(entity.getProcsSttus())
                .mngrNm(entity.getMngrNm())
                .mngrEmailAddr(entity.getMngrEmailAddr())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}