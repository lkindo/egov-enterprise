package com.company.project.service.system.monitoring.dto;

import com.company.project.domain.system.monitoring.FileSysMntrng;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileSysMntrngDto {
    private String fileSysId;
    private String fileSysNm;
    private String fileSysManageNm;
    private Long fileSysMg;
    private Long fileSysThrhld;
    private Long fileSysUsgQty;
    private Double fileSysUsgRt;
    private String mntrngSttus;
    private String mntrngSttusNm;
    private String mngrNm;
    private String mngrEmailAddr;
    private LocalDateTime creatDt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static FileSysMntrngDto from(FileSysMntrng entity) {
        double usgRt = 0.0;
        if (entity.getFileSysMg() != null && entity.getFileSysMg() > 0) {
            usgRt = (double) entity.getFileSysUsgQty() / entity.getFileSysMg() * 100;
        }

        return FileSysMntrngDto.builder()
                .fileSysId(entity.getFileSysId())
                .fileSysNm(entity.getFileSysNm())
                .fileSysManageNm(entity.getFileSysManageNm())
                .fileSysMg(entity.getFileSysMg())
                .fileSysThrhld(entity.getFileSysThrhld())
                .fileSysUsgQty(entity.getFileSysUsgQty())
                .fileSysUsgRt(usgRt)
                .mntrngSttus(entity.getMntrngSttus())
                .mngrNm(entity.getMngrNm())
                .mngrEmailAddr(entity.getMngrEmailAddr())
                .creatDt(entity.getCreatDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
