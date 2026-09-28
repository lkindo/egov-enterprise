package nuri.foundation.security.mfa;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorConfig;
import com.warrenstrange.googleauth.HmacHashFunction;
import java.time.Instant;
import java.util.OptionalLong;

/**
 * RFC 6238의 계산은 기존 googleauth에 위임한다. 성공 counter의 저장/직렬화는 호출자가 담당한다.
 * {@code lastAcceptedStep}은 같은 자격 행의 잠금 아래 읽고 반환 counter를 같은 트랜잭션에 저장해야 한다.
 */
public final class TotpVerifier {
    public static final long STEP_SECONDS = 30;
    private static final long STEP_MILLIS = STEP_SECONDS * 1_000;
    private final GoogleAuthenticator authenticator = new GoogleAuthenticator(
            new GoogleAuthenticatorConfig.GoogleAuthenticatorConfigBuilder()
                    .setCodeDigits(6)
                    .setTimeStepSizeInMillis(STEP_MILLIS)
                    .setWindowSize(3)
                    .setSecretBits(160)
                    .setNumberOfScratchCodes(0)
                    .setHmacHashFunction(HmacHashFunction.HmacSHA1)
                    .build());

    public String generateSecret() {
        return authenticator.createCredentials().getKey();
    }

    /** ±1 step 밖, 비정규 입력 및 이미 사용한 counter는 모두 거부한다. 선행 0을 보존한다. */
    public OptionalLong verify(String secret, String code, Instant now, long lastAcceptedStep) {
        if (!isCanonicalSecret(secret) || code == null || !code.matches("[0-9]{6}")
                || now == null || now.getEpochSecond() < 0 || lastAcceptedStep < -1) {
            return OptionalLong.empty();
        }
        long currentStep = now.getEpochSecond() / STEP_SECONDS;
        if (currentStep >= Long.MAX_VALUE / STEP_MILLIS) {
            return OptionalLong.empty();
        }
        int submitted = Integer.parseInt(code);
        long accepted = -1;
        // 창 전체를 검사한다. 인접 counter가 드물게 같은 코드를 만들면 가장 큰 counter를 소모한다.
        for (long step = Math.max(0, currentStep - 1); step <= currentStep + 1; step++) {
            int expected = authenticator.getTotpPassword(secret, step * STEP_MILLIS);
            if (submitted == expected && step > lastAcceptedStep) {
                accepted = step;
            }
        }
        return accepted < 0 ? OptionalLong.empty() : OptionalLong.of(accepted);
    }

    public static boolean isCanonicalSecret(String secret) {
        // 신규 자격은 160-bit Base32(정확히 32자)만 허용한다. 관대한 decoder의 무시 문자를 허용하지 않는다.
        return secret != null && secret.matches("[A-Z2-7]{32}");
    }
}
