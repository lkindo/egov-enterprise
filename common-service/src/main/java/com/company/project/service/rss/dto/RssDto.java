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
@Schema(description = "RSS 정보 DTO")
public class RssDto {

    @Schema(description = "RSS ID")
    private String rssId;

    @Schema(description = "대상 서비스 명")
    private String trgetSvcNm;

    @Schema(description = "대상 서비스 테이블")
    private String trgetSvcTable;

    @Schema(description = "대상 서비스 목록 수")
    private Integer trgetSvcListCo;

    @Schema(description = "헤더 제목")
    private String hderTitle;

    @Schema(description = "헤더 링크")
    private String hderLink;

    @Schema(description = "헤더 설명")
    private String hderDc;

    @Schema(description = "헤더 태그")
    private String hderTag;

    @Schema(description = "헤더 기타")
    private String hderEtc;

    @Schema(description = "본문 제목")
    private String bdtTitle;

    @Schema(description = "본문 링크")
    private String bdtLink;

    @Schema(description = "본문 설명")
    private String bdtDc;

    @Schema(description = "본문 태그")
    private String bdtTag;

    @Schema(description = "본문 기타 태그")
    private String bdtEtcTag;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    public static RssDto from(Rss entity) {
        if (entity == null)
            return null;
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
        if (entity == null)
            return null;
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