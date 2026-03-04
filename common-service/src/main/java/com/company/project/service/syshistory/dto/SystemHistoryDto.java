package com.company.project.service.syshistory.dto;

import com.company.project.domain.syshistory.SystemHistory;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * ??뒪??????DTO
 */
@Getter
@Builder
public class SystemHistoryDto {
    private String histId;
    private String sysNm;
    private String histSeCode;
    private String histCn;
    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static SystemHistoryDto from(SystemHistory entity) {
        return SystemHistoryDto.builder()
                .histId(entity.getHistId())
                .sysNm(entity.getSysNm())
                .histSeCode(entity.getHistSeCode())
                .histCn(entity.getHistCn())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}
