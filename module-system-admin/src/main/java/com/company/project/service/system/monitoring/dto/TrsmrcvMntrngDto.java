package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.TrsmrcvMntrng;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrsmrcvMntrngDto {
    private String cntcId;
    private String testClassNm;
    private String mngrNm;
    private String mngrEmailAddr;
    private String mntrngSttus;
    private String mntrngSttusNm;
    private LocalDateTime creatDt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static TrsmrcvMntrngDto from(TrsmrcvMntrng entity) {
        return TrsmrcvMntrngDto.builder()
                .cntcId(entity.getCntcId())
                .testClassNm(entity.getTestClassNm())
                .mngrNm(entity.getMngrNm())
                .mngrEmailAddr(entity.getMngrEmailAddr())
                .mntrngSttus(entity.getMntrngSttus())
                .creatDt(entity.getCreatDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
