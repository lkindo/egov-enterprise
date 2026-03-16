package com.company.project.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NBBSMASTER")
@SecondaryTable(name = "NBBSMASTEROPTN", pkJoinColumns = @PrimaryKeyJoinColumn(name = "BBS_ID", referencedColumnName = "BBS_ID"))
@SuperBuilder
public class BoardMaster extends BaseEntity {

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
    @Builder.Default
    private String replyPosblAt = "N";

    @Column(name = "FILE_ATCH_POSBL_AT", length = 1, nullable = false)
    @Builder.Default
    private String fileAtchPosblAt = "N";

    @Column(name = "ATCH_POSBL_FILE_NUMBER", nullable = false)
    @Builder.Default
    private Integer atchPosblFileNumber = 0;

    @Column(name = "ATCH_POSBL_FILE_SIZE")
    private Long atchPosblFileSize;

    @Column(name = "USE_AT", nullable = false, length = 1)
    @Builder.Default
    private String useAt = "Y";

    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Column(name = "BLOG_AT", length = 1)
    @Builder.Default
    private String blogAt = "N";

    @Column(name = "CMMNTY_ID", length = 20)
    private String cmmntyId;

    @Column(table = "NBBSMASTEROPTN", name = "ANSWER_AT", length = 1)
    @Builder.Default
    private String commentAt = "N";

    @Column(table = "NBBSMASTEROPTN", name = "STSFDG_AT", length = 1)
    @Builder.Default
    private String stsfdgAt = "N";

    public void update(String bbsNm, String bbsIntrcn, String replyPosblAt, String fileAtchPosblAt,
            Integer atchPosblFileNumber, Long atchPosblFileSize, String tmplatId, String useAt,
            String commentAt, String stsfdgAt) {
        this.bbsNm = bbsNm;
        this.bbsIntrcn = bbsIntrcn;
        this.replyPosblAt = replyPosblAt;
        this.fileAtchPosblAt = fileAtchPosblAt;
        this.atchPosblFileNumber = atchPosblFileNumber;
        this.atchPosblFileSize = atchPosblFileSize;
        this.tmplatId = tmplatId;
        this.useAt = useAt;
        this.commentAt = commentAt;
        this.stsfdgAt = stsfdgAt;
    }

    public void delete() {
        this.useAt = "N";
    }
}
