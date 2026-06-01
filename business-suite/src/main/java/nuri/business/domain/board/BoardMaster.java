package nuri.business.domain.board;

import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.hibernate.annotations.DynamicUpdate;

import nuri.business.domain.common.BaseEntity;
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
@SuperBuilder
@DynamicUpdate
public class BoardMaster extends BaseEntity {

    @Id
    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @Column(nullable = false, length = 100)
    private String bbsTtl;

    @Column(length = 4000)
    private String bbsExpln;

    @Column(length = 12, nullable = false)
    private String bbsTypeCd;

    @Column(length = 12, nullable = false)
    private String bbsAtrbCd;

    @Column(length = 1)
    @Builder.Default
    private String ansPsbltyYn = "N";

    @Column(length = 1, nullable = false)
    @Builder.Default
    private String fileAtchPsbltyYn = "N";

    @Column(nullable = false)
    @Builder.Default
    private Integer atchPsbltyFileQty = 0;

    private Long atchPsbltyFileSz;

    @Column(nullable = false, length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(length = 20)
    private String tmpltId;

    @Column(length = 20)
    private String blogId;

    @Column(length = 1)
    @Builder.Default
    private String blogYn = "N";

    @Column(length = 20)
    private String cmntyId;

    // --- [OneToOne 지연 로딩 관계 전환] ---
    @OneToOne(mappedBy = "boardMaster", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private BoardMasterOption option;

    private void ensureOption() {
        if (this.option == null) {
            this.option = BoardMasterOption.builder()
                .boardMaster(this)
                .bbsId(this.bbsId)
                .ansYn(this.ansYn != null ? this.ansYn : "N")
                .stsfdgYn(this.stsfdgYn != null ? this.stsfdgYn : "N")
                .build();
        }
    }

    // --- [JPA Mapping & Transient Mirroring 동기화] ---
    @Column(name = "ans_yn", length = 1, nullable = false)
    @Builder.Default
    private String ansYn = "N";

    @Column(name = "stsfdg_yn", length = 1, nullable = false)
    @Builder.Default
    private String stsfdgYn = "N";

    @Transient
    private String optnFrstRgtrId;

    @Transient
    private LocalDateTime optnCrtDt;

    @Transient
    private String optnLastMdfrId;

    @Transient
    private LocalDateTime optnMdfcnDt;

    @PrePersist
    protected void onPrePersist() {
        ensureOption();
        if (this.ansYn != null) {
            this.option.setAnsYn(this.ansYn);
        }
        if (this.stsfdgYn != null) {
            this.option.setStsfdgYn(this.stsfdgYn);
        }
        if (this.optnFrstRgtrId != null) {
            this.option.setCreatedBy(this.optnFrstRgtrId);
        } else {
            this.option.setCreatedBy(this.getCreatedBy() != null ? this.getCreatedBy() : "webmaster");
        }
        if (this.optnCrtDt != null) {
            this.option.setCrtDt(this.optnCrtDt);
        } else {
            this.option.setCrtDt(this.getCrtDt() != null ? this.getCrtDt() : LocalDateTime.now());
        }
        if (this.optnLastMdfrId != null) {
            this.option.setLastModifiedBy(this.optnLastMdfrId);
        } else {
            this.option.setLastModifiedBy(this.getLastModifiedBy() != null ? this.getLastModifiedBy() : "webmaster");
        }
        if (this.optnMdfcnDt != null) {
            this.option.setMdfcnDt(this.optnMdfcnDt);
        } else {
            this.option.setMdfcnDt(LocalDateTime.now());
        }
    }

    @PreUpdate
    protected void onPreUpdate() {
        ensureOption();
        if (this.ansYn != null) {
            this.option.setAnsYn(this.ansYn);
        }
        if (this.stsfdgYn != null) {
            this.option.setStsfdgYn(this.stsfdgYn);
        }
        if (this.optnLastMdfrId != null) {
            this.option.setLastModifiedBy(this.optnLastMdfrId);
        } else {
            this.option.setLastModifiedBy(this.getLastModifiedBy() != null ? this.getLastModifiedBy() : "webmaster");
        }
        this.option.setMdfcnDt(LocalDateTime.now());
    }

    @PostLoad
    protected void onPostLoad() {
        if (this.option != null) {
            this.ansYn = this.option.getAnsYn();
            this.stsfdgYn = this.option.getStsfdgYn();
            this.optnFrstRgtrId = this.option.getCreatedBy();
            this.optnCrtDt = this.option.getCrtDt();
            this.optnLastMdfrId = this.option.getLastModifiedBy();
            this.optnMdfcnDt = this.option.getMdfcnDt();
        }
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public String getAnsYn() {
        return this.ansYn != null ? this.ansYn : "N";
    }

    public void setAnsYn(String ansYn) {
        this.ansYn = ansYn;
        ensureOption();
        this.option.setAnsYn(ansYn);
    }

    public String getStsfdgYn() {
        return this.stsfdgYn != null ? this.stsfdgYn : "N";
    }

    public void setStsfdgYn(String stsfdgYn) {
        this.stsfdgYn = stsfdgYn;
        ensureOption();
        this.option.setStsfdgYn(stsfdgYn);
    }

    public String getOptnFrstRegisterId() {
        if (this.option != null) {
            return this.option.getCreatedBy();
        }
        return this.optnFrstRgtrId;
    }

    public void setOptnFrstRegisterId(String v) {
        this.optnFrstRgtrId = v;
        ensureOption();
        this.option.setCreatedBy(v);
    }

    public LocalDateTime getOptnFrstRegistPnttm() {
        if (this.option != null) {
            return this.option.getCrtDt();
        }
        return this.optnCrtDt;
    }

    public void setOptnFrstRegistPnttm(LocalDateTime v) {
        this.optnCrtDt = v;
        ensureOption();
        this.option.setCrtDt(v);
    }

    public String getOptnLastUpdusrId() {
        if (this.option != null) {
            return this.option.getLastModifiedBy();
        }
        return this.optnLastMdfrId;
    }

    public void setOptnLastUpdusrId(String v) {
        this.optnLastMdfrId = v;
        ensureOption();
        this.option.setLastModifiedBy(v);
    }

    public LocalDateTime getOptnLastUpdtPnttm() {
        if (this.option != null) {
            return this.option.getMdfcnDt();
        }
        return this.optnMdfcnDt;
    }

    public void setOptnLastUpdtPnttm(LocalDateTime v) {
        this.optnMdfcnDt = v;
        ensureOption();
        this.option.setMdfcnDt(v);
    }

    public static abstract class BoardMasterBuilder<C extends BoardMaster, B extends BoardMasterBuilder<C, B>> extends BaseEntityBuilder<C, B> {

        public B optnFrstRegisterId(String v) {
            return this.optnFrstRgtrId(v);
        }
        public B optnFrstRegistPnttm(LocalDateTime v) {
            return this.optnCrtDt(v);
        }
        public B optnLastUpdusrId(String v) {
            return this.optnLastMdfrId(v);
        }
        public B optnLastUpdtPnttm(LocalDateTime v) {
            return this.optnMdfcnDt(v);
        }
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
        this.setAnsYn(ansYn);
        this.setStsfdgYn(stsfdgYn);
    }

    public void updateBbsTtl(String bbsTtl) { this.bbsTtl = bbsTtl; }
    public void updateBbsExpln(String bbsExpln) { this.bbsExpln = bbsExpln; }
    public void updateAnsPsbltyYn(String ansPsbltyYn) { this.ansPsbltyYn = ansPsbltyYn; }
    public void updateFileAtchPsbltyYn(String fileAtchPsbltyYn) { this.fileAtchPsbltyYn = fileAtchPsbltyYn; }
    public void updateAtchPsbltyFileQty(Integer atchPsbltyFileQty) { this.atchPsbltyFileQty = atchPsbltyFileQty; }
    public void updateAtchPsbltyFileSz(Long atchPsbltyFileSz) { this.atchPsbltyFileSz = atchPsbltyFileSz; }
    public void updateTmpltId(String tmpltId) { this.tmpltId = tmpltId; }
    public void updateUseYn(String useYn) { this.useYn = useYn; }
    public void updateAnsYn(String ansYn) { this.setAnsYn(ansYn); }
    public void updateStsfdgYn(String stsfdgYn) { this.setStsfdgYn(stsfdgYn); }

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
    public String getCommentAt() { return getAnsYn(); }
    public String getStsfdgAt() { return getStsfdgYn(); }
    public String getBbsAttrCd() { return bbsAtrbCd; }
    public String getReplyPsblYn() { return ansPsbltyYn; }
}
