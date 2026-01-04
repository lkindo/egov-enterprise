package com.company.project.service.rss.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RssDto {
    private String rssId;
    private String trgetSvcNm;
    private String trgetSvcTable;
    private Integer trgetSvcListCo;
    private String hderTitle;
    private String hderLink;
    private String hderDc;
    private String hderTag;
    private String hderEtc;
    private String bdtTitle;
    private String bdtLink;
    private String bdtDc;
    private String bdtTag;
    private String bdtEtcTag;
}
