package nuri.foundation.domain.common;
// Force re-scan

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;

/**
 * 기본 생성/수정자 메타데이터 엔티티
 * [Standardization] CreatedBy -> frstRegisterId, LastModifiedBy -> lastUpdusrId 별칭 제공
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@MappedSuperclass
public abstract class BaseEntity extends BaseTimeEntity {

    @CreatedBy
    @Column(name = "frst_rgtr_id", updatable = false, length = 20)
    protected String createdBy;

    @LastModifiedBy
    @Column(name = "last_mdfr_id", length = 20)
    protected String lastModifiedBy;

    // ----- [Legacy Aliases] -----

    public String getFrstRegisterId() {
        return createdBy;
    }

    public String getLastUpdusrId() {
        return lastModifiedBy;
    }

    public void setFrstRegisterId(String id) {
        this.createdBy = id;
    }

    public void setLastUpdusrId(String id) {
        this.lastModifiedBy = id;
    }
}
