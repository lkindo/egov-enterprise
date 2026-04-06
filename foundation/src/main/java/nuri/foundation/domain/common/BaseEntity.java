package nuri.foundation.domain.common;

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
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@MappedSuperclass
public abstract class BaseEntity extends BaseTimeEntity {

    @CreatedBy
    @Column(name = "FRST_REGISTER_ID", updatable = false, length = 20)
    protected String createdBy;

    @LastModifiedBy
    @Column(name = "LAST_UPDUSR_ID", length = 20)
    protected String lastModifiedBy;

    // 별칭 메서드 (전자정부 관례 대응)
    public String getFrstRegisterId() {
        return createdBy;
    }

    public String getLastUpdusrId() {
        return lastModifiedBy;
    }

    // 하위 호환성을 위한 Setter Alias
    public void setFrstRegisterId(String id) {
        this.createdBy = id;
    }

    public void setLastUpdusrId(String id) {
        this.lastModifiedBy = id;
    }

    // LeaderScheduleService 등에서의 직접 호출 대응
    public void setCreatedBy(String id) {
        this.createdBy = id;
    }

    public void setLastModifiedBy(String id) {
        this.lastModifiedBy = id;
    }
}
