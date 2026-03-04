package com.company.project.domain.board;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NBBSMASTER")
@SecondaryTable(name = "NBBSMASTEROPTN", pkJoinColumns = @PrimaryKeyJoinColumn(name = "BBS_ID", referencedColumnName = "BBS_ID"))
public class BoardMaster {

    @Id
    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "BBS_NM", nullable = false, length = 765)
    private String bbsNm;

    @Column(name = "BBS_INTRCN", length = 7200)
    private String bbsIntrcn;

    @Column(name = "BBS_TY_CODE", length = 6, nullable = false)
    private String bbsTyCode;

    @Column(name = "BBS_ATTRB_CODE", length = 6, nullable = false)
    private String bbsAttrbCode;

    @Column(name = "REPLY_POSBL_AT", length = 1)
    private String replyPosblAt;

    @Column(name = "FILE_ATCH_POSBL_AT", length = 1, nullable = false)
    private String fileAtchPosblAt;

    @Column(name = "ATCH_POSBL_FILE_NUMBER", nullable = false)
    private Integer atchPosblFileNumber;

    @Column(name = "ATCH_POSBL_FILE_SIZE")
    private Long atchPosblFileSize;

    @Column(name = "USE_AT", nullable = false, length = 1)
    private String useAt;

    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM", nullable = false)
    private LocalDateTime createdDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Column(name = "BLOG_AT", length = 1)
    private String blogAt;

    @Column(name = "CMMNTY_ID", length = 20)
    private String cmmntyId;

    @Column(table = "NBBSMASTEROPTN", name = "ANSWER_AT", length = 1)
    private String commentAt;

    @Column(table = "NBBSMASTEROPTN", name = "STSFDG_AT", length = 1)
    private String stsfdgAt;

    @Builder
    public BoardMaster(String bbsId, String bbsNm, String bbsIntrcn, String bbsTyCode, String bbsAttrbCode,
            String replyPosblAt, String fileAtchPosblAt, Integer atchPosblFileNumber, Long atchPosblFileSize,
            String useAt, String tmplatId, String frstRegisterId, String lastUpdusrId, String blogId, String blogAt,
            String cmmntyId, String commentAt, String stsfdgAt) {
        this.bbsId = bbsId;
        this.bbsNm = bbsNm;
        this.bbsIntrcn = bbsIntrcn;
        this.bbsTyCode = bbsTyCode;
        this.bbsAttrbCode = bbsAttrbCode;
        this.replyPosblAt = replyPosblAt == null ? "N" : replyPosblAt;
        this.fileAtchPosblAt = fileAtchPosblAt == null ? "N" : fileAtchPosblAt;
        this.atchPosblFileNumber = atchPosblFileNumber == null ? 0 : atchPosblFileNumber;
        this.atchPosblFileSize = atchPosblFileSize;
        this.useAt = useAt == null ? "Y" : useAt;
        this.tmplatId = tmplatId;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = lastUpdusrId;
        this.createdDate = LocalDateTime.now();
        this.blogId = blogId;
        this.blogAt = blogAt == null ? "N" : blogAt;
        this.cmmntyId = cmmntyId;
        this.commentAt = commentAt == null ? "N" : commentAt;
        this.stsfdgAt = stsfdgAt == null ? "N" : stsfdgAt;
    }

    public void update(String bbsNm, String bbsIntrcn, String replyPosblAt, String fileAtchPosblAt,
            Integer atchPosblFileNumber, Long atchPosblFileSize, String tmplatId, String useAt, String lastUpdusrId,
            String commentAt, String stsfdgAt) {
        this.bbsNm = bbsNm;
        this.bbsIntrcn = bbsIntrcn;
        this.replyPosblAt = replyPosblAt;
        this.fileAtchPosblAt = fileAtchPosblAt;
        this.atchPosblFileNumber = atchPosblFileNumber;
        this.atchPosblFileSize = atchPosblFileSize;
        this.tmplatId = tmplatId;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
        this.commentAt = commentAt;
        this.stsfdgAt = stsfdgAt;
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void delete(String lastUpdusrId) {
        this.useAt = "N";
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void setBbsId(String bbsId) {
        this.bbsId = bbsId;
    }
}