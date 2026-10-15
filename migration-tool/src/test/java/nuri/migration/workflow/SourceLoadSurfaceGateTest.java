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
    void mysqlAllowsOnlyRehearsedLongTextAndBinaryTypes() {
        var mysql = new nuri.migration.adapter.MySqlSourceAdapter().sourceReadSessionPolicy();
        for (int type : new int[] {Types.LONGVARCHAR, Types.LONGVARBINARY}) {
            var snapshot = snapshot(table(false), column("PAYLOAD", false, Integer.toString(type)));
            assertThat(SourceLoadSurfaceGate.blockers(snapshot, mappingWithSourceColumn("PAYLOAD"), mysql))
                    .isEmpty();
            assertThat(SourceLoadSurfaceGate.blockers(snapshot, mappingWithSourceColumn("PAYLOAD"), POLICY))
                    .containsExactly(LOB_STREAMING);
        }
        for (int type : new int[] {Types.BLOB, Types.CLOB, Types.NCLOB, Types.LONGNVARCHAR, Types.SQLXML}) {
            assertThat(SourceLoadSurfaceGate.blockers(
                    snapshot(table(false), column("PAYLOAD", false, Integer.toString(type))),
                    mappingWithSourceColumn("PAYLOAD"), mysql)).containsExactly(LOB_STREAMING);
        }
    }

    @Test
    void oracleAllowsOnlyRehearsedBlobAndClobTypes() {
        var oracle = new nuri.migration.adapter.OracleSourceAdapter().sourceReadSessionPolicy();
        for (int type : new int[] {Types.BLOB, Types.CLOB}) {
            var snapshot = snapshot(table(false), column("PAYLOAD", false, Integer.toString(type)));
            assertThat(SourceLoadSurfaceGate.blockers(snapshot, mappingWithSourceColumn("PAYLOAD"), oracle))
                    .as("Oracle JDBC type %s", type).isEmpty();
            assertThat(SourceLoadSurfaceGate.blockers(snapshot, mappingWithSourceColumn("PAYLOAD"), POLICY))
                    .containsExactly(LOB_STREAMING);
        }
        for (int type : new int[] {Types.NCLOB, Types.LONGVARBINARY, Types.LONGVARCHAR,
                Types.LONGNVARCHAR, Types.SQLXML}) {
            assertThat(SourceLoadSurfaceGate.blockers(
                    snapshot(table(false), column("PAYLOAD", false, Integer.toString(type))),
                    mappingWithSourceColumn("PAYLOAD"), oracle))
                    .as("unsupported JDBC type %s", type).containsExactly(LOB_STREAMING);
        }
    }

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

    /** [ADR-0029 L3c] 한 소스를 나눈 매핑이 읽는 컬럼은 모두 형식 증거를 받는다 — 첫 매핑만 보지 않는다. */
    @Test
    void everySplitMappingOfASourceContributesItsRequiredColumns() {
        TableMapping main = mappingWithSourceColumn("USER_ID").tables().getFirst();
        TableMapping detail = new TableMapping("legacy.legacy_user", "public.tb_user_detail", null, "USER_ID",
                List.of(), "user_id", List.of(new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)),
                null, null, List.of(), "detail");
        MappingSpec split = new MappingSpec(null, null, List.of(main, detail), Map.of());

        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(false), column("USER_ID", false, Integer.toString(Types.VARCHAR))), split, POLICY))
                .containsExactly(COLUMN_DISCOVERY_MISSING);
        assertThat(SourceLoadSurfaceGate.blockers(
                snapshot(table(false), column("USER_ID", false, Integer.toString(Types.VARCHAR)),
                        column("PAYLOAD", false, Integer.toString(Types.BLOB))), split, POLICY))
                .containsExactly(LOB_STREAMING);
    }

    /**
     * [ADR-0029 L3d] 조회 표의 키와 조회 컬럼도 형식 증거를 받는다. 조회 행은 한 번에 읽으므로 정책이 LOB 를 흘려 읽을 수
     * 있어도 조회 컬럼의 LOB 는 막는다. 주 표는 조회 키(key.from)를 읽는다.
     */
    @Test
    void lookupTablesContributeTheirKeyAndReadColumnsAndNeverStreamLargeValues() {
        var oracle = new nuri.migration.adapter.OracleSourceAdapter().sourceReadSessionPolicy();
        MappingSpec.Lookup dept = new MappingSpec.Lookup("dept", "legacy.legacy_dept", null,
                new MappingSpec.LookupKey("DEPT_CD", "DEPT_CD"), MappingSpec.LookupCardinality.EXACTLY_ONE, null);
        MappingSpec lookup = new MappingSpec(null, null, List.of(new TableMapping("legacy.legacy_user",
                "public.tb_user_info", null, "USER_ID", List.of(), "user_id", List.of(
                        new ColumnMapping("USER_ID", "user_id", null, null, null, null, null),
                        new ColumnMapping("dept.DEPT_NM", "dept_nm", null, null, null, null, null)),
                null, null, List.of(), "users", List.of(dept))), Map.of());
        CatalogObject user = column("USER_ID", false, Integer.toString(Types.VARCHAR));
        CatalogObject userDept = column("DEPT_CD", false, Integer.toString(Types.VARCHAR));

        assertThat(SourceLoadSurfaceGate.blockers(snapshot(table(false), user, userDept, deptTable(),
                deptColumn("DEPT_CD", Types.VARCHAR), deptColumn("DEPT_NM", Types.VARCHAR)), lookup, POLICY)).isEmpty();
        assertThat(SourceLoadSurfaceGate.blockers(snapshot(table(false), user, deptTable(),
                deptColumn("DEPT_CD", Types.VARCHAR), deptColumn("DEPT_NM", Types.VARCHAR)), lookup, POLICY))
                .as("주 표의 조회 키").containsExactly(COLUMN_DISCOVERY_MISSING);
        assertThat(SourceLoadSurfaceGate.blockers(snapshot(table(false), user, userDept, deptTable(),
                deptColumn("DEPT_CD", Types.VARCHAR)), lookup, POLICY))
                .as("조회 컬럼").containsExactly(COLUMN_DISCOVERY_MISSING);
        assertThat(SourceLoadSurfaceGate.blockers(snapshot(table(false), user, userDept, deptTable(),
                deptColumn("DEPT_CD", Types.VARCHAR), deptColumn("DEPT_NM", Types.CLOB)), lookup, oracle))
                .containsExactly(LOB_STREAMING);
        assertThat(SourceLoadSurfaceGate.sourceColumns(snapshot(deptTable(), deptColumn("DEPT_NM", Types.VARCHAR)),
                "legacy.legacy_dept", "dept_nm")).hasSize(1);
    }

    private static CatalogObject deptTable() {
        return new CatalogObject(ObjectKind.TABLE, "db", "legacy", "legacy_dept", false, null, null, List.of(),
                Map.of());
    }

    private static CatalogObject deptColumn(String name, int jdbcType) {
        return new CatalogObject(ObjectKind.COLUMN, "db", "legacy", "legacy_dept." + name, false, null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", "legacy_dept")),
                Map.of("parentTable", "legacy_dept", "originalName", name, "jdbcType", Integer.toString(jdbcType)));
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
