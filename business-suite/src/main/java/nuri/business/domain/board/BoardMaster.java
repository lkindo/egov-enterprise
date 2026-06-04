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
            this.option.setFrstRgtrId(this.optnFrstRgtrId);
        } else {
            this.optnFrstRgtrId = this.getFrstRgtrId() != null ? this.getFrstRgtrId() : "webmaster";
            this.option.setFrstRgtrId(this.optnFrstRgtrId);
        }
        if (this.optnCrtDt != null) {
            this.option.setCrtDt(this.optnCrtDt);
        } else {
            this.optnCrtDt = this.getCrtDt() != null ? this.getCrtDt() : LocalDateTime.now();
            this.option.setCrtDt(this.optnCrtDt);
        }
        if (this.optnLastMdfrId != null) {
            this.option.setLastMdfrId(this.optnLastMdfrId);
        } else {
            this.optnLastMdfrId = this.getLastMdfrId() != null ? this.getLastMdfrId() : "webmaster";
            this.option.setLastMdfrId(this.optnLastMdfrId);
        }
        if (this.optnMdfcnDt != null) {
            this.option.setMdfcnDt(this.optnMdfcnDt);
        } else {
            this.optnMdfcnDt = LocalDateTime.now();
            this.option.setMdfcnDt(this.optnMdfcnDt);
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
            this.option.setLastMdfrId(this.optnLastMdfrId);
        } else {
            this.optnLastMdfrId = this.getLastMdfrId() != null ? this.getLastMdfrId() : "webmaster";
            this.option.setLastMdfrId(this.optnLastMdfrId);
        }
        this.optnMdfcnDt = LocalDateTime.now();
        this.option.setMdfcnDt(this.optnMdfcnDt);
    }

    @PostLoad
    protected void onPostLoad() {
        if (this.option != null) {
            this.ansYn = this.option.getAnsYn();
            this.stsfdgYn = this.option.getStsfdgYn();
            this.optnFrstRgtrId = this.option.getFrstRgtrId();
            this.optnCrtDt = this.option.getCrtDt();
            this.optnLastMdfrId = this.option.getLastMdfrId();
            this.optnMdfcnDt = this.option.getMdfcnDt();
        }
    }

    // 레거시 별칭 완전 철폐 (표준화 동기화)

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
}
