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
 * 공통코드 엔티티 (CCMMNCODE 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_com_cd")
@SuperBuilder
public class CommonCodeGroup extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "cd_id", length = 18)
    @NonNull
    private String codeId;

    @Column(name = "cd_id_nm", length = 180)
    @NonNull
    private String codeIdNm;

    @Column(name = "cd_id_expln", length = 600)
    private String codeIdDc;

    @Column(name = "clsf_cd", length = 3)
    private String clCode;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    public CommonCodeGroup(@NonNull String codeId, @NonNull String codeIdNm, String codeIdDc, String clCode,
            String useYn,
            String frstRegisterId) {
        this.codeId = Objects.requireNonNull(codeId);
        this.codeIdNm = Objects.requireNonNull(codeIdNm);
        this.codeIdDc = codeIdDc;
        this.clCode = clCode;
        this.useYn = useYn == null ? "Y" : useYn;
        this.createdBy = frstRegisterId;
        this.lastModifiedBy = frstRegisterId;
    }

    public void update(@NonNull String codeIdNm, String codeIdDc, String useYn, String lastUpdusrId) {
        this.codeIdNm = Objects.requireNonNull(codeIdNm);
        this.codeIdDc = codeIdDc;
        this.useYn = useYn;
        this.lastModifiedBy = lastUpdusrId;
    }

    public void delete() {
        this.useYn = "N";
    }
}
