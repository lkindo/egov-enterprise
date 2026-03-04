package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.HttpMonLog;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HttpMonLogDto {
    private String logId;
    private String sysId;
    private String webKind;
    private String siteUrl;
    private String httpSttusCd;
    private String httpSttusNm;
    private String logInfo;
    private LocalDateTime creatDt;
    private String mngrNm;
    private String frstRegisterId;

    public static HttpMonLogDto from(HttpMonLog entity) {
        return HttpMonLogDto.builder()
                .logId(entity.getLogId())
                .sysId(entity.getSysId())
                .webKind(entity.getWebKind())
                .siteUrl(entity.getSiteUrl())
                .httpSttusCd(entity.getHttpSttusCd())
                .logInfo(entity.getLogInfo())
                .creatDt(entity.getCreatDt())
                .mngrNm(entity.getMngrNm())
                .frstRegisterId(entity.getFrstRegisterId())
                .build();
    }
}