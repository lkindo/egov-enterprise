package com.company.project.service.community.dto;

import java.time.LocalDateTime;
import com.company.project.domain.community.Community;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommunityDto {
    private String cmmntyId;
    private String cmmntyNm;
    private String cmmntyIntrcn;
    private String registSeCode;
    private String tmplatId;
    private String useAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static CommunityDto from(Community entity) {
        return CommunityDto.builder()
                .cmmntyId(entity.getId())
                .cmmntyNm(entity.getCmmntyNm())
                .cmmntyIntrcn(entity.getCmmntyIntrcn())
                .registSeCode(entity.getRegistSeCode())
                .tmplatId(entity.getTmplatId())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getModifiedDate())
                .build();
    }
}
