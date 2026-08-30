package nuri.migration.artifact;

import nuri.migration.model.MappingSpec.DbConfig;

import java.util.Objects;

/** 원문 설정을 노출하지 않고 endpoint label과 credential-redacted JDBC 위치를 함께 결속한다. */
public record SourceEndpointBinding(
        int schemaVersion,
        boolean bound,
        String digestAlgorithm,
        String endpointDigest) {

    public static final int CURRENT_SCHEMA_VERSION = 2;
    public static final String DIGEST_ALGORITHM = "SHA-256";

    public SourceEndpointBinding {
        if (schemaVersion != CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException(
                    "지원하지 않는 source endpoint binding schema version: " + schemaVersion);
        }
        if (bound) {
            if (!DIGEST_ALGORITHM.equals(digestAlgorithm)) {
                throw new IllegalArgumentException("지원하지 않는 source endpoint digest algorithm");
            }
            if (endpointDigest == null || !endpointDigest.matches("[0-9a-f]{64}")) {
                throw new IllegalArgumentException("source endpoint digest must be lowercase SHA-256");
            }
        } else if (digestAlgorithm != null || endpointDigest != null) {
            throw new IllegalArgumentException("unbound source endpoint must not carry a digest");
        }
    }

    public static SourceEndpointBinding unbound() {
        return new SourceEndpointBinding(CURRENT_SCHEMA_VERSION, false, null, null);
    }

    public static SourceEndpointBinding capture(DbConfig endpoint) {
        Objects.requireNonNull(endpoint, "source endpoint config");
        requireEndpointId(endpoint.endpointId());
        return new SourceEndpointBinding(
                CURRENT_SCHEMA_VERSION,
                true,
                DIGEST_ALGORITHM,
                CanonicalSha256.digest(CanonicalJsonSupport.bytes(new EndpointMaterial(
                        CURRENT_SCHEMA_VERSION,
                        "migration-source-endpoint",
                        endpoint.endpointId(),
                        JdbcEndpointIdentity.digest(endpoint)))));
    }

    public boolean matches(DbConfig endpoint) {
        if (!bound || endpoint == null) {
            return false;
        }
        try {
            return CanonicalSha256.equalsHex(endpointDigest, capture(endpoint).endpointDigest());
        } catch (RuntimeException invalidEndpoint) {
            return false;
        }
    }

    private static void requireEndpointId(String endpointId) {
        Objects.requireNonNull(endpointId, "source endpointId");
        if (endpointId.isBlank() || !endpointId.equals(endpointId.trim())) {
            throw new IllegalArgumentException("source endpointId must be non-blank and trimmed");
        }
    }

    private record EndpointMaterial(
            int schemaVersion,
            String purpose,
            String endpointId,
            String jdbcLocationDigest
    ) {}
}
