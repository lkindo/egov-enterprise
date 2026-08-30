package nuri.migration.artifact;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** canonical artifact에서 공통으로 쓰는 SHA-256 지원 코드. */
final class CanonicalSha256 {

    private CanonicalSha256() {}

    static String digest(byte[] value) {
        return HexFormat.of().formatHex(newDigest().digest(value));
    }

    static boolean equalsHex(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                actual.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
    }

    private static MessageDigest newDigest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java platform", impossible);
        }
    }
}
