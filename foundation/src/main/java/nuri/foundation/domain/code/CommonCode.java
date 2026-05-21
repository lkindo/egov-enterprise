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
@Table(name = "tb_com_dtl_cd")
@SuperBuilder
public class CommonCode extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "cd_id", length = 18)
    @NonNull
    private String codeGroupId; // eGovFrame 기준 CODE_ID

    @Id
    @Column(name = "dtl_cd", length = 45)
    @NonNull
    private String code; // 상세코드

    @Column(name = "dtl_cd_nm", length = 180)
    @NonNull
    private String codeNm; // 상세코드명

    @Column(name = "dtl_cd_expln", length = 600)
    private String codeDc; // 상세코드설명

    @Column(name = "use_yn", length = 1)
    private String useYn; // 사용여부 (Y/N)

    public CommonCode(@NonNull String codeGroupId, @NonNull String code, @NonNull String codeNm, String codeDc,
            String useYn,
            String frstRegisterId) {
        this.codeGroupId = Objects.requireNonNull(codeGroupId);
        this.code = Objects.requireNonNull(code);
        this.codeNm = Objects.requireNonNull(codeNm);
        this.codeDc = codeDc;
        this.useYn = useYn == null ? "Y" : useYn;
        this.createdBy = frstRegisterId;
        this.lastModifiedBy = frstRegisterId;
    }

    public void update(@NonNull String codeNm, String codeDc, String useYn, String lastUpdusrId) {
        this.codeNm = Objects.requireNonNull(codeNm);
        this.codeDc = codeDc;
        this.useYn = useYn;
        this.lastModifiedBy = lastUpdusrId;
    }

    public void delete() {
        this.useYn = "N";
    }
}
