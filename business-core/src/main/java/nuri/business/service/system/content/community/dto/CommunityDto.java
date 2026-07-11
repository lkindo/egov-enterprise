package nuri.business.service.system.content.community.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.system.content.community.Community;
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
    @Size(max = 20)
    private String cmntyId;
    private String cmntyNm;
    @Size(max = 4000)
    private String cmntyIntroCn;
    private String regSeCd;
    private String regSeCdNm;
    private String tmpltId;
    private String tmpltNm;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    private String frstRgtrId;
    private String frstRegisterNm;
    private String crtDt;

    public static CommunityDto from(Community community) {
        if (community == null)
            return null;
        return CommunityDto.builder()
                .cmntyId(community.getCmntyId())
                .cmntyNm(community.getCmntyNm())
                .cmntyIntroCn(community.getCmntyIntroCn())
                .regSeCd(community.getRegSeCd())
                .tmpltId(community.getTmpltId())
                .useYn(community.getUseYn())
                .frstRgtrId(community.getFrstRgtrId())
                .crtDt(community.getCrtDt() != null
                        ? community.getCrtDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .build();
    }
}
