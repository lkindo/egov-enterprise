package nuri.foundation.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.io.Serializable;

/**
 * 권한-롤 관계 엔티티 (NAUTHORROLERELATE)
 * [Audit] BaseEntity 상속 및 생시시점 필드 매핑 최적화
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "TB_AUTHRT_ROLE_MAP")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@AttributeOverride(name = "createdDate", column = @Column(name = "CREAT_DT", updatable = false))
@SuperBuilder
public class AuthorityRole extends BaseEntity {

    @EmbeddedId
    private AuthorityRoleId id;

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class AuthorityRoleId implements Serializable {
        @Column(name = "AUTHRT_CD", length = 30)
        private String authorCode;

        @Column(name = "ROLE_CD", length = 50)
        private String roleCode;
    }
}
