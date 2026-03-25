package com.company.project.foundation.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Refresh Token JPA Repository
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByToken(String token);
    void deleteByUserId(String userId);
}
