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
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

@Getter
@Setter
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

    @Column(name = "BBS_TTL", nullable = false, length = 100)
    private String bbsTtl;

    @Column(name = "BBS_EXPLN", length = 4000)
    private String bbsExpln;

    @Column(name = "BBS_TYPE_CD", length = 12, nullable = false)
    private String bbsTypeCd;

    @Column(name = "BBS_ATRB_CD", length = 12, nullable = false)
    private String bbsAtrbCd;

    @Column(name = "ANS_PSBLTY_YN", length = 1)
    @Builder.Default
    private String ansPsblYn = "N";

    @Column(name = "FILE_ATCH_PSBLTY_YN", length = 1, nullable = false)
    @Builder.Default
    private String fileAtchPsblYn = "N";

    @Column(name = "ATCH_PSBLTY_FILE_QTY", nullable = false)
    @Builder.Default
    private Integer atchPsblFileCnt = 0;

    @Column(name = "ATCH_PSBLTY_FILE_SZ")
    private Long atchPsblFileSize;

    @Column(name = "USE_YN", nullable = false, length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "TMPLT_ID", length = 20)
    private String tmplatId;

    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Column(name = "BLOG_YN", length = 1)
    @Builder.Default
    private String blogYn = "N";

    @Column(name = "CMNTY_ID", length = 20)
    private String cmntyId;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "ANS_YN", length = 1)
    @Builder.Default
    private String commentYn = "N";

    @Column(table = "TB_BBS_MASTER_OPTN", name = "STSFDG_YN", length = 1)
    @Builder.Default
    private String stsfdgYn = "N";

    // TB_BBS_MASTER_OPTN 테이블의 NOT NULL 제약조건 해결을 위한 매핑 (Auditing 필드 중복 활용용)
    @Column(table = "TB_BBS_MASTER_OPTN", name = "FRST_RGTR_ID", length = 20, updatable = false)
    private String optnFrstRegisterId;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "CRT_DT", updatable = false)
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

    public void update(String bbsTtl, String bbsExpln, String ansPsblYn, String fileAtchPsblYn,
            Integer atchPsblFileCnt, Long atchPsblFileSize, String tmplatId, String useYn,
            String commentYn, String stsfdgYn) {
        this.bbsTtl = bbsTtl;
        this.bbsExpln = bbsExpln;
        this.ansPsblYn = ansPsblYn;
        this.fileAtchPsblYn = fileAtchPsblYn;
        this.atchPsblFileCnt = atchPsblFileCnt;
        this.atchPsblFileSize = atchPsblFileSize;
        this.tmplatId = tmplatId;
        this.useYn = useYn;
        this.commentYn = commentYn;
        this.stsfdgYn = stsfdgYn;
    }

    public void updateBbsTtl(String bbsTtl) { this.bbsTtl = bbsTtl; }
    public void updateBbsExpln(String bbsExpln) { this.bbsExpln = bbsExpln; }
    public void updateAnsPsblYn(String ansPsblYn) { this.ansPsblYn = ansPsblYn; }
    public void updateFileAtchPsblYn(String fileAtchPsblYn) { this.fileAtchPsblYn = fileAtchPsblYn; }
    public void updateAtchPsblFileCnt(Integer atchPsblFileCnt) { this.atchPsblFileCnt = atchPsblFileCnt; }
    public void updateAtchPsblFileSize(Long atchPsblFileSize) { this.atchPsblFileSize = atchPsblFileSize; }
    public void updateTmplatId(String tmplatId) { this.tmplatId = tmplatId; }
    public void updateUseYn(String useYn) { this.useYn = useYn; }
    public void updateCommentYn(String commentYn) { this.commentYn = commentYn; }
    public void updateStsfdgYn(String stsfdgYn) { this.stsfdgYn = stsfdgYn; }

    public void delete() {
        this.useYn = "N";
    }

    // legacy
    public String getBbsNm() { return bbsTtl; }
    public String getBbsTyCode() { return bbsTypeCd; }
    public String getBbsAttrbCode() { return bbsAtrbCd; }
    public String getReplyPosblAt() { return ansPsblYn; }
    public String getFileAtchPosblAt() { return fileAtchPsblYn; }
    public Integer getAtchPosblFileNumber() { return atchPsblFileCnt; }
    public String getBbsIntrcn() { return bbsExpln; }
    public String getTmpltId() { return tmplatId; }
    public Long getAtchPosblFileSize() { return atchPsblFileSize; }
    public String getCommentAt() { return commentYn; }
    public String getStsfdgAt() { return stsfdgYn; }
    public String getBbsAttrCd() { return bbsAtrbCd; }
    public String getReplyPsblYn() { return ansPsblYn; }
}
