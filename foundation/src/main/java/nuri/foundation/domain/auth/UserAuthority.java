package nuri.foundation.domain.auth;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "NEMPLYRSCRTYESTBS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class UserAuthority extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "SCRTY_DTRMN_TRGET_ID", length = 20)
    @NonNull
    private String uniqId;

    @Column(name = "AUTHOR_CODE", nullable = false, length = 30)
    @NonNull
    private String authorCode;

    @Column(name = "MBER_TY_CODE", length = 15)
    private String mberTyCode;

    public void update(@NonNull String authorCode, String mberTyCode) {
        this.authorCode = Objects.requireNonNull(authorCode);
        this.mberTyCode = mberTyCode;
    }
}
