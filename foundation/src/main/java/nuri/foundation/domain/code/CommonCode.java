package nuri.foundation.domain.code;

import nuri.foundation.domain.common.BaseEntity;
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
@Table(name = "TB_COM_DTL_CD")
@SuperBuilder
public class CommonCode extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "CD_ID", length = 18)
    @NonNull
    private String codeGroupId; // eGovFrame 기준 CODE_ID

    @Id
    @Column(name = "DTL_CD", length = 45)
    @NonNull
    private String code; // 상세코드

    @Column(name = "DTL_CD_NM", length = 180)
    @NonNull
    private String codeNm; // 상세코드명

    @Column(name = "DTL_CD_EXPLN", length = 600)
    private String codeDc; // 상세코드설명

    @Column(name = "USE_YN", length = 1)
    private String useAt; // 사용여부 (Y/N)

    public CommonCode(@NonNull String codeGroupId, @NonNull String code, @NonNull String codeNm, String codeDc,
            String useAt,
            String frstRegisterId) {
        this.codeGroupId = Objects.requireNonNull(codeGroupId);
        this.code = Objects.requireNonNull(code);
        this.codeNm = Objects.requireNonNull(codeNm);
        this.codeDc = codeDc;
        this.useAt = useAt == null ? "Y" : useAt;
        this.createdBy = frstRegisterId;
        this.lastModifiedBy = frstRegisterId;
    }

    public void update(@NonNull String codeNm, String codeDc, String useAt, String lastUpdusrId) {
        this.codeNm = Objects.requireNonNull(codeNm);
        this.codeDc = codeDc;
        this.useAt = useAt;
        this.lastModifiedBy = lastUpdusrId;
    }

    public void delete() {
        this.useAt = "N";
    }
}
