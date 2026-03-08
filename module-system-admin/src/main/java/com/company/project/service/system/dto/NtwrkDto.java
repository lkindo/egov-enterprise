package com.company.project.service.system.dto;

import com.company.project.domain.system.Ntwrk;
import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NtwrkDto {
    private String ntwrkId;
    private String ntwrkIp;
    private String gtwy;
    private String subnet;
    private String domnServer;
    private String manageIem;
    private String manageIemNm; // For display
    private String userNm;
    private String useAt;
    private LocalDate regstYmd;
    private String frstRegisterId;
    private String frstRegisterPnttm;
    private String lastUpdusrId;
    private String lastUpdusrPnttm;

    public static NtwrkDto from(Ntwrk entity) {
        return NtwrkDto.builder()
                .ntwrkId(entity.getNtwrkId())
                .ntwrkIp(entity.getNtwrkIp())
                .gtwy(entity.getGtwy())
                .subnet(entity.getSubnet())
                .domnServer(entity.getDomnServer())
                .manageIem(entity.getManageIem())
                .userNm(entity.getUserNm())
                .useAt(entity.getUseAt())
                .regstYmd(entity.getRegstYmd())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}
