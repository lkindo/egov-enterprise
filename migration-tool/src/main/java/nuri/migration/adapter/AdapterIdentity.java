package nuri.migration.adapter;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

/** adapter의 안정 ID와 JDBC 제품 식별 근거다. */
public record AdapterIdentity(
        String adapterId,
        DatabaseFamily databaseFamily,
        String displayName,
        Set<String> jdbcProductNames,
        String versionPolicy,
        EvidenceLevel evidenceLevel) {

    public AdapterIdentity {
        adapterId = requireText(adapterId, "adapterId");
        databaseFamily = Objects.requireNonNull(databaseFamily, "databaseFamily");
        displayName = requireText(displayName, "displayName");
        jdbcProductNames = Collections.unmodifiableSet(new LinkedHashSet<>(
                Objects.requireNonNull(jdbcProductNames, "jdbcProductNames")));
        versionPolicy = requireText(versionPolicy, "versionPolicy");
        evidenceLevel = Objects.requireNonNull(evidenceLevel, "evidenceLevel");
    }

    public static AdapterIdentity conservativeDefault(String adapterId) {
        return new AdapterIdentity(
                adapterId,
                DatabaseFamily.GENERIC_JDBC,
                adapterId,
                Set.of(),
                "driver-reported version; compatibility unverified",
                EvidenceLevel.UNVERIFIED);
    }

    public boolean recognizesProduct(String productName) {
        return productName != null && jdbcProductNames.stream()
                .anyMatch(candidate -> candidate.equalsIgnoreCase(productName));
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }
}
