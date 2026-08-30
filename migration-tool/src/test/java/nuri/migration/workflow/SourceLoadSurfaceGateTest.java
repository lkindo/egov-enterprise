package nuri.migration.workflow;

import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;

import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static nuri.migration.workflow.SourceLoadSurfaceGate.Blocker.COLUMN_TYPE_EVIDENCE_MISSING;
import static nuri.migration.workflow.SourceLoadSurfaceGate.Blocker.COLUMN_DISCOVERY_MISSING;
import static nuri.migration.workflow.SourceLoadSurfaceGate.Blocker.LOB_STREAMING;
import static nuri.migration.workflow.SourceLoadSurfaceGate.Blocker.QUOTED_IDENTIFIER;
import static nuri.migration.workflow.SourceLoadSurfaceGate.Blocker.VENDOR_SPECIFIC_TYPE;
import static org.assertj.core.api.Assertions.assertThat;

class SourceLoadSurfaceGateTest {

    private static final SourceReadSessionPolicy POLICY = SourceReadSessionPolicy.repeatableRead(
            EvidenceLevel.UNVERIFIED, "test operator freeze");

    @Test
    void acceptsPortableUnquotedMappedSurface() {
        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(false), column("USER_ID", false, Integer.toString(Types.VARCHAR))),
                mapping(), POLICY)).isEmpty();
    }

    @Test
    void blocksQuotedOrNonAsciiTableAndColumnIdentifiersBeforeSelect() {
        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(true), column("USER_ID", false, Integer.toString(Types.VARCHAR))),
                mapping(), POLICY)).containsExactly(QUOTED_IDENTIFIER);

        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(false), column("사용자ID", true, Integer.toString(Types.VARCHAR))),
                mappingWithSourceColumn("사용자ID"), POLICY)).containsExactly(QUOTED_IDENTIFIER);
    }

    @Test
    void blocksLobAndVendorSpecificJdbcSemanticsThatExecutorCannotStream() {
        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(false), column("PAYLOAD", false, Integer.toString(Types.BLOB))),
                mappingWithSourceColumn("PAYLOAD"), POLICY)).containsExactly(LOB_STREAMING);

        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(false), column("PAYLOAD", false, Integer.toString(Types.OTHER))),
                mappingWithSourceColumn("PAYLOAD"), POLICY)).containsExactly(VENDOR_SPECIFIC_TYPE);
    }

    @Test
    void ignoresUnmappedLobButStillBlocksTheSameColumnWhenMapped() {
        CatalogSnapshot snapshot = snapshot(
                table(false),
                column("USER_ID", false, Integer.toString(Types.VARCHAR)),
                column("UNMAPPED_PAYLOAD", false, Integer.toString(Types.BLOB)));

        assertThat(SourceLoadSurfaceGate.blockers(snapshot, mapping(), POLICY)).isEmpty();
        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot,
                mappingWithSourceColumn("UNMAPPED_PAYLOAD"),
                POLICY)).containsExactly(LOB_STREAMING);
    }

    @Test
    void missingJdbcTypeEvidenceFailsClosedForMappedTableColumns() {
        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(false), column("PAYLOAD", false, null)),
                mappingWithSourceColumn("PAYLOAD"), POLICY))
                .containsExactly(COLUMN_TYPE_EVIDENCE_MISSING);
    }

    @Test
    void mappedTableWithoutAnyDiscoveredColumnsFailsClosed() {
        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(false)), mapping(), POLICY))
                .containsExactly(COLUMN_DISCOVERY_MISSING);
    }

    @Test
    void missingRequiredMappedColumnFailsClosedEvenWhenAnotherColumnWasDiscovered() {
        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(false), column("OTHER_COLUMN", false, Integer.toString(Types.VARCHAR))),
                mapping(), POLICY))
                .containsExactly(COLUMN_DISCOVERY_MISSING);
    }

    private static MappingSpec mapping() {
        return mappingWithSourceColumn("USER_ID");
    }

    private static MappingSpec mappingWithSourceColumn(String sourceColumn) {
        return new MappingSpec(
                null,
                null,
                List.of(new TableMapping(
                        "legacy.legacy_user",
                        "public.tb_user_info",
                        null,
                        sourceColumn,
                        "user_id",
                        List.of(new ColumnMapping(
                                sourceColumn, "user_id", null, null, null, null, null)),
                        null)),
                Map.of());
    }

    private static CatalogSnapshot snapshot(CatalogObject... objects) {
        return new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-08-30T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("LegacyDB", "1", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(),
                List.of(objects),
                List.of());
    }

    private static CatalogObject table(boolean quoted) {
        return new CatalogObject(
                ObjectKind.TABLE, "db", "legacy", "legacy_user", quoted,
                null, null, List.of(), Map.of());
    }

    private static CatalogObject column(String name, boolean quoted, String jdbcType) {
        Map<String, String> attributes = jdbcType == null
                ? Map.of("parentTable", "legacy_user", "originalName", name)
                : Map.of(
                        "parentTable", "legacy_user",
                        "originalName", name,
                        "jdbcType", jdbcType);
        return new CatalogObject(
                ObjectKind.COLUMN,
                "db",
                "legacy",
                "legacy_user." + name,
                quoted,
                null,
                null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", "legacy_user")),
                attributes);
    }
}
