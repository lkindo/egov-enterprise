package com.company.project.service.reward.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardDto {
    private String rwardId;
    private String rwardManId;
    private String rwardManNm;
    private String rwardCode;
    private String rwardCdNm;
    private String rwardDe;
    private String rwardNm;
    private String pblenCn;
    private String sanctnerId;
    private String sanctnerNm;
    private String confmAt;
    private LocalDateTime sanctnDt;
    private String returnResn;
    private String atchFileId;
    private String infrmlSanctnId;
}
