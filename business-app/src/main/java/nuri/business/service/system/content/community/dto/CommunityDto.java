package nuri.business.service.system.content.community.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
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
    private Long cmntySn;
    // [2026-09-06 DEC-OPS-037] 제품 규칙(컬럼은 nullable) — 이름 없는 커뮤니티는 목록·포틀릿에서 빈칸이 된다.
    @NotBlank
    @Size(max = 100)
    private String cmntyNm;
    @Size(max = 4000)
    private String cmntyIntroCn;
    @Size(max = 12)
    private String regSeCd;
    private String regSeCdNm;
    @Size(max = 20)
    private String tmpltId;
    private String tmpltNm;
    @Schema(description = "사용 여부", allowableValues = {"Y", "N"})
    @Size(max = 1)
    @NotBlank
    @Pattern(regexp = "^(?:Y|N)$")
    private String useYn;
    private String frstRgtrId;
    private String frstRegisterNm;
    private String crtDt;

    public static CommunityDto from(Community community) {
        if (community == null)
            return null;
        return CommunityDto.builder()
                .cmntySn(community.getCmntySn())
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
