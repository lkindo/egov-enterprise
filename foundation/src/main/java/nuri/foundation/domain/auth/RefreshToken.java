package nuri.foundation.domain.auth;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * JWT 리프레시 토큰 저장 엔티티
 */
@Entity
@Table(name = "TB_AUTH_RFSH_TK")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RefreshToken {
    @Id
    @Column(name = "USER_ID", nullable = false, length = 20)
    private String userId;

    @Column(name = "TK_VAL", nullable = false, unique = true, length = 255)
    private String token;

    @Column(name = "EXPR_DT", nullable = false)
    private Instant expiryDate;

    public void updateToken(String token, Instant expiryDate) {
        this.token = token;
        this.expiryDate = expiryDate;
    }
}
