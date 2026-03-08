package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.ProcessMonLog;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessMonLogDto {
    private String logId;
    private String processNm;
    private String procsSttus;
    private String procsSttusNm;
    private String logInfo;
    private LocalDateTime creatDt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static ProcessMonLogDto from(ProcessMonLog entity) {
        return ProcessMonLogDto.builder()
                .logId(entity.getLogId())
                .processNm(entity.getProcessNm())
                .procsSttus(entity.getProcsSttus())
                .logInfo(entity.getLogInfo())
                .creatDt(entity.getCreatDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
