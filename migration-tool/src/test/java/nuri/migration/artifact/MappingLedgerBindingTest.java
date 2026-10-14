package nuri.migration.artifact;

import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.LedgerBinding;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** [DEC-OPS-312] 원장 선언은 mapping digest 에 원장 바이트 digest 로만 들어가고, 선언이 없으면 digest 가 종전과 같다. */
class MappingLedgerBindingTest {

    private static final String SHA_A = "a".repeat(64);
    private static final String SHA_B = "b".repeat(64);

    @Test
    void withoutALedgerTheDigestIsExactlyThePreLedgerMaterial() {
        MappingSpec plain = mapping(null);

        assertThat(MappingSpecDigester.sha256(plain)).isEqualTo(CanonicalArtifactDigest.sha256(
                new PreLedgerMaterial("src", "tgt", "run-1", "legacy", plain.tables(), plain.codemaps())));
    }

    @Test
    void theLedgerDigestNotItsPathIsBound() {
        String plain = MappingSpecDigester.sha256(mapping(null));
        String boundA = MappingSpecDigester.sha256(mapping(new LedgerBinding("term-ledger.yml", SHA_A)));

        assertThat(boundA).isNotEqualTo(plain);
        assertThat(MappingSpecDigester.sha256(mapping(new LedgerBinding("moved/ledger.yml", SHA_A))))
                .isEqualTo(boundA);
        assertThat(MappingSpecDigester.sha256(mapping(new LedgerBinding("term-ledger.yml", SHA_B))))
                .isNotEqualTo(boundA);
    }

    @Test
    void mappingYamlCarriesTheLedgerDeclaration() {
        MappingSpec loaded = new MappingLoader().loadContent("""
                ledger:
                  path: term-ledger.yml
                  sha256: %s
                tables: []
                """.formatted(SHA_A));

        assertThat(loaded.ledger()).isEqualTo(new LedgerBinding("term-ledger.yml", SHA_A));
        assertThat(new MappingLoader().loadContent("tables: []").ledger()).isNull();
    }

    private static MappingSpec mapping(LedgerBinding ledger) {
        return new MappingSpec(
                new MappingSpec.DbConfig("jdbc:x", "u", "p", "d", "src"),
                new MappingSpec.DbConfig("jdbc:y", "u", "p", "d", "tgt"),
                List.of(new TableMapping("legacy.t", "public.t", null, "ID", "id",
                        List.of(new ColumnMapping("ID", "id", null, null, null, null, null)), null)),
                Map.of(), new RunContext("run-1", "legacy"), ledger);
    }

    /** 원장 도입 전 {@code MappingSpecDigester} 의 결속 재료와 같은 모양이다. */
    private record PreLedgerMaterial(String sourceEndpointId, String targetEndpointId, String runId,
                                     String sourceNamespace, List<TableMapping> tables,
                                     Map<String, MappingSpec.CodeMap> codemaps) {}
}
