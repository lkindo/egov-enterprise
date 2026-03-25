package com.company.project.foundation.service.operation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExternalHrDto {
    private String eventId;
    private String extrlHrId;
    private String sexdstnCode;
    private String extrlHrNm;
    private String occpTyCode;
    private String psitnInsttNm;
    private String brthdy;
    private String areaNo;
    private String middleTelno;
    private String endTelno;
    private String emailAdres;
    private LocalDateTime frstRegistPnttm;
    private String frstRegisterId;
    private LocalDateTime lastUpdtPnttm;
    private String lastUpdusrId;
}
