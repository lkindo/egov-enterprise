package nuri.business.domain.auth;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

/**
 * 권한-롤 관계 엔티티 (NAUTHORROLERELATE)
 * [Audit] BaseEntity 상속 및 생시시점 필드 매핑 최적화
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_authrt_role_map")
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

    private AuthorityRole(AuthorityRoleId id) {
        this.id = id;
    }

    @Builder
    public static AuthorityRole create(AuthorityRoleId id) {
        return new AuthorityRole(id);
    }

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
