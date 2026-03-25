package com.company.project.business.service.scrap.dto;

import com.company.project.business.domain.scrap.Scrap;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * ??겕??DTO
 */
@Getter
@Builder
public class ScrapDto {
    private String scrapId;
    private String bbsId;
    private Long nttId;
    private String scrapNm;
    private String useAt;
    private String uniqId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static ScrapDto from(Scrap entity) {
        return ScrapDto.builder()
                .scrapId(entity.getScrapId())
                .bbsId(entity.getBbsId())
                .nttId(entity.getNttId())
                .scrapNm(entity.getScrapNm())
                .useAt(entity.getUseAt())
                .uniqId(entity.getUniqId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .build();
    }
}
