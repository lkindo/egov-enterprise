package nuri.business.domain.code;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.util.Objects;

/**
 * 공통상세코드 엔티티 (CCMMNDETAILCODE 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@IdClass(CommonCodeId.class)
@Table(name = "tb_com_dtl_cd")
@SuperBuilder
public class CommonCode extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "cd_id", length = 20)
    @NonNull
    private String cdId; // eGovFrame 기준 CODE_ID -> cdId로 표준화

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cd_id", referencedColumnName = "cd_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private CommonCodeGroup commonCodeGroup;

    @Id
    @Column(name = "dtl_cd", length = 12)
    @NonNull
    private String dtlCd; // 상세코드 -> dtlCd로 표준화

    @Column(length = 100)
    @NonNull
    private String dtlCdNm; // 상세코드명 -> dtlCdNm으로 표준화

    @Column(length = 4000)
    private String dtlCdExpln; // 상세코드설명 -> dtlCdExpln으로 표준화

    @Column(length = 1)
    private String useYn; // 사용여부 (Y/N)

    public CommonCode(@NonNull String cdId, @NonNull String dtlCd, @NonNull String dtlCdNm, String dtlCdExpln,
            String useYn,
            String frstRegisterId) {
        this.cdId = Objects.requireNonNull(cdId);
        this.dtlCd = Objects.requireNonNull(dtlCd);
        this.dtlCdNm = Objects.requireNonNull(dtlCdNm);
        this.dtlCdExpln = dtlCdExpln;
        this.useYn = useYn == null ? "Y" : useYn;
        this.createdBy = frstRegisterId;
        this.lastModifiedBy = frstRegisterId;
    }

    public void update(@NonNull String dtlCdNm, String dtlCdExpln, String useYn, String lastUpdusrId) {
        this.dtlCdNm = Objects.requireNonNull(dtlCdNm);
        this.dtlCdExpln = dtlCdExpln;
        this.useYn = useYn;
        this.lastModifiedBy = lastUpdusrId;
    }

    public void delete() {
        this.useYn = "N";
    }
}
