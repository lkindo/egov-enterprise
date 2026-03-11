package com.company.project.service.system.content.community.dto;

import com.company.project.domain.system.content.community.Community;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunityDto {
    private String cmmntyId;
    private String cmmntyNm;
    private String cmmntyIntrcn;
    private String registSeCode;
    private String registSeCodeNm;
    private String tmplatId;
    private String tmplatNm;
    private String useAt;
    private String frstRegisterId;
    private String frstRegisterNm;
    private String frstRegisterPnttm;

    public static CommunityDto from(Community community) {
        if (community == null)
            return null;
        return CommunityDto.builder()
                .cmmntyId(community.getCmmntyId())
                .cmmntyNm(community.getCmmntyNm())
                .cmmntyIntrcn(community.getCmmntyIntrcn())
                .registSeCode(community.getRegistSeCode())
                .tmplatId(community.getTmplatId())
                .useAt(community.getUseAt())
                .frstRegisterId(community.getFrstRegisterId())
                .frstRegisterPnttm(community.getFrstRegisterPnttm() != null
                        ? community.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .build();
    }
}
