package com.company.project.service.rss.dto;

import com.company.project.domain.rss.Rss;
import com.company.project.domain.rss.RssTag;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class RssDto {

    @Schema(description = "RSS ID")
    private String rssId;

    @Schema(description = "Description")
    private String trgetSvcNm;

    @Schema(description = "Description")
    private String trgetSvcTable;

    @Schema(description = "Description")
    private Integer trgetSvcListCo;

    @Schema(description = "Description")
    private String hderTitle;

    @Schema(description = "Description")
    private String hderLink;

    @Schema(description = "Description")
    private String hderDc;

    @Schema(description = "Description")
    private String hderTag;

    @Schema(description = "Description")
    private String hderEtc;

    @Schema(description = "Description")
    private String bdtTitle;

    @Schema(description = "Description")
    private String bdtLink;

    @Schema(description = "Description")
    private String bdtDc;

    @Schema(description = "Description")
    private String bdtTag;

    @Schema(description = "Description")
    private String bdtEtcTag;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static RssDto from(Rss entity) {
        if (entity == null) return null;
        return RssDto.builder()
                .rssId(entity.getRssId())
                .trgetSvcNm(entity.getTrgetSvcNm())
                .trgetSvcTable(entity.getTrgetSvcTable())
                .trgetSvcListCo(entity.getTrgetSvcListCo())
                .hderTitle(entity.getHderTitle())
                .hderLink(entity.getHderLink())
                .hderDc(entity.getHderDc())
                .hderTag(entity.getHderTag())
                .hderEtc(entity.getHderEtc())
                .bdtTitle(entity.getBdtTitle())
                .bdtLink(entity.getBdtLink())
                .bdtDc(entity.getBdtDc())
                .bdtTag(entity.getBdtTag())
                .bdtEtcTag(entity.getBdtEtcTag())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }

    public static RssDto from(RssTag entity) {
        if (entity == null) return null;
        return RssDto.builder()
                .rssId(entity.getRssId())
                .trgetSvcNm(entity.getTrgetSvcNm())
                .trgetSvcTable(entity.getTrgetSvcTable())
                .trgetSvcListCo(entity.getTrgetSvcListCo())
                .hderTag(entity.getHderTag())
                .bdtTag(entity.getItemTag())
                .bdtTitle(entity.getTitleTag())
                .bdtLink(entity.getLinkTag())
                .bdtDc(entity.getDescriptionTag())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
