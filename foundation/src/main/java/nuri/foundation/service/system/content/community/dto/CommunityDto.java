package nuri.foundation.service.system.content.community.dto;

import nuri.foundation.domain.system.content.community.Community;
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
    private String cmntyId;
    private String cmntyTtl;
    private String cmntyIntroCn;
    private String regTypeCd;
    private String regTypeCdNm;
    private String tmplatId;
    private String tmplatNm;
    private String useYn;
    private String frstRegisterId;
    private String frstRegisterNm;
    private String frstRegisterPnttm;

    public static CommunityDto from(Community community) {
        if (community == null)
            return null;
        return CommunityDto.builder()
                .cmntyId(community.getCmntyId())
                .cmntyTtl(community.getCmntyTtl())
                .cmntyIntroCn(community.getCmntyIntroCn())
                .regTypeCd(community.getRegTypeCd())
                .tmplatId(community.getTmplatId())
                .useYn(community.getUseYn())
                .frstRegisterId(community.getFrstRegisterId())
                .frstRegisterPnttm(community.getFrstRegisterPnttm() != null
                        ? community.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .build();
    }
}
