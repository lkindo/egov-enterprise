package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.DbMntrng;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DbMntrngDto {
    private String dataSourcNm;
    private String serverNm;
    private String dbmsKind;
    private String dbmsKindNm;
    private String ceckSql;
    private String mngrNm;
    private String mngrEmailAddr;
    private String mntrngSttus;
    private String mntrngSttusNm;
    private LocalDateTime creatDt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static DbMntrngDto from(DbMntrng entity) {
        return DbMntrngDto.builder()
                .dataSourcNm(entity.getDataSourcNm())
                .serverNm(entity.getServerNm())
                .dbmsKind(entity.getDbmsKind())
                .ceckSql(entity.getCeckSql())
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
