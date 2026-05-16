package nuri.business.service.scrap.dto;

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
    private String scrapId;
    private String bbsId;
    private Long pstId;
    private String scrapNm;
    private String scrapUrl;
    private String scrapDc;
    private String useYn;
    private String uniqId;
    private String userId; // Added
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public LocalDateTime getCreatedDate() {
        return frstRegisterPnttm;
    }

    public static ScrapDto from(Scrap entity) {
        if (entity == null) return null;
        return ScrapDto.builder()
                .scrapId(entity.getScrapId())
                .bbsId(entity.getBbsId())
                .nttId(entity.getNttId())
                .scrapNm(entity.getScrapNm())
                .scrapUrl(entity.getScrapUrl())
                .scrapDc(entity.getScrapDc())
                .useYn(entity.getUseYn())
                .uniqId(entity.getUniqId())
                .userId(entity.getFrstRegisterId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .build();
    }
}
