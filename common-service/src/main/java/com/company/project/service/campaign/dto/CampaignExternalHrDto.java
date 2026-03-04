package com.company.project.service.campaign.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignExternalHrDto {
    private String extrlHrId;
    private String eventId;
    private String sexdstnCode;
    private String extrlHrNm;
    private String areaNo;
    private String middleTelno;
    private String endTelno;
    private String emailAdres;
    private String occpTyCode;
    private String brth;
    private String psitnInsttNm;
}