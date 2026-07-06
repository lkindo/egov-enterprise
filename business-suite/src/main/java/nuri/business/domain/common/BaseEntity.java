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
 * [Standardization] @CreatedBy -> frstRgtrId, @LastModifiedBy -> lastMdfrId (eGov 레거시 별칭)
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@MappedSuperclass
public abstract class BaseEntity extends BaseTimeEntity {

    @CreatedBy
    @Column(updatable = false, length = 20)
    protected String frstRgtrId;

    @LastModifiedBy
    @Column(length = 20)
    protected String lastMdfrId;
}
