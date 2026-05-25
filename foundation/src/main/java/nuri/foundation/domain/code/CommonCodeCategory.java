package nuri.foundation.domain.code;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 공통분류코드 엔티티 (CCMMNCLCODE 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_com_clsf_cd")
@SuperBuilder
public class CommonCodeCategory extends BaseEntity {

    @Id
    @Column(name = "clsf_cd", length = 12)
    private String clsfCd;

    @Column(length = 100)
    private String clsfCdNm;

    @Column(length = 4000)
    private String clsfCdExpln;

    @Column(length = 1)
    private String useYn;

    public CommonCodeCategory(String clsfCd, String clsfCdNm, String clsfCdExpln, String useYn, String frstRegisterId) {
        this.clsfCd = clsfCd;
        this.clsfCdNm = clsfCdNm;
        this.clsfCdExpln = clsfCdExpln;
        this.useYn = useYn == null ? "Y" : useYn;
        this.createdBy = frstRegisterId;
        this.lastModifiedBy = frstRegisterId;
    }

    public void update(String clsfCdNm, String clsfCdExpln, String useYn, String lastUpdusrId) {
        this.clsfCdNm = clsfCdNm;
        this.clsfCdExpln = clsfCdExpln;
        this.useYn = useYn;
        this.lastModifiedBy = lastUpdusrId;
    }

    public void delete() {
        this.useYn = "N";
    }
}
