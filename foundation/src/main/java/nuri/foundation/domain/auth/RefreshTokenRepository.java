package nuri.foundation.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Refresh Token JPA Repository
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByRfshTkn(String rfshTkn);
    void deleteByUserId(String userId);
}
