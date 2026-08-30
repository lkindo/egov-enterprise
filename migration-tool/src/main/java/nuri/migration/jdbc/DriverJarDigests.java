package nuri.migration.jdbc;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

final class DriverJarDigests {

    private DriverJarDigests() {}

    static String sha256(Path path) throws IOException {
        try (InputStream input = Files.newInputStream(path)) {
            return sha256(input);
        }
    }

    static String sha256(InputStream input) throws IOException {
        MessageDigest digest = newDigest();
        byte[] buffer = new byte[16 * 1024];
        for (int read; (read = input.read(buffer)) >= 0;) {
            if (read > 0) {
                digest.update(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static MessageDigest newDigest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java platform");
        }
    }
}
