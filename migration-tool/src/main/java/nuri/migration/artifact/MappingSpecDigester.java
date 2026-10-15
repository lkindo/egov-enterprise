package nuri.migration.artifact;

import com.fasterxml.jackson.annotation.JsonInclude;
import nuri.migration.model.MappingSpec;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/** credential/driver 원문을 제외하고 endpoint·run identity와 변환·identity·FK 의미를 plan에 결속한다. */
public final class MappingSpecDigester {

    private MappingSpecDigester() {}

    public static String sha256(MappingSpec mapping) {
        Objects.requireNonNull(mapping, "mapping");
        MappingMaterial material = new MappingMaterial(
                mapping.source() == null ? null : mapping.source().endpointId(),
                mapping.target() == null ? null : mapping.target().endpointId(),
                mapping.run() == null ? null : mapping.run().runId(),
                mapping.run() == null ? null : mapping.run().sourceNamespace(),
                mapping.tables(), mapping.codemaps(), mapping.archives());
        if (mapping.ledger() == null) {
            // 원장이 없는 mapping 의 digest 는 원장 도입 전과 같다.
            return CanonicalArtifactDigest.sha256(material);
        }
        // [DEC-OPS-312] 원장 파일 위치가 아니라 그 바이트의 digest 를 결속한다 — 같은 원장을 옮겨도 승인이 깨지지 않는다.
        return CanonicalArtifactDigest.sha256(new LedgerBoundMappingMaterial(material, mapping.ledger().sha256()));
    }

    private record LedgerBoundMappingMaterial(MappingMaterial mapping, String ledgerSha256) {}

    /**
     * [ADR-0029 L3e] 보관 선언(덤프할 표·컬럼·원장 행·보존 기한, 덤프만 하는 표의 where·정렬 키)도 승인 의미다. 비어 있으면
     * 직렬화하지 않아 보관 선언이 없는 mapping 의 digest 는 그대로다.
     */
    private record MappingMaterial(
            String sourceEndpointId,
            String targetEndpointId,
            String runId,
            String sourceNamespace,
            List<MappingSpec.TableMapping> tables,
            Map<String, MappingSpec.CodeMap> codemaps,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<MappingSpec.ArchiveDump> archives
    ) {}
}
