package nuri.business.domain.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;

/** 유형별 권한 배정의 물리 매핑. 변경은 감사 이력을 함께 쓰는 관리 서비스를 통한다. */
@Entity
@Table(name = "tb_authrt_grnt_map")
@IdClass(AuthorityGrantId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthorityGrant extends BaseEntity {
    @Id
    @Column(name = "authrt_cd", nullable = false, length = 20, updatable = false)
    private String authrtCd;

    @Id
    @Column(name = "authrt_type_cd", nullable = false, length = 12, updatable = false)
    private String authrtTypeCd;

    @Id
    @Column(name = "authrt_grnt_cd", nullable = false, length = 20, updatable = false)
    private String authrtGrntCd;

    @Builder
    public static AuthorityGrant create(String authrtCd, String authrtTypeCd, String authrtGrntCd) {
        AuthorityGrant grant = new AuthorityGrant();
        grant.authrtCd = Objects.requireNonNull(authrtCd);
        grant.authrtTypeCd = Objects.requireNonNull(authrtTypeCd);
        grant.authrtGrntCd = Objects.requireNonNull(authrtGrntCd);
        if (!java.util.Set.of("OPERATION", "NAVIGATION").contains(authrtTypeCd)) {
            throw new IllegalArgumentException("Unknown authorization grant type");
        }
        return grant;
    }
}
