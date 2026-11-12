package nuri.business.domain.common;

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

/**
 * 주민등록번호 AES-256-GCM 키링(Wave 4, MFA 비밀 암호기와 같은 키 규칙). 암호문은 {@code v2:<keyId>:<nonce>:<ciphertext>}
 * (Base64url, 패딩 없음)이다. 키링이 구성되면 새로 쓰는 값은 활성 키의 v2 암호문이 되고, 키링에 남긴 이전 키의 v2 암호문도 읽는다.
 *
 * <p><b>호환</b>: 키링이 없으면 아무것도 바꾸지 않는다 — 변환기는 종전처럼 ARIA(CryptoUtil) 암호문을 쓴다. 키링이 있어도 접두
 * {@code v2:} 가 없는 값은 ARIA 암호문(또는 과거 평문)으로 읽는다. ARIA 암호문은 표준 Base64 라 {@code :} 를 담지 않으므로 두 형식은
 * 겹치지 않는다. 이관 도구(ADR-0029)는 ARIA 암호문을 쓰고 온라인은 그것을 늘 읽는다 — 다음 저장 때 활성 키로 다시 암호화된다.
 *
 * <p>정적 상태인 이유: JPA 변환기는 Hibernate 가 만든다 — CryptoUtil 과 같이 기동 시 구성 빈이 한 번 채운다. 키 원문·입력 값·원인
 * 메시지는 예외·로그에 담지 않는다.
 */
public final class RrnoKeyring {

    private static final String FORMAT = "v2";
    private static final String PREFIX = FORMAT + ":";
    private static final int NONCE_BYTES = 12;
    private static final int MAX_KEYS = 16;
    private static final int MAX_ENVELOPE = 256;
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();
    private static final SecureRandom RANDOM = new SecureRandom();

    private static volatile Ring ring;

    private RrnoKeyring() {
    }

    /**
     * 키링을 구성한다. 둘 다 비면 키링을 끈다(종전 ARIA 쓰기). 하나만 있거나 키가 256-bit 표준 Base64 가 아니면 기동을 멈춘다.
     *
     * @param activeKeyId 새 값을 암호화할 키 ID({@code [A-Za-z0-9_-]{1,32}})
     * @param base64Keys  키 ID → 32바이트 키의 표준 Base64(44자). 활성 키를 담아야 한다
     */
    public static void configure(String activeKeyId, Map<String, String> base64Keys) {
        boolean noActive = activeKeyId == null || activeKeyId.isBlank();
        boolean noKeys = base64Keys == null || base64Keys.isEmpty();
        if (noActive && noKeys) {
            ring = null;
            return;
        }
        if (noActive || noKeys || !validKeyId(activeKeyId) || base64Keys.size() > MAX_KEYS
                || !base64Keys.containsKey(activeKeyId)) {
            throw invalidKeyring();
        }
        Map<String, SecretKey> keys = new HashMap<>();
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
                keys.put(entry.getKey(), new SecretKeySpec(decoded, "AES"));
            } finally {
                Arrays.fill(decoded, (byte) 0);
            }
        }
        ring = new Ring(activeKeyId, Map.copyOf(keys));
    }

    /** 키링이 구성됐는가 — 아니면 변환기는 종전 ARIA 로 쓴다. */
    public static boolean active() {
        return ring != null;
    }

    /** 이 값이 v2 키링 암호문의 형식인가(접두만 본다). */
    public static boolean isEnvelope(String value) {
        return value != null && value.startsWith(PREFIX);
    }

    /** 활성 키로 암호화한다. 키링이 없으면 호출하지 않는다(IllegalStateException). */
    public static String encrypt(String plaintext) {
        Ring current = ring;
        if (current == null) {
            throw new IllegalStateException("Rrno keyring is not configured");
        }
        byte[] nonce = new byte[NONCE_BYTES];
        RANDOM.nextBytes(nonce);
        byte[] input = plaintext.getBytes(StandardCharsets.UTF_8);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, current.keys().get(current.activeKeyId()), new GCMParameterSpec(128, nonce));
            cipher.updateAAD(associatedData(current.activeKeyId()));
            return String.join(":", FORMAT, current.activeKeyId(), ENCODER.encodeToString(nonce),
                    ENCODER.encodeToString(cipher.doFinal(input)));
        } catch (GeneralSecurityException ignored) {
            throw new IllegalStateException("Rrno encryption unavailable");
        } finally {
            Arrays.fill(input, (byte) 0);
        }
    }

    /**
     * v2 암호문을 푼다. 키링이 없거나, 키 ID 를 모르거나, 형식·인증 태그가 맞지 않으면 실패한다(fail-closed) — 손상된 값을 주민번호처럼
     * 돌려주지 않는다.
     */
    public static String decrypt(String envelope) {
        Ring current = ring;
        if (current == null || envelope == null || envelope.length() > MAX_ENVELOPE) {
            throw invalidCiphertext();
        }
        String[] parts = envelope.split(":", -1);
        if (parts.length != 4 || !FORMAT.equals(parts[0]) || !validKeyId(parts[1]) || !current.keys().containsKey(parts[1])) {
            throw invalidCiphertext();
        }
        byte[] nonce = decodeCanonical(parts[2]);
        byte[] ciphertext = decodeCanonical(parts[3]);
        if (nonce.length != NONCE_BYTES || ciphertext.length <= 16) {
            throw invalidCiphertext();
        }
        byte[] plaintext = null;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, current.keys().get(parts[1]), new GCMParameterSpec(128, nonce));
            cipher.updateAAD(associatedData(parts[1]));
            plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException ignored) {
            throw invalidCiphertext();
        } finally {
            if (plaintext != null) {
                Arrays.fill(plaintext, (byte) 0);
            }
        }
    }

    /** 형식과 키 ID 를 인증 데이터로 묶는다 — 다른 용도의 같은 키 암호문이나 키 ID 를 바꾼 암호문은 풀리지 않는다. */
    private static byte[] associatedData(String keyId) {
        return ("rrno|" + FORMAT + "|" + keyId).getBytes(StandardCharsets.US_ASCII);
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
        return keyId != null && keyId.matches("[A-Za-z0-9_-]{1,32}");
    }

    private static IllegalArgumentException invalidKeyring() {
        return new IllegalArgumentException("Invalid rrno encryption keyring");
    }

    private static IllegalArgumentException invalidCiphertext() {
        return new IllegalArgumentException("Invalid rrno ciphertext");
    }

    private record Ring(String activeKeyId, Map<String, SecretKey> keys) {
    }
}
