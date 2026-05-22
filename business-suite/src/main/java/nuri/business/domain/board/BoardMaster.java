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
@Table(name = "tb_bbs_master")
@SecondaryTable(name = "TB_BBS_MASTER_OPTN", pkJoinColumns = @PrimaryKeyJoinColumn(name = "BBS_ID", referencedColumnName = "BBS_ID"))
@SuperBuilder
@DynamicUpdate
public class BoardMaster extends BaseEntity {

    @Id
    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @Column(name = "bbs_ttl", nullable = false, length = 100)
    private String bbsTtl;

    @Column(name = "bbs_expln", length = 4000)
    private String bbsExpln;

    @Column(name = "bbs_type_cd", length = 12, nullable = false)
    private String bbsTypeCd;

    @Column(name = "bbs_atrb_cd", length = 12, nullable = false)
    private String bbsAtrbCd;

    @Column(name = "ans_psblty_yn", length = 1)
    @Builder.Default
    private String ansPsbltyYn = "N";

    @Column(name = "file_atch_psblty_yn", length = 1, nullable = false)
    @Builder.Default
    private String fileAtchPsbltyYn = "N";

    @Column(name = "atch_psblty_file_qty", nullable = false)
    @Builder.Default
    private Integer atchPsbltyFileQty = 0;

    @Column(name = "atch_psblty_file_sz")
    private Long atchPsbltyFileSz;

    @Column(name = "use_yn", nullable = false, length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "tmplt_id", length = 20)
    private String tmpltId;

    @Column(name = "blog_id", length = 20)
    private String blogId;

    @Column(name = "blog_yn", length = 1)
    @Builder.Default
    private String blogYn = "N";

    @Column(name = "cmnty_id", length = 20)
    private String cmntyId;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "ans_yn", length = 1)
    @Builder.Default
    private String ansYn = "N";

    @Column(table = "TB_BBS_MASTER_OPTN", name = "stsfdg_yn", length = 1)
    @Builder.Default
    private String stsfdgYn = "N";

    // TB_BBS_MASTER_OPTN 테이블의 NOT NULL 제약조건 해결을 위한 매핑 (Auditing 필드 중복 활용용)
    @Column(table = "TB_BBS_MASTER_OPTN", name = "frst_rgtr_id", length = 20, updatable = false)
    private String optnFrstRegisterId;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "crt_dt", updatable = false)
    private LocalDateTime optnFrstRegistPnttm;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "last_mdfr_id", length = 20)
    private String optnLastUpdusrId;

    @Column(table = "TB_BBS_MASTER_OPTN", name = "mdfcn_dt")
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

    public void update(String bbsTtl, String bbsExpln, String ansPsbltyYn, String fileAtchPsbltyYn,
            Integer atchPsbltyFileQty, Long atchPsbltyFileSz, String tmpltId, String useYn,
            String ansYn, String stsfdgYn) {
        this.bbsTtl = bbsTtl;
        this.bbsExpln = bbsExpln;
        this.ansPsbltyYn = ansPsbltyYn;
        this.fileAtchPsbltyYn = fileAtchPsbltyYn;
        this.atchPsbltyFileQty = atchPsbltyFileQty;
        this.atchPsbltyFileSz = atchPsbltyFileSz;
        this.tmpltId = tmpltId;
        this.useYn = useYn;
        this.ansYn = ansYn;
        this.stsfdgYn = stsfdgYn;
    }

    public void updateBbsTtl(String bbsTtl) { this.bbsTtl = bbsTtl; }
    public void updateBbsExpln(String bbsExpln) { this.bbsExpln = bbsExpln; }
    public void updateAnsPsbltyYn(String ansPsbltyYn) { this.ansPsbltyYn = ansPsbltyYn; }
    public void updateFileAtchPsbltyYn(String fileAtchPsbltyYn) { this.fileAtchPsbltyYn = fileAtchPsbltyYn; }
    public void updateAtchPsbltyFileQty(Integer atchPsbltyFileQty) { this.atchPsbltyFileQty = atchPsbltyFileQty; }
    public void updateAtchPsbltyFileSz(Long atchPsbltyFileSz) { this.atchPsbltyFileSz = atchPsbltyFileSz; }
    public void updateTmpltId(String tmpltId) { this.tmpltId = tmpltId; }
    public void updateUseYn(String useYn) { this.useYn = useYn; }
    public void updateAnsYn(String ansYn) { this.ansYn = ansYn; }
    public void updateStsfdgYn(String stsfdgYn) { this.stsfdgYn = stsfdgYn; }

    public void delete() {
        this.useYn = "N";
    }

    // legacy
    public String getBbsNm() { return bbsTtl; }
    public String getBbsTyCode() { return bbsTypeCd; }
    public String getBbsAttrbCode() { return bbsAtrbCd; }
    public String getReplyPosblAt() { return ansPsbltyYn; }
    public String getFileAtchPosblAt() { return fileAtchPsbltyYn; }
    public Integer getAtchPosblFileNumber() { return atchPsbltyFileQty; }
    public String getBbsIntrcn() { return bbsExpln; }
    public String getTmpltId() { return tmpltId; }
    public Long getAtchPosblFileSize() { return atchPsbltyFileSz; }
    public String getCommentAt() { return ansYn; }
    public String getStsfdgAt() { return stsfdgYn; }
    public String getBbsAttrCd() { return bbsAtrbCd; }
    public String getReplyPsblYn() { return ansPsbltyYn; }
}
