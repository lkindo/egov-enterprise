package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.FileSysMntrngLog;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileSysMntrngLogDto {
    private String logId;
    private String fileSysId;
    private String fileSysNm;
    private String fileSysManageNm;
    private Long fileSysMg;
    private Long fileSysThrhld;
    private Long fileSysUsgQty;
    private String mntrngSttus;
    private String mntrngSttusNm;
    private String logInfo;
    private LocalDateTime creatDt;
    private String frstRegisterId;

    public static FileSysMntrngLogDto from(FileSysMntrngLog entity) {
        return FileSysMntrngLogDto.builder()
                .logId(entity.getLogId())
                .fileSysId(entity.getFileSysId())
                .fileSysNm(entity.getFileSysNm())
                .fileSysManageNm(entity.getFileSysManageNm())
                .fileSysMg(entity.getFileSysMg())
                .fileSysThrhld(entity.getFileSysThrhld())
                .fileSysUsgQty(entity.getFileSysUsgQty())
                .mntrngSttus(entity.getMntrngSttus())
                .logInfo(entity.getLogInfo())
                .creatDt(entity.getCreatDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .build();
    }
}
