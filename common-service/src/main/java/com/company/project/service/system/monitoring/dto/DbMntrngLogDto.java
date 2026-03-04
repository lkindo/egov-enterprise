package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.DbMntrngLog;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DbMntrngLogDto {
    private String logId;
    private String dataSourcNm;
    private String serverNm;
    private String dbmsKind;
    private String dbmsKindNm;
    private String mngrNm;
    private String mntrngSttus;
    private String mntrngSttusNm;
    private String logInfo;
    private LocalDateTime creatDt;
    private String frstRegisterId;

    public static DbMntrngLogDto from(DbMntrngLog entity) {
        return DbMntrngLogDto.builder()
                .logId(entity.getLogId())
                .dataSourcNm(entity.getDataSourcNm())
                .serverNm(entity.getServerNm())
                .dbmsKind(entity.getDbmsKind())
                .mngrNm(entity.getMngrNm())
                .mntrngSttus(entity.getMntrngSttus())
                .logInfo(entity.getLogInfo())
                .creatDt(entity.getCreatDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .build();
    }
}