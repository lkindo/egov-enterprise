package nuri.business.domain.auth;

import jakarta.persistence.*;
import lombok.*;
import nuri.foundation.domain.common.BaseEntity;
import java.time.Instant;

/**
 * JWT 리프레시 토큰 저장 엔티티
 *
 * <p>[Phase 5.2 규범 적용] 클래스 레벨 {@code @Builder}/{@code @AllArgsConstructor} 를 제거하고
 * 정적 팩토리 {@link #create}에 {@code @Builder} 를 배치. 빌더 노출 표면을 비즈니스 필드로 한정하면서
 * 기존 {@code RefreshToken.builder()...build()} 호출부는 무수정 유지된다.
 */
@Entity
@Table(name = "tb_auth_rfsh_tk")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken extends BaseEntity {
    @Id
    @Column(nullable = false, length = 20)
    private String userId;

    @Column(nullable = false, unique = true, length = 4000)
    private String rfshTkn;

    @Column(nullable = false)
    private Instant exprtnDt;

    private RefreshToken(String userId, String rfshTkn, Instant exprtnDt) {
        this.userId = userId;
        this.rfshTkn = rfshTkn;
        this.exprtnDt = exprtnDt;
    }

    @Builder
    public static RefreshToken create(String userId, String rfshTkn, Instant exprtnDt) {
        return new RefreshToken(userId, rfshTkn, exprtnDt);
    }

    public void updateToken(String rfshTkn, Instant exprtnDt) {
        this.rfshTkn = rfshTkn;
        this.exprtnDt = exprtnDt;
    }
}
