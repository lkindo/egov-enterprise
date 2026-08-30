package nuri.migration.artifact;

import java.util.Objects;

/** 다른 migration-tool 경계가 canonical JSON SHA-256을 공유하기 위한 좁은 공개 API. */
public final class CanonicalArtifactDigest {

    private CanonicalArtifactDigest() {}

    public static String sha256(Object value) {
        return CanonicalSha256.digest(CanonicalJsonSupport.bytes(
                Objects.requireNonNull(value, "value")));
    }
}
