package nuri.foundation.service.system.content.community.dto;

import nuri.foundation.domain.system.content.community.CommunityUser;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunityUserDto {
    private String cmntyId;
    private String userId;
    private String userNm;
    private String mngrYn;
    private String joinYmd;
    private String wdrlYmd;
    private String mbrSttsCd;
    private String mbrSttsCdNm;
    private String useYn;
    private String frstRegisterPnttm;
    private String frstRegisterId;

    public static CommunityUserDto from(CommunityUser entity) {
        if (entity == null)
            return null;
        return CommunityUserDto.builder()
                .cmntyId(entity.getId().getCmntyId())
                .userId(entity.getId().getUserId())
                .mngrYn(entity.getMngrYn())
                .joinYmd(entity.getJoinYmd())
                .wdrlYmd(entity.getWdrlYmd())
                .mbrSttsCd(entity.getMbrSttsCd())
                .useYn(entity.getUseYn())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm() != null
                        ? entity.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .build();
    }
}
