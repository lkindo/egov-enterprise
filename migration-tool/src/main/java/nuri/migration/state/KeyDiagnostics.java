package nuri.migration.state;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.HexFormat;

/**
 * 원시 키를 노출하지 않는 진단용 digest. 승인 artifact의 canonical encoding과는 별개다.
 *
 * <p>값은 이 프로세스에서만 쓰는 무작위 키의 HMAC-SHA256 이다. 같은 실행 안에서는 같은 키가 같은 digest 를 내
 * 오류끼리 대조할 수 있지만, 무작위 키는 어디에도 남지 않으므로 주민번호·전화번호처럼 경우의 수가 적은 키를
 * digest 에서 전수 대입으로 되찾을 수 없다. 2026-10-13 까지는 소금 없는 SHA-256 이었다 — 오류가 검증 보고와
 * gate 문구로 이어지면서(DEC-OPS-309) 그 digest 가 CLI·로그에 나갔다.
 */
public final class KeyDiagnostics {

    private static final String ALGORITHM = "HmacSHA256";
    private static final byte[] PROCESS_KEY = new byte[32];

    static {
        new SecureRandom().nextBytes(PROCESS_KEY);
    }

    private KeyDiagnostics() {}

    public static String digest(String key) {
        if (key == null) {
            return "<null>";
        }
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(PROCESS_KEY, ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(key.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException impossible) {
            throw new IllegalStateException("HmacSHA256 is unavailable", impossible);
        }
    }
}
