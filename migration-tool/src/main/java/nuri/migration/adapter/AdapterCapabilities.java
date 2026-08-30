package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;

import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** 누락 없는 객체 지원 행렬. 명시되지 않은 종류는 자동으로 UNSUPPORTED다. */
public record AdapterCapabilities(
        Map<ObjectKind, ObjectSupportGrade> objectSupport,
        EvidenceLevel evidenceLevel,
        List<String> limitations) {

    public AdapterCapabilities {
        Objects.requireNonNull(objectSupport, "objectSupport");
        EnumMap<ObjectKind, ObjectSupportGrade> total = new EnumMap<>(ObjectKind.class);
        for (ObjectKind kind : ObjectKind.values()) {
            total.put(kind, objectSupport.getOrDefault(kind, ObjectSupportGrade.UNSUPPORTED));
        }
        objectSupport = Collections.unmodifiableMap(total);
        evidenceLevel = Objects.requireNonNull(evidenceLevel, "evidenceLevel");
        limitations = List.copyOf(Objects.requireNonNull(limitations, "limitations"));
    }

    public ObjectSupportGrade supportFor(ObjectKind kind) {
        return objectSupport.get(Objects.requireNonNull(kind, "kind"));
    }

    public static AdapterCapabilities jdbcBaseline(EvidenceLevel evidenceLevel) {
        EnumMap<ObjectKind, ObjectSupportGrade> support = new EnumMap<>(ObjectKind.class);
        DiscoveryRouteMatrix.jdbcBaseline().forEach((kind, route) -> {
            if (route == DiscoveryTerminalRoute.OBJECTS) {
                support.put(kind, ObjectSupportGrade.METADATA_ONLY);
            }
        });
        return new AdapterCapabilities(
                support,
                evidenceLevel,
                List.of("JDBC metadata is account-scoped and cannot prove catalog completeness"));
    }

    public static AdapterCapabilities unsupported(EvidenceLevel evidenceLevel) {
        return new AdapterCapabilities(
                Map.of(),
                evidenceLevel,
                List.of("no complete discovery route is declared"));
    }

    public static Builder builder(EvidenceLevel evidenceLevel) {
        return new Builder(evidenceLevel);
    }

    public static final class Builder {
        private final EvidenceLevel evidenceLevel;
        private final EnumMap<ObjectKind, ObjectSupportGrade> support = new EnumMap<>(ObjectKind.class);
        private final List<String> limitations = new java.util.ArrayList<>();

        private Builder(EvidenceLevel evidenceLevel) {
            this.evidenceLevel = Objects.requireNonNull(evidenceLevel, "evidenceLevel");
            support.putAll(jdbcBaseline(evidenceLevel).objectSupport());
        }

        public Builder support(ObjectKind kind, ObjectSupportGrade grade) {
            support.put(Objects.requireNonNull(kind, "kind"), Objects.requireNonNull(grade, "grade"));
            return this;
        }

        public Builder limitation(String limitation) {
            if (limitation == null || limitation.isBlank()) {
                throw new IllegalArgumentException("limitation must not be blank");
            }
            limitations.add(limitation);
            return this;
        }

        public AdapterCapabilities build() {
            return new AdapterCapabilities(support, evidenceLevel, limitations);
        }
    }
}
