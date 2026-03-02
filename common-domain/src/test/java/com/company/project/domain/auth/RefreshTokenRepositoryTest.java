package com.company.project.domain.auth;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("RefreshTokenRepository 테스트")
class RefreshTokenRepositoryTest {

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Test
    @DisplayName("토큰 저장 및 토큰값으로 조회 확인")
    void saveAndFindByToken() {
        // Given
        RefreshToken token = RefreshToken.builder()
                .userId("testuser")
                .token("abc-123-def")
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();
        refreshTokenRepository.save(token);

        // When
        Optional<RefreshToken> found = refreshTokenRepository.findByToken("abc-123-def");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo("testuser");
    }

    @Test
    @DisplayName("토큰 수정 및 사용자 아이디로 삭제 확인")
    void updateAndDeleteByUserId() {
        // Given
        RefreshToken token = RefreshToken.builder()
                .userId("deluser")
                .token("old-token")
                .expiryDate(Instant.now())
                .build();
        refreshTokenRepository.save(token);

        // When
        RefreshToken savedToken = refreshTokenRepository.findById("deluser").orElseThrow();
        savedToken.updateToken("new-token", Instant.now().plusSeconds(3600));
        refreshTokenRepository.saveAndFlush(savedToken);

        // Then
        assertThat(refreshTokenRepository.findByToken("new-token")).isPresent();

        // When
        refreshTokenRepository.deleteByUserId("deluser");
        refreshTokenRepository.flush();

        // Then
        assertThat(refreshTokenRepository.findById("deluser")).isNotPresent();
    }
}
