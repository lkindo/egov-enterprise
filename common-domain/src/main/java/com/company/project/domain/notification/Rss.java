package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NRSS")
public class Rss {

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

    @Column(name = "HDER_DC", length = 1000)
    private String hderDc;

    @Column(name = "HDER_TAG", length = 255)
    private String hderTag;

    @Column(name = "HDER_ETC", length = 255)
    private String hderEtc;

    @Column(name = "BDT_TITLE", length = 255)
    private String bdtTitle;

    @Column(name = "BDT_LINK", length = 255)
    private String bdtLink;

    @Column(name = "BDT_DC", length = 1000)
    private String bdtDc;

    @Column(name = "BDT_TAG", length = 255)
    private String bdtTag;

    @Column(name = "BDT_ETC_TAG", length = 255)
    private String bdtEtcTag;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Rss(String rssId, String trgetSvcNm, String trgetSvcTable, Integer trgetSvcListCo,
            String hderTitle, String hderLink, String hderDc, String hderTag, String hderEtc,
            String bdtTitle, String bdtLink, String bdtDc, String bdtTag, String bdtEtcTag,
            String frstRegisterId) {
        this.rssId = rssId;
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
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }
}
