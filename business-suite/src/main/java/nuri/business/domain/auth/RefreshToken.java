package nuri.business.domain.auth;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * JWT 리프레시 토큰 저장 엔티티
 */
@Entity
@Table(name = "tb_auth_rfsh_tk")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RefreshToken {
    @Id
    @Column(name = "user_id", nullable = false, length = 20)
    private String userId;

    @Column(nullable = false, unique = true, length = 4000)
    private String rfshTkn;

    @Column(nullable = false)
    private Instant exprtnDt;

    public void updateToken(String rfshTkn, Instant exprtnDt) {
        this.rfshTkn = rfshTkn;
        this.exprtnDt = exprtnDt;
    }
}
