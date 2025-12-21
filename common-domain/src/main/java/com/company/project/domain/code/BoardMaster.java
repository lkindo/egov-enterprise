package com.company.project.domain.code;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NBBSMASTER")
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

    @Column(name = "USE_AT", nullable = false, length = 1)
    private String useAt;

    @Column(name = "FRST_REGIST_PNTTM", nullable = false)
    private java.time.LocalDateTime createdDate;

    @Builder
    public BoardMaster(String bbsId, String bbsNm, String bbsIntrcn, String bbsTyCode, String bbsAttrbCode,
            String replyPosblAt, String fileAtchPosblAt, Integer atchPosblFileNumber, String useAt) {
        this.bbsId = bbsId;
        this.bbsNm = bbsNm;
        this.bbsIntrcn = bbsIntrcn;
        this.bbsTyCode = bbsTyCode;
        this.bbsAttrbCode = bbsAttrbCode;
        this.replyPosblAt = replyPosblAt == null ? "N" : replyPosblAt;
        this.fileAtchPosblAt = fileAtchPosblAt == null ? "N" : fileAtchPosblAt;
        this.atchPosblFileNumber = atchPosblFileNumber == null ? 0 : atchPosblFileNumber;
        this.useAt = useAt == null ? "Y" : useAt;
        this.createdDate = java.time.LocalDateTime.now();
    }

    public void update(String bbsNm, String bbsIntrcn, String replyPosblAt, String fileAtchPosblAt,
            Integer atchPosblFileNumber, String useAt) {
        this.bbsNm = bbsNm;
        this.bbsIntrcn = bbsIntrcn;
        this.replyPosblAt = replyPosblAt;
        this.fileAtchPosblAt = fileAtchPosblAt;
        this.atchPosblFileNumber = atchPosblFileNumber;
        this.useAt = useAt;
    }
}
