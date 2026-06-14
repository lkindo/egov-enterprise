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

public class BoardMasterOption extends BaseEntity {

    @Id
    @Column(length = 20)
    private String bbsId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "bbs_id")
    private BoardMaster boardMaster;

    @Column(length = 1, nullable = false)
    @Builder.Default
    private String ansYn = "N";

    @Column(length = 1, nullable = false)
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
        if (this.getFrstRgtrId() == null) {
            this.setFrstRgtrId("webmaster");
        }
        if (this.getLastMdfrId() == null) {
            this.setLastMdfrId("webmaster");
        }
    }
}
