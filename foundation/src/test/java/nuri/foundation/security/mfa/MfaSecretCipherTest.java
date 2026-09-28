package nuri.foundation.security.mfa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class MfaSecretCipherTest {
    private static final String RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    private final String key = randomKey();
    private final MfaSecretCipher cipher = new MfaSecretCipher("current", Map.of("current", key));

    @Test
    void roundTripsWithIndependentNoncesWithoutStoringPlaintext() {
        String first = cipher.encrypt(RFC_SECRET, "subject", "version1");
        String second = cipher.encrypt(RFC_SECRET, "subject", "version1");
        assertThat(first).doesNotContain(RFC_SECRET).isNotEqualTo(second);
        assertThat(cipher.decrypt(first, "subject", "version1")).isEqualTo(RFC_SECRET);
        assertThat(cipher.decrypt(second, "subject", "version1")).isEqualTo(RFC_SECRET);
    }

    @Test
    void authenticatesAccountVersionKeyIdentifierAndCiphertext() {
        String encrypted = cipher.encrypt(RFC_SECRET, "subject", "version1");
        assertThatThrownBy(() -> cipher.decrypt(encrypted, "another", "version1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cipher.decrypt(encrypted, "subject", "version2"))
                .isInstanceOf(IllegalArgumentException.class);
        MfaSecretCipher aliasedKey = new MfaSecretCipher("alias", Map.of("current", key, "alias", key));
        assertThatThrownBy(() -> aliasedKey.decrypt(encrypted.replace(".current.", ".alias."), "subject", "version1"))
                .isInstanceOf(IllegalArgumentException.class);
        String[] parts = encrypted.split("\\.");
        byte[] changed = Base64.getUrlDecoder().decode(parts[3]);
        changed[0] ^= 1;
        parts[3] = Base64.getUrlEncoder().withoutPadding().encodeToString(changed);
        assertThatThrownBy(() -> cipher.decrypt(String.join(".", parts), "subject", "version1"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rotationReadsOldKeysButEncryptsOnlyWithTheActiveKey() {
        String old = cipher.encrypt(RFC_SECRET, "subject", "version1");
        MfaSecretCipher rotated = new MfaSecretCipher("next", Map.of("current", key, "next", randomKey()));
        assertThat(rotated.decrypt(old, "subject", "version1")).isEqualTo(RFC_SECRET);
        String next = rotated.encrypt(RFC_SECRET, "subject", "version1");
        assertThat(next).startsWith("mfa1.next.");
        assertThatThrownBy(() -> cipher.decrypt(next, "subject", "version1"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"x", "mfa1.current.a.b", "mfa2.current.a.b", "mfa1.missing.a.b", "mfa1.current..."})
    void malformedOrUnknownEnvelopesFailClosed(String envelope) {
        assertThatThrownBy(() -> cipher.decrypt(envelope, "subject", "version1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid MFA encrypted credential");
    }

    @Test
    void rejectsMissingWeakMalformedAndNonCanonicalKeysWithoutEchoingThem() {
        assertThatThrownBy(() -> new MfaSecretCipher("current", Map.of())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new MfaSecretCipher("missing", Map.of("current", key)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new MfaSecretCipher("current", Map.of("current", "!".repeat(44))))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Invalid MFA encryption keyring").hasNoCause();
        assertThatThrownBy(() -> new MfaSecretCipher("current", Map.of("current", Base64.getEncoder().encodeToString(new byte[16]))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new MfaSecretCipher("current", Map.of("current", key.substring(0, 43))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void ciphertextCannotUseAlternateBase64EncodingOrAmbiguousContext() {
        String encrypted = cipher.encrypt(RFC_SECRET, "a|b", "c");
        assertThatThrownBy(() -> cipher.decrypt(encrypted + "=", "a|b", "c"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cipher.decrypt(encrypted, "a", "b_c"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cipher.encrypt(RFC_SECRET, "", "version1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cipher.encrypt("invalid", "subject", "version1"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static String randomKey() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }
}
