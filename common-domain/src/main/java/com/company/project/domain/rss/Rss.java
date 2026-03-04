package com.company.project.domain.rss;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NRSSMANAGE")
public class Rss extends BaseEntity {

    @Id
    @Column(name = "RSS_ID", length = 20)
    private String rssId;

    @Column(name = "TRGET_SVC_NM", length = 255)
    private String trgetSvcNm;

    @Column(name = "TRGET_SVC_TABLE", length = 255)
    private String trgetSvcTable;

    @Column(name = "TRGET_SVC_LIST_CO")
    private Integer trgetSvcListCo;

    @Column(name = "HDER_TITLE", length = 255)
    private String hderTitle;

    @Column(name = "HDER_LINK", length = 255)
    private String hderLink;

    @Column(name = "HDER_DC", length = 255)
    private String hderDc;

    @Column(name = "HDER_TAG", length = 255)
    private String hderTag;

    @Column(name = "HDER_ETC", length = 255)
    private String hderEtc;

    @Column(name = "BDT_TITLE", length = 255)
    private String bdtTitle;

    @Column(name = "BDT_LINK", length = 255)
    private String bdtLink;

    @Column(name = "BDT_DC", length = 255)
    private String bdtDc;

    @Column(name = "BDT_TAG", length = 255)
    private String bdtTag;

    @Column(name = "BDT_ETC_TAG", length = 255)
    private String bdtEtcTag;

    public void update(String trgetSvcNm, String trgetSvcTable, Integer trgetSvcListCo,
                       String hderTitle, String hderLink, String hderDc, String hderTag, String hderEtc,
                       String bdtTitle, String bdtLink, String bdtDc, String bdtTag, String bdtEtcTag) {
        this.trgetSvcNm = trgetSvcNm;
        this.trgetSvcTable = trgetSvcTable;
        this.trgetSvcListCo = trgetSvcListCo;
        this.hderTitle = hderTitle;
        this.hderLink = hderLink;
        this.hderDc = hderDc;
        this.hderTag = hderTag;
        this.hderEtc = hderEtc;
        this.bdtTitle = bdtTitle;
        this.bdtLink = bdtLink;
        this.bdtDc = bdtDc;
        this.bdtTag = bdtTag;
        this.bdtEtcTag = bdtEtcTag;
    }
}