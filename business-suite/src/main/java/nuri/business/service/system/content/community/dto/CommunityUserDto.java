package nuri.business.service.system.content.community.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.system.content.community.CommunityUser;
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
    @Size(max = 20)
    private String cmntyId;
    @Size(max = 20)
    @NotBlank
    private String userId;
    @Size(max = 100)
    private String userNm;
    @Size(max = 1)
    private String mngrYn;
    @Size(max = 8)
    private String joinYmd;
    private String wdrlYmd;
    @Size(max = 12)
    private String mbrSttsCd;
    private String mbrSttsCdNm;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    private String crtDt;
    private String frstRgtrId;

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
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt() != null
                        ? entity.getCrtDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .build();
    }
}
