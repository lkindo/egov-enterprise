package nuri.business.domain.scrap;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 스크랩 정보 Entity (v5 standardized)
 * 매핑 테이블: TB_BBS_SCRAP
 */
@Entity
@Table(name = "tb_bbs_scrap")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Scrap extends BaseEntity {

    @Id
    @Column(name = "scrap_id", length = 20)
    private String scrapId;

    @Column(length = 20)
    private String bbsId;

    @Column(name = "pst_id", length = 20)
    private String pstId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pst_id", referencedColumnName = "pst_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.board.Board board;

    @Column(length = 100)
    private String scrapNm;

    @Column(length = 1000)
    private String scrapUrl;

    @Column(length = 4000)
    private String scrapExpln;

    @Column(length = 1)
    @Builder.Default
    private String useYn = "Y";
    public void update(String scrapNm, String scrapUrl, String scrapExpln, String useYn) {
        this.scrapNm = scrapNm;
        this.scrapUrl = scrapUrl;
        this.scrapExpln = scrapExpln;
        this.useYn = useYn;
    }


    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
