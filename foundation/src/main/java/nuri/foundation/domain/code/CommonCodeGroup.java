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
    @Column(name = "cd_id", length = 20)
    @NonNull
    private String cdId;

    @Column(name = "cd_id_nm", length = 100)
    @NonNull
    private String cdIdNm;

    @Column(name = "cd_id_expln", length = 4000)
    private String cdIdExpln;

    @Column(name = "clsf_cd", length = 12)
    private String clsfCd;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    public CommonCodeGroup(@NonNull String cdId, @NonNull String cdIdNm, String cdIdExpln, String clsfCd,
            String useYn,
            String frstRegisterId) {
        this.cdId = Objects.requireNonNull(cdId);
        this.cdIdNm = Objects.requireNonNull(cdIdNm);
        this.cdIdExpln = cdIdExpln;
        this.clsfCd = clsfCd;
        this.useYn = useYn == null ? "Y" : useYn;
        this.createdBy = frstRegisterId;
        this.lastModifiedBy = frstRegisterId;
    }

    public void update(@NonNull String cdIdNm, String cdIdExpln, String useYn, String lastUpdusrId) {
        this.cdIdNm = Objects.requireNonNull(cdIdNm);
        this.cdIdExpln = cdIdExpln;
        this.useYn = useYn;
        this.lastModifiedBy = lastUpdusrId;
    }

    public void delete() {
        this.useYn = "N";
    }
}
