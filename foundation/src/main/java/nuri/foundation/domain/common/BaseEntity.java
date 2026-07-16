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
 * 기본 생성/수정자 메타데이터 엔티티.
 *
 * <p>[Standardization] {@code @CreatedBy} → {@code frstRgtrId},
 * {@code @LastModifiedBy} → {@code lastMdfrId} (eGov 레거시 별칭).</p>
 *
 * <p><b>⚠ 식별자 규약:</b> 이 감사 컬럼에 저장되는 값은 <b>loginId</b>이다
 * (esntlId 아님). {@code LoginUserAuditorAware}가 {@code CustomUserDetails.getUserId()}
 * (=loginId)를 반환하여 JPA Auditing이 기록한다.
 * 소유권(IDOR) 비교 시 {@code entity.getFrstRgtrId()}와 대조할 값은
 * 반드시 loginId({@code SecurityUtil.getCurrentLoginId()})를 사용해야 한다.</p>
 *
 * @see nuri.business.security.audit.LoginUserAuditorAware
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@MappedSuperclass
public abstract class BaseEntity extends BaseTimeEntity {

    /** 최초 등록자 ID. <b>loginId</b>가 저장된다 ({@code LoginUserAuditorAware} 참조). */
    @CreatedBy
    @Column(updatable = false, length = 20)
    protected String frstRgtrId;

    /** 최종 수정자 ID. <b>loginId</b>가 저장된다 ({@code LoginUserAuditorAware} 참조). */
    @LastModifiedBy
    @Column(length = 20)
    protected String lastMdfrId;
}
