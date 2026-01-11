package com.company.project.domain.rss;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;

@Entity(name = "RssDomain")
@Table(name = "COMTNRSS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@DynamicInsert
@DynamicUpdate
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

    @Column(name = "HDER_DC", length = 4000)
    private String hderDc;

    @Column(name = "HDER_TAG", length = 255)
    private String hderTag;

    @Column(name = "HDER_ETC", length = 255)
    private String hderEtc;

    @Column(name = "BDT_TITLE", length = 255)
    private String bdtTitle;

    @Column(name = "BDT_LINK", length = 255)
    private String bdtLink;

    @Column(name = "BDT_DC", length = 4000)
    private String bdtDc;

    @Column(name = "BDT_TAG", length = 255)
    private String bdtTag;

    @Column(name = "BDT_ETC_TAG", length = 255)
    private String bdtEtcTag;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @PrePersist
    protected void onCreate() {
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
