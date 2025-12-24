package com.company.project.domain.user;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NEMPLYRINFO")
public class User implements Serializable {

    @Id
    @Column(name = "EMPLYR_ID", length = 60)
    private String userId;

    @Column(name = "USER_NM", nullable = false, length = 180)
    private String userNm;

    @Column(name = "PASSWORD", nullable = false, length = 600)
    private String password;

    @Column(name = "ESNTL_ID", nullable = false, length = 20)
    private String esntlId;

    @Column(name = "PASSWORD_HINT", nullable = false, length = 300)
    private String passwordHint;

    @Column(name = "PASSWORD_CNSR", nullable = false, length = 300)
    private String passwordCnsr;

    @Enumerated(EnumType.STRING)
    @Column(name = "EMPLYR_STTUS_CODE", length = 45)
    private Role role;

    @Column(name = "SBSCRB_DE")
    private java.time.LocalDateTime createdDate;

    @Builder
    public User(String userId, String password, String userNm, String esntlId, String passwordHint, String passwordCnsr,
            Role role) {
        this.userId = userId;
        this.password = password;
        this.userNm = userNm;
        this.esntlId = esntlId;
        this.passwordHint = passwordHint == null ? "P01" : passwordHint;
        this.passwordCnsr = passwordCnsr == null ? "admin" : passwordCnsr;
        this.role = role;
        this.createdDate = java.time.LocalDateTime.now();
    }

    public void update(String userNm, String password) {
        this.userNm = userNm;
        this.password = password;
    }
}
