package nuri.migration.artifact;

import nuri.migration.model.MappingSpec;

import java.util.Objects;

/** credential/driver 원문을 제외하고 endpoint·run identity와 변환·identity·FK 의미를 plan에 결속한다. */
public final class MappingSpecDigester {

    private MappingSpecDigester() {}

    public static String sha256(MappingSpec mapping) {
        Objects.requireNonNull(mapping, "mapping");
        return CanonicalArtifactDigest.sha256(new MappingMaterial(
                mapping.source() == null ? null : mapping.source().endpointId(),
                mapping.target() == null ? null : mapping.target().endpointId(),
                mapping.run() == null ? null : mapping.run().runId(),
                mapping.run() == null ? null : mapping.run().sourceNamespace(),
                mapping.tables(), mapping.codemaps()));
    }

    private record MappingMaterial(
            String sourceEndpointId,
            String targetEndpointId,
            String runId,
            String sourceNamespace,
            java.util.List<MappingSpec.TableMapping> tables,
            java.util.Map<String, java.util.Map<String, String>> codemaps
    ) {}
}
