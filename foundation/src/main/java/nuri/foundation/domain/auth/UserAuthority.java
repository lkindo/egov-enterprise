package nuri.foundation.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "tb_user_authrt_map")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class UserAuthority extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "scrty_dcsn_trgt_id", length = 20)
    @NonNull
    private String scrtyDcsnTrgtId;

    @Column(nullable = false, length = 20)
    @NonNull
    private String authrtId;

    @Column(length = 12)
    private String mbrTypeCd;

    public void update(@NonNull String authrtId, String mbrTypeCd) {
        this.authrtId = Objects.requireNonNull(authrtId);
        this.mbrTypeCd = mbrTypeCd;
    }
}
