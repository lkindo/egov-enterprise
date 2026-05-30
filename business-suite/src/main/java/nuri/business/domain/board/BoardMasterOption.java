package nuri.business.domain.board;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "tb_bbs_master_optn")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@AttributeOverrides({
    @AttributeOverride(name = "createdBy", column = @Column(name = "frst_rgtr_id", updatable = false, length = 20)),
    @AttributeOverride(name = "lastModifiedBy", column = @Column(name = "last_mdfr_id", length = 20)),
    @AttributeOverride(name = "crtDt", column = @Column(name = "crt_dt", updatable = false)),
    @AttributeOverride(name = "mdfcnDt", column = @Column(name = "mdfcn_dt"))
})
public class BoardMasterOption extends BaseEntity {

    @Id
    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "bbs_id")
    private BoardMaster boardMaster;

    @Column(name = "ans_yn", length = 1, nullable = false)
    @Builder.Default
    private String ansYn = "N";

    @Column(name = "stsfdg_yn", length = 1, nullable = false)
    @Builder.Default
    private String stsfdgYn = "N";

    @PrePersist
    protected void onCreateOption() {
        if (this.ansYn == null) {
            this.ansYn = "N";
        }
        if (this.stsfdgYn == null) {
            this.stsfdgYn = "N";
        }
        if (this.getCreatedBy() == null) {
            this.setCreatedBy("webmaster");
        }
        if (this.getLastModifiedBy() == null) {
            this.setLastModifiedBy("webmaster");
        }
    }
}
