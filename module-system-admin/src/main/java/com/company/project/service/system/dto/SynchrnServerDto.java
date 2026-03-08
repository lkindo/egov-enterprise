package com.company.project.service.system.dto;

import com.company.project.domain.system.SynchrnServerSystem;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SynchrnServerDto {
    private String serverId;
    private String serverNm;
    private String serverIp;
    private String serverPort;
    private String ftpId;
    private String ftpPassword;
    private String synchrnLc;
    private String reflctAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static SynchrnServerDto from(SynchrnServerSystem entity) {
        return SynchrnServerDto.builder()
                .serverId(entity.getServerId())
                .serverNm(entity.getServerNm())
                .serverIp(entity.getServerIp())
                .serverPort(entity.getServerPort())
                .ftpId(entity.getFtpId())
                .ftpPassword(entity.getFtpPassword())
                .synchrnLc(entity.getSynchrnLc())
                .reflctAt(entity.getReflctAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
