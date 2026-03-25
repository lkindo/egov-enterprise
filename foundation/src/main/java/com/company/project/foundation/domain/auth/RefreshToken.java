package com.company.project.foundation.domain.auth;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * JWT 리프레시 토큰 저장 엔티티
 */
@Entity
@Table(name = "NREFRESH_TOKEN")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RefreshToken {
    @Id
    @Column(name = "USER_ID", nullable = false, length = 20)
    private String userId;

    @Column(name = "TOKEN", nullable = false, unique = true, length = 255)
    private String token;

    @Column(name = "EXPIRY_DATE", nullable = false)
    private Instant expiryDate;

    public void updateToken(String token, Instant expiryDate) {
        this.token = token;
        this.expiryDate = expiryDate;
    }
}
