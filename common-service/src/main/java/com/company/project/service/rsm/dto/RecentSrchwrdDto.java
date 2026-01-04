package com.company.project.service.rsm.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecentSrchwrdDto {
    private String srchwrdManageId;
    private String srchwrdManageNm;
    private String srchwrdConectUrl;
    private String userSearchAt;

    private String srchwrdId;
    private String srchwrdNm;

    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
}
