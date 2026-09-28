package nuri.foundation.security.mfa;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** 고엔트로피 일회용 비밀의 생성/목적별 digest. 원문을 객체 상태나 로그에 보관하지 않는다. */
public final class MfaOpaqueTokens {
    private final SecureRandom random = new SecureRandom();

    public String challenge() { return generate(32); }
    public String recoveryCode() { return generate(16); }

    public static String challengeDigest(String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) {
            throw new IllegalArgumentException("Invalid MFA challenge");
        }
        return digest("mfa-challenge-v1\n" + token);
    }

    public static String recoveryDigest(String subject, String version, String code) {
        if (subject == null || subject.isBlank() || subject.length() > 20 || subject.contains("\n")
                || version == null || !version.matches("[A-Za-z0-9_-]{1,50}")
                || code == null || !code.matches("[A-Za-z0-9_-]{22}")) {
            throw new IllegalArgumentException("Invalid MFA recovery proof");
        }
        return digest("mfa-recovery-v1\n" + subject + "\n" + version + "\n" + code);
    }

    private String generate(int size) {
        byte[] value = new byte[size];
        random.nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private static String digest(String input) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable");
        }
    }
}
