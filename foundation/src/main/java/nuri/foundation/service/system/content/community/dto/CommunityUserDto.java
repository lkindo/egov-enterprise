package nuri.foundation.service.system.content.community.dto;

import jakarta.validation.constraints.*;

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
