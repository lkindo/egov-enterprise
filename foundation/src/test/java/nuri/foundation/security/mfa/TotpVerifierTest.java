package nuri.foundation.security.mfa;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class TotpVerifierTest {
    // Public RFC 6238 SHA-1 fixture: ASCII 12345678901234567890, encoded as Base32.
    private static final String RFC6238_SHA1_BASE32_VECTOR = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    private final TotpVerifier verifier = new TotpVerifier();

    @ParameterizedTest
    @CsvSource({"59,287082", "1111111109,081804", "1111111111,050471",
            "1234567890,005924", "2000000000,279037", "20000000000,353130"})
    void matchesRfc6238Sha1VectorsReducedToSixDigits(long epoch, String code) {
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, code, Instant.ofEpochSecond(epoch), -1))
                .hasValue(epoch / 30);
    }

    @Test
    void acceptsAllZeroSixDigitCodeWithoutTreatingItAsMissing() {
        // Public RFC secret at counter 349495; independently calculated RFC 4226 fixture.
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "000000", Instant.ofEpochSecond(10_484_850), -1)).hasValue(349495);
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "000000", Instant.ofEpochSecond(10_484_850), 349495)).isEmpty();
    }

    @Test
    void handlesStepBoundariesAndOnlyOneStepOfClockDrift() {
        // RFC 4226 counters 0, 1, 2, 3, with the same public fixture.
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "755224", Instant.ofEpochMilli(29_999), -1)).hasValue(0);
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "287082", Instant.ofEpochMilli(29_999), -1)).hasValue(1);
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "359152", Instant.ofEpochMilli(29_999), -1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "755224", Instant.ofEpochMilli(30_000), -1)).hasValue(0);
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "359152", Instant.ofEpochMilli(30_000), -1)).hasValue(2);
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "969429", Instant.ofEpochMilli(30_000), -1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "755224", Instant.ofEpochMilli(60_000), -1)).isEmpty();
    }

    @Test
    void rejectsUsedCounterEvenAfterAnotherChallengeOrClockMovement() {
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "287082", Instant.ofEpochSecond(59), 1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "287082", Instant.ofEpochSecond(60), 1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "755224", Instant.ofEpochSecond(30), 1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "359152", Instant.ofEpochSecond(60), 1)).hasValue(2);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"81804", "081804 ", " 081804", "+81804", "０８１８０４", "0818040", "abcdef"})
    void requiresExactlySixAsciiDigits(String code) {
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, code, Instant.ofEpochSecond(1111111109), -1)).isEmpty();
    }

    @Test
    void rejectsMalformedSecretAndInvalidClockOrCounterWithoutDecoderNormalization() {
        Instant now = Instant.ofEpochSecond(59);
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR.toLowerCase(java.util.Locale.ROOT), "287082", now, -1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR + "=", "287082", now, -1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR.replace('G', '0'), "287082", now, -1)).isEmpty();
        assertThat(verifier.verify(null, "287082", now, -1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "287082", null, -1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "287082", Instant.ofEpochMilli(-1), -1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "287082", Instant.MAX, -1)).isEmpty();
        assertThat(verifier.verify(RFC6238_SHA1_BASE32_VECTOR, "287082", now, -2)).isEmpty();
    }

    @Test
    void generatedSecretsUseTheSupportedShapeAndIndependentRandomness() {
        String first = verifier.generateSecret();
        String second = verifier.generateSecret();
        assertThat(TotpVerifier.isCanonicalSecret(first)).isTrue();
        assertThat(TotpVerifier.isCanonicalSecret(second)).isTrue();
        assertThat(first).isNotEqualTo(second);
    }
}
