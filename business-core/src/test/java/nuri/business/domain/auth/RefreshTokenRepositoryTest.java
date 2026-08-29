package nuri.business.domain.auth;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("RefreshTokenRepository 테스트")
class RefreshTokenRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
            return new JPAQueryFactory(entityManager);
        }
    }

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("esntlId IN 벌크 삭제는 선택한 토큰만 한 번에 삭제한다")
    void deleteAllByEsntlIdIn_deletesOnlySelectedTokens() {
        Instant expiry = Instant.now().plusSeconds(3600);
        refreshTokenRepository.saveAll(List.of(
                RefreshToken.builder().userId("ESNTL_001").rfshTkn("token-1").exprtnDt(expiry).build(),
                RefreshToken.builder().userId("ESNTL_002").rfshTkn("token-2").exprtnDt(expiry).build(),
                RefreshToken.builder().userId("ESNTL_KEEP").rfshTkn("token-keep").exprtnDt(expiry).build()));
        entityManager.flush();
        entityManager.clear();

        int affected = refreshTokenRepository.deleteAllByEsntlIdIn(List.of("ESNTL_001", "ESNTL_002"));
        entityManager.flush();
        entityManager.clear();

        assertThat(affected).isEqualTo(2);
        assertThat(refreshTokenRepository.findAll())
                .extracting(RefreshToken::getUserId)
                .containsExactly("ESNTL_KEEP");
    }
}
