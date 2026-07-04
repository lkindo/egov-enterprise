package nuri.business.domain.board;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.Filter;

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
@Filter(name = "softDeleteFilter", condition = "use_yn = :useYn")
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

    // --- [JPA Mapping] ---
    // ansYn/stsfdgYn 은 물리적으로 tb_bbs_master 가 아니라 tb_bbs_master_optn(= option 연관)에만 존재한다.
    // 과거엔 tb_bbs_master 의 컬럼으로 매핑돼 있어 실제 스키마 조회/저장 시
    // `column "ans_yn" of relation "tb_bbs_master" does not exist` 로 게시판 마스터 기능이 죽었다.
    // 이제 @Transient 로 두어 영속화는 option 을 통해서만 하고, 로드 후 @PostLoad 로 값을 채운다.
    @Transient
    @Builder.Default
    private String ansYn = "N";

    @Transient
    @Builder.Default
    private String stsfdgYn = "N";

    /** 로드 시 tb_bbs_master_optn 의 값으로 편의 필드를 채운다(쓰기 경로는 option 을 직접 갱신). */
    @PostLoad
    private void syncOptionFlags() {
        if (this.option != null) {
            this.ansYn = this.option.getAnsYn() != null ? this.option.getAnsYn() : "N";
            this.stsfdgYn = this.option.getStsfdgYn() != null ? this.option.getStsfdgYn() : "N";
        }
    }

    public void registerOption(String ansYn, String stsfdgYn) {
        this.ansYn = ansYn != null ? ansYn : "N";
        this.stsfdgYn = stsfdgYn != null ? stsfdgYn : "N";
        this.option = BoardMasterOption.builder()
                .boardMaster(this)
                .bbsId(this.bbsId)
                .ansYn(this.ansYn)
                .stsfdgYn(this.stsfdgYn)
                .build();
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

        if (this.option != null) {
            this.option.setAnsYn(ansYn != null ? ansYn : "N");
            this.option.setStsfdgYn(stsfdgYn != null ? stsfdgYn : "N");
        } else {
            registerOption(ansYn, stsfdgYn);
        }
    }

    public void updateBbsTtl(String bbsTtl) { this.bbsTtl = bbsTtl; }
    public void updateBbsExpln(String bbsExpln) { this.bbsExpln = bbsExpln; }
    public void updateAnsPsbltyYn(String ansPsbltyYn) { this.ansPsbltyYn = ansPsbltyYn; }
    public void updateFileAtchPsbltyYn(String fileAtchPsbltyYn) { this.fileAtchPsbltyYn = fileAtchPsbltyYn; }
    public void updateAtchPsbltyFileQty(Integer atchPsbltyFileQty) { this.atchPsbltyFileQty = atchPsbltyFileQty; }
    public void updateAtchPsbltyFileSz(Long atchPsbltyFileSz) { this.atchPsbltyFileSz = atchPsbltyFileSz; }
    public void updateTmpltId(String tmpltId) { this.tmpltId = tmpltId; }
    public void updateUseYn(String useYn) { this.useYn = useYn; }
    public void updateAnsYn(String ansYn) { 
        this.ansYn = ansYn; 
        if (this.option != null) {
            this.option.setAnsYn(ansYn);
        }
    }
    public void updateStsfdgYn(String stsfdgYn) { 
        this.stsfdgYn = stsfdgYn; 
        if (this.option != null) {
            this.option.setStsfdgYn(stsfdgYn);
        }
    }

    public void delete() {
        this.useYn = "N";
    }
}
