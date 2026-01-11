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
@Table(name = "NRSSTAG")
public class RssTag {

    @Id
    @Column(name = "RSS_ID", length = 20)
    private String rssId;

    @Column(name = "TRGET_SVC_NM", length = 255)
    private String trgetSvcNm;

    @Column(name = "TRGET_SVC_TABLE", length = 255)
    private String trgetSvcTable;

    @Column(name = "TRGET_SVC_LIST_CO")
    private Integer trgetSvcListCo;

    @Column(name = "HDER_TAG", length = 255)
    private String hderTag;

    @Column(name = "ITEM_TAG", length = 255)
    private String itemTag;

    @Column(name = "TITLE_TAG", length = 255)
    private String titleTag;

    @Column(name = "LINK_TAG", length = 255)
    private String linkTag;

    @Column(name = "DESCRIPTION_TAG", length = 255)
    private String descriptionTag;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public RssTag(String rssId, String trgetSvcNm, String trgetSvcTable, Integer trgetSvcListCo, String hderTag,
            String itemTag, String titleTag, String linkTag, String descriptionTag, String frstRegisterId) {
        this.rssId = rssId;
        this.trgetSvcNm = trgetSvcNm;
        this.trgetSvcTable = trgetSvcTable;
        this.trgetSvcListCo = trgetSvcListCo;
        this.hderTag = hderTag;
        this.itemTag = itemTag;
        this.titleTag = titleTag;
        this.linkTag = linkTag;
        this.descriptionTag = descriptionTag;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String trgetSvcNm, String trgetSvcTable, Integer trgetSvcListCo, String hderTag, String itemTag,
            String titleTag, String linkTag, String descriptionTag, String lastUpdusrId) {
        this.trgetSvcNm = trgetSvcNm;
        this.trgetSvcTable = trgetSvcTable;
        this.trgetSvcListCo = trgetSvcListCo;
        this.hderTag = hderTag;
        this.itemTag = itemTag;
        this.titleTag = titleTag;
        this.linkTag = linkTag;
        this.descriptionTag = descriptionTag;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
