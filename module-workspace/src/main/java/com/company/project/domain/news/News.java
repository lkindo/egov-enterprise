package com.company.project.domain.news;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;
import java.time.LocalDateTime;

/**
 * 뉴스 정보 엔티티
 * 테이블: NNEWSINFO (구 COMTNNEWSINFO)
 */
@Entity(name = "NewsDomain")
@Table(name = "NNEWSINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class News {

    @Id
    @Column(name = "NEWS_ID", length = 20)
    @Comment("뉴스 ID")
    private String newsId;

    @Column(name = "NEWS_SJ", length = 100, nullable = false)
    @Comment("뉴스 제목")
    private String title;

    @Column(name = "NEWS_CN", length = 2500)
    @Comment("뉴스 내용")
    private String content;

    @Column(name = "NEWS_ORIGIN", length = 100)
    @Comment("뉴스 출처")
    private String newsOrigin;

    @Column(name = "NTCE_DE", length = 20)
    @Comment("게시 일자")
    private String noticeDate;

    @Column(name = "ATCH_FILE_ID", length = 20)
    @Comment("첨부 파일 ID")
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    @Comment("최초 등록자 ID")
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    @Comment("최초 등록 일시")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    @Comment("최종 수정자 ID")
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    @Comment("최종 수정 일시")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public News(String newsId, String title, String content, String newsOrigin,
            String noticeDate, String atchFileId, String frstRegisterId) {
        this.newsId = newsId;
        this.title = title;
        this.content = content;
        this.newsOrigin = newsOrigin;
        this.noticeDate = noticeDate;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String title, String content, String newsOrigin, String noticeDate,
            String atchFileId, String updusrId) {
        this.title = title;
        this.content = content;
        this.newsOrigin = newsOrigin;
        this.noticeDate = noticeDate;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
