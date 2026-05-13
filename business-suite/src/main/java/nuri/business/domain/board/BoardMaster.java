package nuri.business.domain.board;

import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.hibernate.annotations.DynamicUpdate;

import nuri.foundation.domain.common.BaseEntity;
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
@Table(name = "TB_BBS_MASTER")
@SecondaryTable(name = "TB_BBS_MASTER_OPTN", pkJoinColumns = @PrimaryKeyJoinColumn(name = "BBS_ID", referencedColumnName = "BBS_ID"))
@SuperBuilder
@DynamicUpdate
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

    @Column(name = "REPLY_POSBL_YN", length = 1)
    @Builder.Default
    private String replyPosblAt = "N";

    @Column(name = "FILE_ATCH_POSBL_YN", length = 1, nullable = false)
    @Builder.Default
    private String fileAtchPosblAt = "N";

    @Column(name = "ATCH_POSBL_FILE_NUMBER", nullable = false)
    @Builder.Default
    private Integer atchPosblFileNumber = 0;

    @Column(name = "ATCH_POSBL_FILE_SIZE")
    private Long atchPosblFileSize;

    @Column(name = "USE_YN", nullable = false, length = 1)
    @Builder.Default
    private String useAt = "Y";

    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Column(name = "BLOG_YN", length = 1)
    @Builder.Default
    private String blogAt = "N";

    @Column(name = "CMMNTY_ID", length = 20)
    private String cmmntyId;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "ANSWER_YN", length = 1)
    @Builder.Default
    private String commentAt = "N";

    @Column(table = "TB_BBS_MASTER_OPTN", name = "STSFDG_YN", length = 1)
    @Builder.Default
    private String stsfdgAt = "N";

    // TB_BBS_MASTER_OPTN 테이블의 NOT NULL 제약조건 해결을 위한 매핑 (Auditing 필드 중복 활용용)
    @Column(table = "TB_BBS_MASTER_OPTN", name = "FRST_RGTR_ID", length = 20, updatable = false)
    private String optnFrstRegisterId;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "CREAT_DT", updatable = false)
    private LocalDateTime optnFrstRegistPnttm;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "LAST_MDFR_ID", length = 20)
    private String optnLastUpdusrId;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "MDFCN_DT")
    private LocalDateTime optnLastUpdtPnttm;

    @PrePersist
    protected void onPrePersist() {
        if (this.optnFrstRegisterId == null) {
            this.optnFrstRegisterId = "webmaster";
        }
        if (this.optnFrstRegistPnttm == null) {
            this.optnFrstRegistPnttm = LocalDateTime.now();
        }
        if (this.optnLastUpdtPnttm == null) {
            this.optnLastUpdtPnttm = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onPreUpdate() {
        this.optnLastUpdtPnttm = LocalDateTime.now();
    }

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

    public void updateBbsNm(String bbsNm) { this.bbsNm = bbsNm; }
    public void updateBbsIntrcn(String bbsIntrcn) { this.bbsIntrcn = bbsIntrcn; }
    public void updateReplyPosblAt(String replyPosblAt) { this.replyPosblAt = replyPosblAt; }
    public void updateFileAtchPosblAt(String fileAtchPosblAt) { this.fileAtchPosblAt = fileAtchPosblAt; }
    public void updateAtchPosblFileNumber(Integer atchPosblFileNumber) { this.atchPosblFileNumber = atchPosblFileNumber; }
    public void updateAtchPosblFileSize(Long atchPosblFileSize) { this.atchPosblFileSize = atchPosblFileSize; }
    public void updateTmplatId(String tmplatId) { this.tmplatId = tmplatId; }
    public void updateUseAt(String useAt) { this.useAt = useAt; }
    public void updateCommentAt(String commentAt) { this.commentAt = commentAt; }
    public void updateStsfdgAt(String stsfdgAt) { this.stsfdgAt = stsfdgAt; }

    public void delete() {
        this.useAt = "N";
    }
}
