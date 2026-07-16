package nuri.business.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "tb_user_authrt_map")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserAuthority extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "scrty_dcsn_trgt_id", length = 20)
    @NonNull
    private String scrtyDcsnTrgtId;

    @Column(name = "authrt_id", nullable = false, length = 20)
    @NonNull
    private String authrtId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scrty_dcsn_trgt_id", referencedColumnName = "esntl_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.user.entity.User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authrt_id", referencedColumnName = "authrt_cd", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Authority authority;

    @Column(length = 12)
    private String mbrTypeCd;

    private UserAuthority(@NonNull String scrtyDcsnTrgtId, @NonNull String authrtId, String mbrTypeCd) {
        this.scrtyDcsnTrgtId = scrtyDcsnTrgtId;
        this.authrtId = authrtId;
        this.mbrTypeCd = mbrTypeCd;
    }

    @Builder
    public static UserAuthority create(@NonNull String scrtyDcsnTrgtId, @NonNull String authrtId, String mbrTypeCd) {
        return new UserAuthority(scrtyDcsnTrgtId, authrtId, mbrTypeCd);
    }

    public void update(@NonNull String authrtId, String mbrTypeCd) {
        this.authrtId = Objects.requireNonNull(authrtId);
        this.mbrTypeCd = mbrTypeCd;
    }
}
