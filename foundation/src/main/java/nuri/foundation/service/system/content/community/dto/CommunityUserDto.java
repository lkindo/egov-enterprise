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
    private String cmmntyId;
    private String emplyrId;
    private String emplyrNm;
    private String mngrAt;
    private String sbscrbDe;
    private String secsnDe;
    private String mberSttus;
    private String mberSttusNm;
    private String useAt;
    private String frstRegisterPnttm;
    private String frstRegisterId;

    public static CommunityUserDto from(CommunityUser entity) {
        if (entity == null)
            return null;
        return CommunityUserDto.builder()
                .cmmntyId(entity.getId().getCmmntyId())
                .emplyrId(entity.getId().getEmplyrId())
                .mngrAt(entity.getMngrAt())
                .sbscrbDe(entity.getSbscrbDe() != null
                        ? entity.getSbscrbDe().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .secsnDe(entity.getSecsnDe())
                .mberSttus(entity.getMberSttus())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm() != null
                        ? entity.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .build();
    }
}
