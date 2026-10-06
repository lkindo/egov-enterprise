package nuri.business.security.config;

import nuri.foundation.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class SecurityConfigTest {
    private final PasswordEncoder encoder = new SecurityConfig(mock(JwtTokenProvider.class)).passwordEncoder();

    @Test
    void storesBcryptAndRejectsWrongPassword() {
        String encoded = encoder.encode("isolated-password-fixture");

        assertThat(encoded).startsWith("{bcrypt}$2a$10$");
        assertThat(encoder.matches("isolated-password-fixture", encoded)).isTrue();
        assertThat(encoder.matches("wrong-password-fixture", encoded)).isFalse();
        assertThat(encoder.upgradeEncoding(encoded)).isFalse();
    }

    @Test
    void requestsUpgradeForOlderBcryptCost() {
        String encoded = "{bcrypt}" + new BCryptPasswordEncoder(4).encode("isolated-password-fixture");

        assertThat(encoder.matches("isolated-password-fixture", encoded)).isTrue();
        assertThat(encoder.upgradeEncoding(encoded)).isTrue();
    }

    @Test
    void doesNotEnablePlaintextOrLegacyShaAsADelegatedEncoder() {
        for (String stored : new String[] { "{noop}fixture", "{egov}fixture", "unprefixed-fixture" }) {
            assertThatThrownBy(() -> encoder.matches("fixture", stored))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
