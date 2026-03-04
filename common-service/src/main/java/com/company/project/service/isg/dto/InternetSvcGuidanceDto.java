package com.company.project.service.isg.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternetSvcGuidanceDto {
    private String intnetSvcId;
    private String intnetSvcNm;
    private String intnetSvcDc;
    private String reflctAt;
    private String userId;
    private LocalDateTime regDate;
}