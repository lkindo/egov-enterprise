package nuri.foundation.security.mfa;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** 전용 키링으로 TOTP 비밀을 보호한다. 운영 키 획득/보관은 구성 경계의 책임이다. */
public final class MfaSecretCipher {
    private static final String FORMAT = "mfa1";
    private static final int NONCE_BYTES = 12;
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();
    private final SecureRandom random = new SecureRandom();
    private final String activeKeyId;
    private final Map<String, SecretKey> keys;

    /** Base64 표준형의 256-bit 키만 수락한다. 입력 값이나 원인 메시지를 예외에 포함하지 않는다. */
    public MfaSecretCipher(String activeKeyId, Map<String, String> base64Keys) {
        if (!validKeyId(activeKeyId) || base64Keys == null || base64Keys.isEmpty()
                || base64Keys.size() > 16 || !base64Keys.containsKey(activeKeyId)) {
            throw invalidKeyring();
        }
        Map<String, SecretKey> decodedKeys = new HashMap<>();
        for (Map.Entry<String, String> entry : base64Keys.entrySet()) {
            String encoded = entry.getValue();
            if (!validKeyId(entry.getKey()) || encoded == null || encoded.length() != 44) {
                throw invalidKeyring();
            }
            byte[] decoded;
            try {
                decoded = Base64.getDecoder().decode(encoded);
            } catch (IllegalArgumentException ignored) {
                throw invalidKeyring();
            }
            try {
                if (decoded.length != 32 || !Base64.getEncoder().encodeToString(decoded).equals(encoded)) {
                    throw invalidKeyring();
                }
                decodedKeys.put(entry.getKey(), new SecretKeySpec(decoded, "AES"));
            } finally {
                Arrays.fill(decoded, (byte) 0);
            }
        }
        this.activeKeyId = activeKeyId;
        this.keys = Map.copyOf(decodedKeys);
    }

    public String encrypt(String secret, String subject, String credentialVersion) {
        if (!TotpVerifier.isCanonicalSecret(secret)) {
            throw new IllegalArgumentException("Invalid MFA secret format");
        }
        byte[] associatedData = associatedData(activeKeyId, subject, credentialVersion);
        byte[] nonce = new byte[NONCE_BYTES];
        random.nextBytes(nonce);
        byte[] plaintext = secret.getBytes(StandardCharsets.US_ASCII);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keys.get(activeKeyId), new GCMParameterSpec(128, nonce));
            cipher.updateAAD(associatedData);
            return String.join(".", FORMAT, activeKeyId, ENCODER.encodeToString(nonce),
                    ENCODER.encodeToString(cipher.doFinal(plaintext)));
        } catch (GeneralSecurityException ignored) {
            throw new IllegalStateException("MFA encryption unavailable");
        } finally {
            Arrays.fill(plaintext, (byte) 0);
        }
    }

    public String decrypt(String envelope, String subject, String credentialVersion) {
        if (envelope == null || envelope.length() > 256) {
            throw invalidCiphertext();
        }
        String[] parts = envelope.split("\\.", -1);
        if (parts.length != 4 || !FORMAT.equals(parts[0]) || !validKeyId(parts[1])
                || !keys.containsKey(parts[1])) {
            throw invalidCiphertext();
        }
        byte[] nonce = decodeCanonical(parts[2]);
        byte[] ciphertext = decodeCanonical(parts[3]);
        if (nonce.length != NONCE_BYTES || ciphertext.length != 32 + 16) {
            throw invalidCiphertext();
        }
        byte[] associatedData = associatedData(parts[1], subject, credentialVersion);
        byte[] plaintext = null;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keys.get(parts[1]), new GCMParameterSpec(128, nonce));
            cipher.updateAAD(associatedData);
            plaintext = cipher.doFinal(ciphertext);
            String secret = new String(plaintext, StandardCharsets.US_ASCII);
            if (!TotpVerifier.isCanonicalSecret(secret)) {
                throw invalidCiphertext();
            }
            return secret;
        } catch (GeneralSecurityException ignored) {
            throw invalidCiphertext();
        } finally {
            if (plaintext != null) {
                Arrays.fill(plaintext, (byte) 0);
            }
        }
    }

    private static byte[] associatedData(String keyId, String subject, String version) {
        if (subject == null || subject.isBlank() || subject.length() > 20
                || version == null || !version.matches("[A-Za-z0-9_-]{1,50}")) {
            throw new IllegalArgumentException("Invalid MFA credential context");
        }
        byte[] formatBytes = FORMAT.getBytes(StandardCharsets.US_ASCII);
        byte[] keyBytes = keyId.getBytes(StandardCharsets.US_ASCII);
        byte[] subjectBytes = subject.getBytes(StandardCharsets.UTF_8);
        byte[] versionBytes = version.getBytes(StandardCharsets.US_ASCII);
        // 가변 문자열의 경계를 길이로 결속한다. 구분자를 포함한 내부 사용자 ID도 모호하지 않다.
        return ByteBuffer.allocate(16 + formatBytes.length + keyBytes.length + subjectBytes.length + versionBytes.length)
                .putInt(formatBytes.length).put(formatBytes)
                .putInt(keyBytes.length).put(keyBytes)
                .putInt(subjectBytes.length).put(subjectBytes)
                .putInt(versionBytes.length).put(versionBytes).array();
    }

    private static byte[] decodeCanonical(String value) {
        try {
            byte[] decoded = DECODER.decode(value);
            if (!ENCODER.encodeToString(decoded).equals(value)) {
                throw invalidCiphertext();
            }
            return decoded;
        } catch (IllegalArgumentException ignored) {
            throw invalidCiphertext();
        }
    }

    private static boolean validKeyId(String keyId) {
        return keyId != null && keyId.matches("[A-Za-z0-9_-]{1,64}");
    }

    private static IllegalArgumentException invalidKeyring() {
        return new IllegalArgumentException("Invalid MFA encryption keyring");
    }

    private static IllegalArgumentException invalidCiphertext() {
        return new IllegalArgumentException("Invalid MFA encrypted credential");
    }
}
