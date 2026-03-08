package com.company.project.service.system.dto;

import com.company.project.domain.system.Server;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServerDto {
    private String serverId;
    private String serverNm;
    private String serverKnd;
    private String serverKndNm; // For display
    private LocalDate regstYmd;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static ServerDto from(Server entity) {
        return ServerDto.builder()
                .serverId(entity.getServerId())
                .serverNm(entity.getServerNm())
                .serverKnd(entity.getServerKnd())
                .regstYmd(entity.getRegstYmd())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}
