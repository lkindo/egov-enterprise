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
@Table(name = "TB_COM_CLSF_CD")
@SuperBuilder
public class CommonCodeCategory extends BaseEntity {

    @Id
    @Column(name = "CL_CODE", length = 3)
    private String clCode;

    @Column(name = "CL_CODE_NM", length = 180)
    private String clCodeNm;

    @Column(name = "CL_CODE_DC", length = 600)
    private String clCodeDc;

    @Column(name = "USE_YN", length = 1)
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
