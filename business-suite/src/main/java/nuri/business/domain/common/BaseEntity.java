package nuri.business.domain.common;

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
    protected String frstRgtrId;

    @LastModifiedBy
    @Column(name = "last_mdfr_id", length = 20)
    protected String lastMdfrId;
}
