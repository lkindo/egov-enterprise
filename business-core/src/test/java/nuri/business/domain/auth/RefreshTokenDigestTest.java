package nuri.business.domain.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 리프레시 토큰 저장값은 원문이 아니라 SHA-256 해시다(DIP D7). */
@DisplayName("RefreshTokenDigest")
class RefreshTokenDigestTest {

    @Test
    @DisplayName("같은 토큰은 같은 64자 소문자 16진수로, 다른 토큰은 다른 값으로 바뀐다")
    void digestsDeterministically() {
        String digest = RefreshTokenDigest.of("eyJ.header.sig");

        assertThat(digest).matches("[0-9a-f]{64}").isNotEqualTo("eyJ.header.sig");
        assertThat(RefreshTokenDigest.of("eyJ.header.sig")).isEqualTo(digest);
        assertThat(RefreshTokenDigest.of("eyJ.header.sih")).isNotEqualTo(digest);
        // 알려진 값으로 알고리즘을 고정한다(SHA-256("abc")).
        assertThat(RefreshTokenDigest.of("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    @Test
    @DisplayName("null 은 null 이다 — 조회할 수 없는 값을 지어내지 않는다")
    void nullStaysNull() {
        assertThat(RefreshTokenDigest.of(null)).isNull();
    }
}
