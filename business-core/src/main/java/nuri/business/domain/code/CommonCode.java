package nuri.business.domain.code;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
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
    @Column(length = 12)
    @NonNull
    private String dtlCd; // 상세코드 -> dtlCd로 표준화

    @Column(length = 100)
    @NonNull
    private String dtlCdNm; // 상세코드명 -> dtlCdNm으로 표준화

    @Column(length = 4000)
    private String dtlCdExpln; // 상세코드설명 -> dtlCdExpln으로 표준화

    @Column(length = 1)
    private String useYn; // 사용여부 (Y/N)

    /**
     * 빌더 기반 정적 팩토리.
     * 기존 CommonCode.builder()...build() 호출부와 100% 동일하게 동작한다.
     * 감사 필드(frstRgtrId/lastMdfrId)는 JPA Auditing 이 채우므로 파라미터에서 제외한다.
     */
    @Builder
    private static CommonCode create(@NonNull String cdId, @NonNull String dtlCd, @NonNull String dtlCdNm,
            String dtlCdExpln, String useYn) {
        return new CommonCode(cdId, dtlCd, dtlCdNm, dtlCdExpln, useYn);
    }

    private CommonCode(@NonNull String cdId, @NonNull String dtlCd, @NonNull String dtlCdNm, String dtlCdExpln,
            String useYn) {
        this.cdId = cdId;
        this.dtlCd = dtlCd;
        this.dtlCdNm = dtlCdNm;
        this.dtlCdExpln = dtlCdExpln;
        this.useYn = useYn == null ? "Y" : useYn;
    }

    public void update(@NonNull String dtlCdNm, String dtlCdExpln, String useYn, String lastUpdusrId) {
        this.dtlCdNm = Objects.requireNonNull(dtlCdNm);
        this.dtlCdExpln = dtlCdExpln;
        this.useYn = useYn;
        this.lastMdfrId = lastUpdusrId;
    }

    public void delete() {
        this.useYn = "N";
    }
}
