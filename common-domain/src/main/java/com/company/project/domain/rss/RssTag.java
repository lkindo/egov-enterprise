package com.company.project.domain.rss;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * RSS ??볥젃 ?類ｋ궖 Entity
 * ??뉕탢?????뵠?? NRSSTAG
 */
@Entity
@Table(name = "NRSSTAG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RssTag extends BaseEntity {

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

    @Builder
    public RssTag(String rssId, String trgetSvcNm, String trgetSvcTable, Integer trgetSvcListCo,
                  String hderTag, String itemTag, String titleTag, String linkTag, String descriptionTag) {
        this.rssId = rssId;
        this.trgetSvcNm = trgetSvcNm;
        this.trgetSvcTable = trgetSvcTable;
        this.trgetSvcListCo = trgetSvcListCo;
        this.hderTag = hderTag;
        this.itemTag = itemTag;
        this.titleTag = titleTag;
        this.linkTag = linkTag;
        this.descriptionTag = descriptionTag;
    }

    public void update(String trgetSvcNm, String trgetSvcTable, Integer trgetSvcListCo,
                      String hderTag, String itemTag, String titleTag, String linkTag, String descriptionTag) {
        this.trgetSvcNm = trgetSvcNm;
        this.trgetSvcTable = trgetSvcTable;
        this.trgetSvcListCo = trgetSvcListCo;
        this.hderTag = hderTag;
        this.itemTag = itemTag;
        this.titleTag = titleTag;
        this.linkTag = linkTag;
        this.descriptionTag = descriptionTag;
    }
}