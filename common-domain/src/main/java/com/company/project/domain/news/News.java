package com.company.project.domain.news;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 뉴스정보 JPA Entity
 * 레거시 테이블: COMTNNEWSINFO
 */
@Entity(name = "NewsDomain")
@Table(name = "NNEWSINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class News {

    @Id
    @Column(name = "NEWS_ID", length = 20)
    private String newsId;

    @Column(name = "NEWS_SJ", length = 100, nullable = false)
    private String newsSj;

    @Column(name = "NEWS_CN", length = 2500)
    private String newsCn;

    @Column(name = "NEWS_ORIGIN", length = 100)
    private String newsOrigin;

    @Column(name = "NTCE_DE", length = 20)
    private String ntceDe;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public News(String newsId, String newsSj, String newsCn, String newsOrigin,
            String ntceDe, String atchFileId, String frstRegisterId) {
        this.newsId = newsId;
        this.newsSj = newsSj;
        this.newsCn = newsCn;
        this.newsOrigin = newsOrigin;
        this.ntceDe = ntceDe;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String newsSj, String newsCn, String newsOrigin, String ntceDe,
            String atchFileId, String updusrId) {
        this.newsSj = newsSj;
        this.newsCn = newsCn;
        this.newsOrigin = newsOrigin;
        this.ntceDe = ntceDe;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
