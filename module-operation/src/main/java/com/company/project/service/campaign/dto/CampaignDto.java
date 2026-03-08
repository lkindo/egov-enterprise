package com.company.project.service.campaign.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignDto {
    private String eventId;
    private String eventBeginDe;
    private String eventEndDe;
    private Long svcUseNmprCo;
    private String chargerNm;
    private String eventCn;
    private String eventTyCode;
    private String prparetgCn;
    private String eventConfmAt;
    private String eventConfmDe;
    private List<CampaignExternalHrDto> externalHrs;
}
