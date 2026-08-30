package nuri.migration.artifact;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/** 경로나 credential 없이 source JDBC 실행 바이트와 class 선택을 결속하는 증거. */
public record SourceDriverEvidence(
        LoadingMode loadingMode,
        String digestAlgorithm,
        String aggregateDigest,
        int jarCount
) {

    private static final String SHA_256 = "SHA-256";
    private static final Pattern SHA_256_HEX = Pattern.compile("[0-9a-f]{64}");

    public SourceDriverEvidence {
        loadingMode = Objects.requireNonNull(loadingMode, "loadingMode");
        if (!SHA_256.equals(digestAlgorithm)) {
            throw new IllegalArgumentException("source driver evidence digest algorithm must be SHA-256");
        }
        if (aggregateDigest == null || !SHA_256_HEX.matcher(aggregateDigest).matches()) {
            throw new IllegalArgumentException("source driver evidence digest must be lowercase SHA-256 hex");
        }
        if (jarCount < 0 || loadingMode == LoadingMode.ISOLATED && jarCount == 0
                || loadingMode != LoadingMode.ISOLATED && jarCount != 0) {
            throw new IllegalArgumentException("source driver evidence jar count is inconsistent");
        }
    }

    public static SourceDriverEvidence unbound() {
        return new SourceDriverEvidence(LoadingMode.UNBOUND, SHA_256,
                digest(List.of("unbound")), 0);
    }

    public static SourceDriverEvidence bundled(String driverClass) {
        return new SourceDriverEvidence(LoadingMode.BUNDLED, SHA_256,
                digest(List.of("bundled", normalize(driverClass))), 0);
    }

    /** 실제로 선택된 bundled driver class/code-source bytes까지 결속한다. */
    public static SourceDriverEvidence bundled(String driverClass, String driverContentDigest) {
        if (driverClass == null || driverClass.isBlank()
                || driverContentDigest == null
                || !SHA_256_HEX.matcher(driverContentDigest).matches()) {
            throw new IllegalArgumentException("bundled source driver evidence is invalid");
        }
        return new SourceDriverEvidence(LoadingMode.BUNDLED, SHA_256,
                digest(List.of("bundled-bytes", driverClass, driverContentDigest)), 0);
    }

    public static SourceDriverEvidence isolated(String driverClass, List<String> jarDigests) {
        if (driverClass == null || driverClass.isBlank()) {
            throw new IllegalArgumentException("isolated source driver class must not be blank");
        }
        List<String> digests = List.copyOf(Objects.requireNonNull(jarDigests, "jarDigests"));
        if (digests.isEmpty() || digests.stream().anyMatch(value -> value == null
                || !SHA_256_HEX.matcher(value).matches())) {
            throw new IllegalArgumentException("isolated source driver jar digests are invalid");
        }
        java.util.ArrayList<String> material = new java.util.ArrayList<>();
        material.add("isolated");
        material.add(driverClass);
        material.addAll(digests);
        return new SourceDriverEvidence(LoadingMode.ISOLATED, SHA_256,
                digest(material), digests.size());
    }

    public boolean bound() {
        return loadingMode != LoadingMode.UNBOUND;
    }

    @Override
    public String toString() {
        return "SourceDriverEvidence[loadingMode=" + loadingMode
                + ", digest=<redacted>, jarCount=" + jarCount + "]";
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? "auto" : value;
    }

    private static String digest(List<String> values) {
        MessageDigest digest = newDigest();
        for (String value : values) {
            byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
            digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(bytes.length).array());
            digest.update(bytes);
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static MessageDigest newDigest() {
        try {
            return MessageDigest.getInstance(SHA_256);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java platform");
        }
    }

    public enum LoadingMode {
        UNBOUND,
        BUNDLED,
        ISOLATED
    }
}
