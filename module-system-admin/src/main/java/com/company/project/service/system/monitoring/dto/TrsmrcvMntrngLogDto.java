package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.TrsmrcvMntrngLog;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrsmrcvMntrngLogDto {
    private String logId;
    private String cntcId;
    private String testClassNm;
    private String mngrNm;
    private String mntrngSttus;
    private String mntrngSttusNm;
    private String logInfo;
    private LocalDateTime creatDt;
    private String frstRegisterId;

    public static TrsmrcvMntrngLogDto from(TrsmrcvMntrngLog entity) {
        return TrsmrcvMntrngLogDto.builder()
                .logId(entity.getLogId())
                .cntcId(entity.getCntcId())
                .testClassNm(entity.getTestClassNm())
                .mngrNm(entity.getMngrNm())
                .mntrngSttus(entity.getMntrngSttus())
                .logInfo(entity.getLogInfo())
                .creatDt(entity.getCreatDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .build();
    }
}
