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
    private String clCode;

    @Column(name = "clsf_cd_nm", length = 100)
    private String clCodeNm;

    @Column(name = "clsf_cd_expln", length = 4000)
    private String clCodeDc;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    public CommonCodeCategory(String clCode, String clCodeNm, String clCodeDc, String useYn, String frstRegisterId) {
        this.clCode = clCode;
        this.clCodeNm = clCodeNm;
        this.clCodeDc = clCodeDc;
        this.useYn = useYn == null ? "Y" : useYn;
        this.createdBy = frstRegisterId;
        this.lastModifiedBy = frstRegisterId;
    }

    public void update(String clCodeNm, String clCodeDc, String useYn, String lastUpdusrId) {
        this.clCodeNm = clCodeNm;
        this.clCodeDc = clCodeDc;
        this.useYn = useYn;
        this.lastModifiedBy = lastUpdusrId;
    }

    public void delete() {
        this.useYn = "N";
    }
}
