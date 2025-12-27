package com.company.project.domain.auth;

import jakarta.persistence.*;
import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NEMPLYRSCRTYESTBS")
public class UserAuthority {

    @Id
    @Column(name = "SCRTY_DTRMN_TRGET_ID", length = 20)
    private String uniqId;

    @Column(name = "AUTHOR_CODE", nullable = false, length = 30)
    private String authorCode;

    @Column(name = "MBER_TY_CODE", length = 15)
    private String mberTyCode;

    @Builder
    public UserAuthority(String uniqId, String authorCode, String mberTyCode) {
        this.uniqId = uniqId;
        this.authorCode = authorCode;
        this.mberTyCode = mberTyCode;
    }

    public void update(String authorCode, String mberTyCode) {
        this.authorCode = authorCode;
        this.mberTyCode = mberTyCode;
    }
}
