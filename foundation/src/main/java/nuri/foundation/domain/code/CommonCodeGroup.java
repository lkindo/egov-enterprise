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
@Table(name = "TB_COM_CD")
@SuperBuilder
public class CommonCodeGroup extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "CODE_ID", length = 18)
    @NonNull
    private String codeId;

    @Column(name = "CODE_ID_NM", length = 180)
    @NonNull
    private String codeIdNm;

    @Column(name = "CODE_ID_DC", length = 600)
    private String codeIdDc;

    @Column(name = "CL_CODE", length = 3)
    private String clCode;

    @Column(name = "USE_YN", length = 1)
    private String useAt;

    public CommonCodeGroup(@NonNull String codeId, @NonNull String codeIdNm, String codeIdDc, String clCode,
            String useAt,
            String frstRegisterId) {
        this.codeId = Objects.requireNonNull(codeId);
        this.codeIdNm = Objects.requireNonNull(codeIdNm);
        this.codeIdDc = codeIdDc;
        this.clCode = clCode;
        this.useAt = useAt == null ? "Y" : useAt;
        this.createdBy = frstRegisterId;
        this.lastModifiedBy = frstRegisterId;
    }

    public void update(@NonNull String codeIdNm, String codeIdDc, String useAt, String lastUpdusrId) {
        this.codeIdNm = Objects.requireNonNull(codeIdNm);
        this.codeIdDc = codeIdDc;
        this.useAt = useAt;
        this.lastModifiedBy = lastUpdusrId;
    }

    public void delete() {
        this.useAt = "N";
    }
}
