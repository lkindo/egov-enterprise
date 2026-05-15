package nuri.business.service.scrap.dto;

import nuri.business.domain.scrap.Scrap;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 스크랩 DTO (v5 standardized)
 */
@Getter
@Builder
public class ScrapDto {
    private String scrapId;
    private String bbsId;
    private Long pstId;
    private String scrapNm;
    private String scrapUrl;
    private String scrapDc;
    private String useYn;
    private String uniqId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public LocalDateTime getCreatedDate() {
        return frstRegisterPnttm;
    }

    public static ScrapDto from(Scrap entity) {
        return ScrapDto.builder()
                .scrapId(entity.getScrapId())
                .bbsId(entity.getBbsId())
                .pstId(entity.getPstId())
                .scrapNm(entity.getScrapNm())
                .scrapUrl(entity.getScrapUrl())
                .scrapDc(entity.getScrapDc())
                .useYn(entity.getUseYn())
                .uniqId(entity.getUniqId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .build();
    }
}
