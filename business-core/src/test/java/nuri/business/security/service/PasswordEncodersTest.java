package nuri.business.security.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordEncodersTest {

    @Test
    @DisplayName("[2026-11-14] 새 비밀번호는 bcrypt 비용 12 로 저장하고, 비용 10 해시는 검증하되 로그인 뒤 다시 저장할 대상으로 본다")
    void storesAtCostTwelveAndUpgradesOlderHashes() {
        PasswordEncoder encoder = PasswordEncoders.create();

        String stored = encoder.encode("correct horse");
        assertThat(stored).startsWith("{bcrypt}$2a$12$");
        assertThat(encoder.matches("correct horse", stored)).isTrue();
        assertThat(encoder.upgradeEncoding(stored)).isFalse();

        String older = "{bcrypt}" + new BCryptPasswordEncoder(10).encode("correct horse");
        assertThat(encoder.matches("correct horse", older)).isTrue();
        assertThat(encoder.upgradeEncoding(older)).as("비용 10 해시는 다음 로그인에서 12 로 다시 저장한다").isTrue();
    }
}
