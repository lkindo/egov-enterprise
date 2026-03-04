package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.HttpMon;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HttpMonDto {
    private String sysId;
    private String webKind;
    private String siteUrl;
    private String httpSttusCd;
    private String httpSttusNm;
    private LocalDateTime creatDt;
    private String mngrNm;
    private String mngrEmailAddr;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static HttpMonDto from(HttpMon entity) {
        return HttpMonDto.builder()
                .sysId(entity.getSysId())
                .webKind(entity.getWebKind())
                .siteUrl(entity.getSiteUrl())
                .httpSttusCd(entity.getHttpSttusCd())
                .creatDt(entity.getCreatDt())
                .mngrNm(entity.getMngrNm())
                .mngrEmailAddr(entity.getMngrEmailAddr())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}