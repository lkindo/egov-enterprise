package nuri.migration.state;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** 원시 키를 노출하지 않는 진단용 digest. 승인 artifact의 canonical encoding과는 별개다. */
public final class KeyDiagnostics {

    private KeyDiagnostics() {}

    public static String digest(String key) {
        if (key == null) {
            return "<null>";
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(key.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
