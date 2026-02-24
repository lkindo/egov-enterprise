package com.company.project.domain.auth;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "NEMPLYRSCRTYESTBS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserAuthority implements Serializable {
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

    @Builder
    public UserAuthority(@NonNull String uniqId, @NonNull String authorCode, String mberTyCode) {
        this.uniqId = Objects.requireNonNull(uniqId);
        this.authorCode = Objects.requireNonNull(authorCode);
        this.mberTyCode = mberTyCode;
    }

    public void update(@NonNull String authorCode, String mberTyCode) {
        this.authorCode = Objects.requireNonNull(authorCode);
        this.mberTyCode = mberTyCode;
    }
}
