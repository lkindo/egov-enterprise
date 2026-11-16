package nuri.migration.protect;

import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * 온라인 {@code nuri.business.domain.common.RrnoKeyring} 과 바이트 단위로 호환되는
 * 주민등록번호 AES-256-GCM(v2 키링) 암호기.
 *
 * <p>와이어 포맷은 {@code v2:<keyId>:<base64urlNoPad(12B nonce)>:<base64urlNoPad(ciphertext+16B tag)>},
 * AAD 는 {@code rrno|v2|<keyId>} 이다. 예외와 {@code toString()} 에 키 원문이나 평문·암호문을 남기지 않는다.
 */
final class RrnoAesGcmColumnCipher implements ColumnCipher {

    static final String VERSION = "v2";
    static final int KEY_BYTES = 32;
    static final int KEY_BASE64_LENGTH = 44;
    static final int NONCE_BYTES = 12;
    static final int TAG_BYTES = 16;
    static final int TAG_BITS = 128;
    static final int MAX_KEYS = 16;
    static final int MAX_ENVELOPE_LENGTH = 256;

    private static final String AAD_PREFIX = "rrno|v2|";
    private static final String CIPHER_ALGORITHM = "AES/GCM/NoPadding";
    private static final Pattern KEY_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{1,32}$");
    private static final Base64.Decoder B64_STD_DECODER = Base64.getDecoder();
    private static final Base64.Encoder B64_STD_ENCODER = Base64.getEncoder();
    private static final Base64.Encoder B64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64_URL_DECODER = Base64.getUrlDecoder();
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final JsonMapper STRICT_MAPPER = JsonMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .build();

    private final String activeKeyId;
    private final Map<String, SecretKey> keys;

    RrnoAesGcmColumnCipher(String activeKeyId, String keysJson) {
        if (activeKeyId == null || !KEY_ID_PATTERN.matcher(activeKeyId).matches()) {
            throw new IllegalArgumentException("MIGRATION_RRNO_ACTIVE_KEY_ID 형식이 올바르지 않습니다");
        }
        Map<String, SecretKey> parsed = parseKeys(keysJson);
        if (!parsed.containsKey(activeKeyId)) {
            throw new IllegalArgumentException("MIGRATION_RRNO_ACTIVE_KEY_ID 가 MIGRATION_RRNO_KEYS_JSON 에 없습니다");
        }
        this.activeKeyId = activeKeyId;
        this.keys = Map.copyOf(parsed);
    }

    private static Map<String, SecretKey> parseKeys(String keysJson) {
        if (keysJson == null || keysJson.isBlank()) {
            throw new IllegalArgumentException("MIGRATION_RRNO_KEYS_JSON 이 비어 있습니다");
        }
        JsonNode root;
        try {
            root = STRICT_MAPPER.readTree(keysJson);
        } catch (Exception malformed) {
            throw new IllegalArgumentException("MIGRATION_RRNO_KEYS_JSON 을 JSON 객체로 읽을 수 없습니다");
        }
        if (root == null || !root.isObject() || root.isEmpty() || root.size() > MAX_KEYS) {
            throw new IllegalArgumentException("MIGRATION_RRNO_KEYS_JSON 은 1~16개 키의 JSON 객체여야 합니다");
        }
        Map<String, SecretKey> parsed = new LinkedHashMap<>();
        for (var entry : root.properties()) {
            String keyId = entry.getKey();
            if (keyId == null || !KEY_ID_PATTERN.matcher(keyId).matches()) {
                throw new IllegalArgumentException("MIGRATION_RRNO_KEYS_JSON 에 허용되지 않는 키 ID 가 있습니다");
            }
            JsonNode valueNode = entry.getValue();
            if (valueNode == null || !valueNode.isTextual()) {
                throw new IllegalArgumentException("MIGRATION_RRNO_KEYS_JSON 키 값은 표준 Base64 문자열이어야 합니다");
            }
            String encoded = valueNode.asText();
            if (encoded.length() != KEY_BASE64_LENGTH) {
                throw new IllegalArgumentException("MIGRATION_RRNO_KEYS_JSON 에 32바이트 표준 Base64 가 아닌 키가 있습니다");
            }
            byte[] decoded;
            try {
                decoded = B64_STD_DECODER.decode(encoded);
            } catch (IllegalArgumentException invalidBase64) {
                throw new IllegalArgumentException("MIGRATION_RRNO_KEYS_JSON 에 32바이트 표준 Base64 가 아닌 키가 있습니다");
            }
            if (decoded.length != KEY_BYTES || !B64_STD_ENCODER.encodeToString(decoded).equals(encoded)) {
                throw new IllegalArgumentException("MIGRATION_RRNO_KEYS_JSON 에 32바이트 표준 Base64 가 아닌 키가 있습니다");
            }
            parsed.put(keyId, new SecretKeySpec(decoded, "AES"));
        }
        return parsed;
    }

    @Override
    public String encrypt(String plaintext) {
        Objects.requireNonNull(plaintext, "plaintext");
        byte[] nonce = new byte[NONCE_BYTES];
        SECURE_RANDOM.nextBytes(nonce);
        SecretKey key = keys.get(activeKeyId);
        byte[] cipherBytes;
        try {
            Cipher cipher = Cipher.getInstance(CIPHER_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(aadBytes(activeKeyId));
            cipherBytes = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException cryptoFailure) {
            throw new IllegalStateException("RRNO v2 암호화에 실패했습니다", cryptoFailure);
        }
        String envelope = VERSION + ":" + activeKeyId + ":"
                + B64_URL_ENCODER.encodeToString(nonce) + ":"
                + B64_URL_ENCODER.encodeToString(cipherBytes);
        if (envelope.length() > MAX_ENVELOPE_LENGTH) {
            throw new IllegalStateException("RRNO v2 암호문 길이가 상한을 넘었습니다");
        }
        return envelope;
    }

    @Override
    public String decrypt(String ciphertext) {
        String[] parts = splitCanonical(ciphertext);
        if (parts == null) {
            throw new IllegalArgumentException("RRNO v2 암호문 형식이 올바르지 않습니다");
        }
        String keyId = parts[1];
        SecretKey key = keys.get(keyId);
        if (key == null) {
            throw new IllegalArgumentException("RRNO v2 키링에 지정한 키 ID 가 없습니다");
        }
        byte[] nonce = B64_URL_DECODER.decode(parts[2]);
        byte[] cipherBytes = B64_URL_DECODER.decode(parts[3]);
        try {
            Cipher cipher = Cipher.getInstance(CIPHER_ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(aadBytes(keyId));
            return new String(cipher.doFinal(cipherBytes), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException authFailure) {
            throw new IllegalArgumentException("RRNO v2 복호화에 실패했습니다", authFailure);
        }
    }

    static boolean isCanonicalEnvelope(String value) {
        return splitCanonical(value) != null;
    }

    private static String[] splitCanonical(String value) {
        if (value == null || value.isBlank() || value.length() > MAX_ENVELOPE_LENGTH) {
            return null;
        }
        String[] parts = value.split(":", -1);
        if (parts.length != 4 || !VERSION.equals(parts[0]) || !KEY_ID_PATTERN.matcher(parts[1]).matches()) {
            return null;
        }
        if (parts[2].isEmpty() || parts[3].isEmpty()) {
            return null;
        }
        try {
            byte[] nonce = B64_URL_DECODER.decode(parts[2]);
            byte[] cipherBytes = B64_URL_DECODER.decode(parts[3]);
            if (nonce.length != NONCE_BYTES || cipherBytes.length < TAG_BYTES + 1) {
                return null;
            }
            if (!B64_URL_ENCODER.encodeToString(nonce).equals(parts[2])
                    || !B64_URL_ENCODER.encodeToString(cipherBytes).equals(parts[3])) {
                return null;
            }
        } catch (IllegalArgumentException malformedBase64) {
            return null;
        }
        return parts;
    }

    private static byte[] aadBytes(String keyId) {
        return (AAD_PREFIX + keyId).getBytes(StandardCharsets.US_ASCII);
    }

    @Override
    public String toString() {
        return "RrnoAesGcmColumnCipher[configuredKeys=" + keys.size() + "]";
    }
}
