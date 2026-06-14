package nuri.business.domain.auth;

import nuri.business.domain.common.BaseEntity;
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
@Table(name = "tb_authrt_role_map")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SuperBuilder
public class AuthorityRole extends BaseEntity {

    @EmbeddedId
    private AuthorityRoleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("authrtCd")
    @JoinColumn(name = "authrt_cd")
    private Authority authority;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roleCd")
    @JoinColumn(name = "role_cd")
    private RoleInfo roleInfo;

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class AuthorityRoleId implements Serializable {
        @Column(length = 30)
        private String authrtCd;

        @Column(length = 12)
        private String roleCd;
    }
}
