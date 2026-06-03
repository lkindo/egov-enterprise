package nuri.business.service.scrap.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.scrap.Scrap;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 스크랩 DTO (v5 standardized)
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapDto {
    @Size(max = 20)
    private String scrapId;
    @Size(max = 20)
    private String bbsId;
    @Size(max = 20)
    private String pstId;
    @Size(max = 100)
    private String scrapNm;
    @Size(max = 1000)
    private String scrapUrl;
    private String scrapExpln;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    @Size(max = 20)
    @NotBlank
    private String userId; 
    private String frstRgtrId;
    private LocalDateTime crtDt;

    public static ScrapDto from(Scrap entity) {
        if (entity == null) return null;
        return ScrapDto.builder()
                .scrapId(entity.getScrapId())
                .bbsId(entity.getBbsId())
                .pstId(entity.getPstId())
                .scrapNm(entity.getScrapNm())
                .scrapUrl(entity.getScrapUrl())
                .scrapExpln(entity.getScrapExpln())
                .useYn(entity.getUseYn())
                .userId(entity.getFrstRgtrId())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
