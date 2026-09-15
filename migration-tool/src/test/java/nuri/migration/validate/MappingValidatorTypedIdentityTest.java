package nuri.migration.validate;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class MappingValidatorTypedIdentityTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    @TempDir
    Path temp;

    @ParameterizedTest
    @ValueSource(strings = {"legacy_table", "app.legacy_table"})
    void mariaDbSchemaModePreservesItsReportedDefCatalog(String sourceTable) throws Exception {
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), "not-read-here.json");
        MetadataIdentity identity = new MetadataIdentity(
                "MariaDB", "MariaDB Connector/J", "def", "app", "def", "app", "legacy_table");

        ValidationResult result = validator.validateLiveSource(liveSpec(sourceTable),
                metadataJdbc(List.of(new JdbcColumn("id", Types.BIGINT, "BIGINT")), identity));

        assertThat(result.errors()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"def.app.legacy_table", "wrong.app.legacy_table"})
    void mariaDbSchemaModeRejectsCatalogQualifiedSqlBeforeColumnLookup(String sourceTable) throws Exception {
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), "not-read-here.json");
        MetadataIdentity identity = new MetadataIdentity(
                "MariaDB", "MariaDB Connector/J", "def", "app", "def", "app", "legacy_table");

        ValidationResult result = validator.validateLiveSource(liveSpec(sourceTable),
                metadataJdbc(List.of(new JdbcColumn("id", Types.BIGINT, "BIGINT")), identity));

        assertThat(result.errors()).containsExactly("MARIADB_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED");
    }

    @Test
    void mariaDbQualificationGuardCannotChangeAnotherProductsDriversOrMetadataProjections() throws Exception {
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), "not-read-here.json");
        for (MetadataIdentity identity : List.of(
                new MetadataIdentity("PostgreSQL", "MariaDB Connector/J", "def", "app", "def", "app", "legacy_table"),
                new MetadataIdentity("MariaDB", "MySQL Connector/J", "def", "app", "def", "app", "legacy_table"),
                new MetadataIdentity("MariaDB", "MariaDB Connector/J", "other", "app", "def", "app", "legacy_table"),
                new MetadataIdentity("MariaDB", "MariaDB Connector/J", "def", null, "def", "app", "legacy_table"))) {
            ValidationResult result = validator.validateLiveSource(liveSpec("def.app.legacy_table"),
                    metadataJdbc(List.of(new JdbcColumn("id", Types.BIGINT, "BIGINT")), identity));

            assertThat(result.errors()).isEmpty();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"legacy_table", "app.legacy_table"})
    void mysqlSchemaModeResolvesOnlyItsMissingConnectionCatalog(String sourceTable) throws Exception {
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), "not-read-here.json");
        MetadataIdentity identity = new MetadataIdentity(
                "MySQL", "MySQL Connector/J", null, "app", "def", "app", "legacy_table");

        ValidationResult result = validator.validateLiveSource(liveSpec(sourceTable),
                metadataJdbc(List.of(new JdbcColumn("id", Types.BIGINT, "BIGINT")), identity));

        assertThat(result.errors()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"def.app.legacy_table", "wrong.app.legacy_table"})
    void mysqlSchemaModeRejectsExplicitCatalogQualificationEvenWhenItsMetadataIdentityIsValid(String sourceTable)
            throws Exception {
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), "not-read-here.json");
        MetadataIdentity identity = new MetadataIdentity(
                "MySQL", "MySQL Connector/J", null, "app", "def", "app", "legacy_table");

        ValidationResult result = validator.validateLiveSource(liveSpec(sourceTable),
                metadataJdbc(List.of(new JdbcColumn("id", Types.BIGINT, "BIGINT")), identity));

        assertThat(result.errors()).containsExactly("MYSQL_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"other.legacy_table", "app.other_table"})
    void mysqlSchemaModeStillRejectsAnExplicitWrongSchemaOrTable(String sourceTable) throws Exception {
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), "not-read-here.json");
        MetadataIdentity identity = new MetadataIdentity(
                "MySQL", "MySQL Connector/J", null, "app", "def", "app", "legacy_table");

        ValidationResult result = validator.validateLiveSource(liveSpec(sourceTable),
                metadataJdbc(List.of(new JdbcColumn("id", Types.BIGINT, "BIGINT")), identity));

        assertThat(result.errors()).singleElement().asString().contains("실 source에 없는 테이블");
    }

    @Test
    void mysqlDefaultCatalogResolutionCannotApplyToAnotherDriverOrMissingSchemaOrExplicitCatalog() throws Exception {
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), "not-read-here.json");
        for (MetadataIdentity identity : List.of(
                new MetadataIdentity("PostgreSQL", "MySQL Connector/J", null, "app", "def", "app", "legacy_table"),
                new MetadataIdentity("MySQL", "MariaDB Connector/J", null, "app", "def", "app", "legacy_table"),
                new MetadataIdentity("MySQL", "MySQL Connector/J", null, null, "def", "app", "legacy_table"),
                new MetadataIdentity("MySQL", "MySQL Connector/J", "other", "app", "def", "app", "legacy_table"))) {
            ValidationResult result = validator.validateLiveSource(liveSpec("app.legacy_table"),
                    metadataJdbc(List.of(new JdbcColumn("id", Types.BIGINT, "BIGINT")), identity));

            assertThat(result.errors()).singleElement().asString().contains("실 source에 없는 테이블");
        }
    }

    private static MappingSpec liveSpec(String sourceTable) {
        return new MappingSpec(null, null, List.of(new TableMapping(sourceTable, "target_table", null,
                List.of(new ColumnMapping("id", "id", null, null, null, null, null)), null)), Map.of());
    }

    @Test
    void staticValidationCoversTypedTargetsDuplicatesAndForeignKeyTypeContract() throws Exception {
        MappingValidator validator = validatorWithCatalog(
                "tb_parent", "tenant_id",
                "tb_parent", "payload",
                "tb_child", "child_id",
                "tb_child", "tenant_id",
                "tb_child", "parent_id");
        IdentityStrategy invalidParentIdentity = new IdentityStrategy(
                TargetIdentityPolicy.TARGET_GENERATED,
                List.of(component("TENANT_ID", IdentityValueType.TEXT),
                        component("TENANT_ID", IdentityValueType.TEXT)),
                List.of(component("tenant_id", IdentityValueType.TEXT),
                        component("missing_parent_id", IdentityValueType.SIGNED_INTEGER)));
        TableMapping parent = table(
                "legacy_parent", "tb_parent", invalidParentIdentity, List.of(),
                List.of(new ColumnMapping("TENANT_ID", "tenant_id", null, null, null, null, null),
                        new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)));
        CompositeForeignKey wrongType = new CompositeForeignKey(
                "legacy_parent",
                List.of(component("TENANT_ID", IdentityValueType.TEXT),
                        component("PARENT_NO", IdentityValueType.SIGNED_INTEGER)),
                List.of(component("tenant_id", IdentityValueType.TEXT),
                        component("parent_id", IdentityValueType.TEXT)));
        TableMapping child = table(
                "legacy_child", "tb_child",
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(component("CHILD_ID", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("child_id", IdentityValueType.SIGNED_INTEGER))),
                List.of(wrongType), List.of());

        ValidationResult result = validator.validate(
                new MappingSpec(null, null, List.of(child, parent), Map.of()));

        assertThat(result.errors()).anySatisfy(error -> assertThat(error).contains("sourceComponents", "중복"));
        assertThat(result.errors()).anySatisfy(error -> assertThat(error).contains("없는 typed identity 타깃 컬럼",
                "missing_parent_id"));
        assertThat(result.errors()).anySatisfy(error -> assertThat(error).contains("type", "parent_id"));
    }

    @Test
    void liveMetadataChecksTypedSourceTargetAndForeignKeyComponentsAndJdbcTypes() throws Exception {
        MappingValidator validator = validatorWithCatalog(
                "tb_parent", "tenant_id",
                "tb_parent", "parent_id",
                "tb_parent", "payload",
                "tb_child", "child_id",
                "tb_child", "tenant_id",
                "tb_child", "parent_id");
        TableMapping parent = validParent();
        CompositeForeignKey reference = new CompositeForeignKey(
                "legacy_parent",
                List.of(component("TENANT_ID", IdentityValueType.TEXT),
                        component("MISSING_PARENT_NO", IdentityValueType.SIGNED_INTEGER)),
                parent.identity().targetComponents());
        TableMapping child = table(
                "legacy_child", "tb_child",
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(component("CHILD_ID", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("child_id", IdentityValueType.SIGNED_INTEGER))),
                List.of(reference), List.of());
        MappingSpec spec = new MappingSpec(null, null, List.of(parent, child), Map.of());

        JdbcTemplate source = h2();
        source.execute("CREATE TABLE legacy_parent (TENANT_ID varchar(20), LEGACY_NO varchar(20), PAYLOAD varchar(50))");
        source.execute("CREATE TABLE legacy_child (CHILD_ID bigint, TENANT_ID varchar(20))");
        JdbcTemplate target = h2();
        target.execute("CREATE TABLE tb_parent (tenant_id varchar(20), parent_id varchar(20), payload varchar(50))");
        target.execute("CREATE TABLE tb_child (child_id bigint, tenant_id varchar(20))");

        ValidationResult sourceResult = validator.validateLiveSource(spec, source);
        ValidationResult targetResult = validator.validateLiveTarget(spec, target);

        assertThat(sourceResult.errors()).anySatisfy(error -> assertThat(error)
                .contains("identity source type", "LEGACY_NO", "signed_integer"));
        assertThat(sourceResult.errors()).anySatisfy(error -> assertThat(error)
                .contains("foreign key source", "MISSING_PARENT_NO"));
        assertThat(targetResult.errors()).anySatisfy(error -> assertThat(error)
                .contains("identity target type", "parent_id", "signed_integer"));
        assertThat(targetResult.errors()).anySatisfy(error -> assertThat(error)
                .contains("foreign key target", "parent_id"));
    }

    @Test
    void liveIdentityMetadataAcceptsEveryExplicitJdbcFamilyAndRejectsNearMisses() throws Exception {
        List<JdbcColumn> columns = new ArrayList<>();
        List<IdentityComponentSpec> components = new ArrayList<>();
        add(columns, components, IdentityValueType.TEXT,
                Types.CHAR, Types.VARCHAR, Types.LONGVARCHAR,
                Types.NCHAR, Types.NVARCHAR, Types.LONGNVARCHAR);
        add(columns, components, IdentityValueType.SIGNED_INTEGER,
                Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT, Types.NUMERIC, Types.DECIMAL);
        add(columns, components, IdentityValueType.UNSIGNED_INTEGER, Types.BIGINT);
        add(columns, components, IdentityValueType.DECIMAL, Types.NUMERIC);
        add(columns, components, IdentityValueType.BOOLEAN, Types.BOOLEAN, Types.BIT);
        add(columns, components, IdentityValueType.UUID,
                Types.CHAR, Types.VARCHAR, Types.NCHAR, Types.NVARCHAR);
        columns.add(new JdbcColumn("uuid_native", Types.OTHER, "UUID"));
        components.add(component("uuid_native", IdentityValueType.UUID));
        add(columns, components, IdentityValueType.DATE, Types.DATE);
        add(columns, components, IdentityValueType.TIME, Types.TIME);
        add(columns, components, IdentityValueType.LOCAL_TIMESTAMP, Types.TIMESTAMP);
        add(columns, components, IdentityValueType.OFFSET_TIMESTAMP, Types.TIMESTAMP_WITH_TIMEZONE);
        add(columns, components, IdentityValueType.BINARY,
                Types.BINARY, Types.VARBINARY, Types.LONGVARBINARY);

        for (IdentityValueType type : IdentityValueType.values()) {
            String name = "bad_" + type.externalName();
            columns.add(new JdbcColumn(name, Types.CLOB, null));
            components.add(component(name, type));
        }
        columns.add(new JdbcColumn("uuid_null_type", Types.OTHER, null));
        components.add(component("uuid_null_type", IdentityValueType.UUID));

        IdentityStrategy identity = new IdentityStrategy(
                TargetIdentityPolicy.TARGET_GENERATED, components, List.of());
        TableMapping table = new TableMapping(
                "legacy_table", "target_table", null, null, List.of(), null,
                List.of(), null, identity, List.of());
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), "missing-is-not-read-here.json");

        ValidationResult result = validator.validateLiveSource(
                new MappingSpec(null, null, List.of(table), Map.of()), metadataJdbc(columns));

        assertThat(result.errors()).hasSize(IdentityValueType.values().length + 1);
        for (IdentityValueType type : IdentityValueType.values()) {
            assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                    .contains("bad_" + type.externalName(), "type 불일치"));
        }
        assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                .contains("uuid_null_type", "type 불일치"));
        assertThat(result.errors()).noneMatch(error -> error.contains("실 source에 없는"));
    }

    @Test
    void staticTypedIdentityContractFailsClosedForEveryMissingParentProducerAndArityBoundary()
            throws Exception {
        MappingValidator validator = validatorWithCatalog(
                "tb_conflict", "legacy_id",
                "tb_conflict", "target_id",
                "tb_missing_parent_child", "child_id",
                "tb_missing_parent_child", "parent_id",
                "tb_parent_without_identity", "payload",
                "tb_parent_without_identity_child", "child_id",
                "tb_parent_without_identity_child", "parent_id",
                "tb_arity", "tenant_id",
                "tb_arity", "target_id",
                "tb_no_identity", "payload");

        CompositeForeignKey orphanForeignKey = new CompositeForeignKey(
                "missing_parent",
                List.of(component("PARENT_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(component("parent_id", IdentityValueType.SIGNED_INTEGER)));
        TableMapping noIdentity = new TableMapping(
                "legacy_no_identity", "tb_no_identity", null, null, List.of(), null,
                List.of(), null, null, List.of(orphanForeignKey));

        IdentityStrategy emptyPreserve = new IdentityStrategy(
                TargetIdentityPolicy.PRESERVE, List.of(), List.of());
        TableMapping conflict = new TableMapping(
                "legacy_conflict", "tb_conflict", null, null, List.of(), null,
                List.of(), new IdStrategy("legacy_id", "GEN", "legacy_id"),
                emptyPreserve, List.of());

        IdentityStrategy remap = new IdentityStrategy(
                TargetIdentityPolicy.REMAP,
                List.of(component("LEGACY_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(component("child_id", IdentityValueType.SIGNED_INTEGER)));
        TableMapping missingParent = new TableMapping(
                "legacy_missing_parent_child", "tb_missing_parent_child", null, null,
                List.of("LEGACY_ID"), null, List.of(), null, remap, List.of(orphanForeignKey));

        TableMapping parentWithoutIdentity = new TableMapping(
                "legacy_parent_without_identity", "tb_parent_without_identity", null,
                List.of(new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)), null);
        CompositeForeignKey pointsToUntypedParent = new CompositeForeignKey(
                "legacy_parent_without_identity",
                List.of(component("PARENT_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(component("parent_id", IdentityValueType.SIGNED_INTEGER)));
        IdentityStrategy childIdentity = new IdentityStrategy(
                TargetIdentityPolicy.PRESERVE,
                List.of(component("CHILD_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(component("child_id", IdentityValueType.SIGNED_INTEGER)));
        TableMapping untypedParentChild = new TableMapping(
                "legacy_parent_without_identity_child", "tb_parent_without_identity_child",
                null, null, List.of("CHILD_ID"), null, List.of(), null,
                childIdentity, List.of(pointsToUntypedParent));

        IdentityStrategy arityMismatch = new IdentityStrategy(
                TargetIdentityPolicy.PRESERVE,
                List.of(component("TENANT_ID", IdentityValueType.TEXT),
                        component("LEGACY_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(component("target_id", IdentityValueType.SIGNED_INTEGER)));
        TableMapping arity = new TableMapping(
                "legacy_arity", "tb_arity", null, null,
                List.of("TENANT_ID", "LEGACY_ID"), null, List.of(), null,
                arityMismatch, List.of());

        ValidationResult result = validator.validate(new MappingSpec(
                null, null,
                List.of(noIdentity, conflict, missingParent, parentWithoutIdentity,
                        untypedParentChild, arity), Map.of()));

        assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                .contains("legacy_no_identity", "typed identity가 필수"));
        assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                .contains("legacy_conflict", "legacy idStrategy", "함께 선언"));
        assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                .contains("legacy_conflict", "sourceComponents", "비어"));
        assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                .contains("legacy_missing_parent_child", "REMAP", "값 생성 mapping 없음"));
        assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                .contains("legacy_missing_parent_child", "parent mapping 없음"));
        assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                .contains("legacy_parent_without_identity_child", "parent typed identity 없음"));
        assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                .contains("legacy_arity", "PRESERVE identity", "arity 불일치"));
    }

    private MappingValidator validatorWithCatalog(String... tableColumnPairs) throws Exception {
        if (tableColumnPairs.length % 2 != 0) {
            throw new IllegalArgumentException("table/column pairs required");
        }
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < tableColumnPairs.length; i += 2) {
            if (i > 0) {
                json.append(',');
            }
            json.append("{\"table_name\":\"").append(tableColumnPairs[i])
                    .append("\",\"column_name\":\"").append(tableColumnPairs[i + 1]).append("\"}");
        }
        json.append(']');
        Path catalog = temp.resolve("db-columns-" + SEQUENCE.incrementAndGet() + ".json");
        Files.writeString(catalog, json);
        return new MappingValidator(new TransformerRegistry(), catalog.toString());
    }

    private static TableMapping validParent() {
        return table(
                "legacy_parent", "tb_parent",
                new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                        List.of(component("TENANT_ID", IdentityValueType.TEXT),
                                component("LEGACY_NO", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("tenant_id", IdentityValueType.TEXT),
                                component("parent_id", IdentityValueType.SIGNED_INTEGER))),
                List.of(),
                List.of(new ColumnMapping("TENANT_ID", "tenant_id", null, null, null, null, null),
                        new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)));
    }

    private static TableMapping table(
            String source,
            String target,
            IdentityStrategy identity,
            List<CompositeForeignKey> foreignKeys,
            List<ColumnMapping> columns
    ) {
        return new TableMapping(
                source, target, null, null, identity.sourceComponents().stream()
                        .map(IdentityComponentSpec::column).toList(), null,
                columns, null, identity, foreignKeys);
    }

    private static IdentityComponentSpec component(String column, IdentityValueType type) {
        return new IdentityComponentSpec(column, type);
    }

    private static JdbcTemplate h2() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:typed_validation_" + SEQUENCE.incrementAndGet()
                        + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        dataSource.setDriverClassName("org.h2.Driver");
        return new JdbcTemplate(dataSource);
    }

    private static void add(
            List<JdbcColumn> columns,
            List<IdentityComponentSpec> components,
            IdentityValueType type,
            int... jdbcTypes
    ) {
        for (int jdbcType : jdbcTypes) {
            String name = type.externalName() + "_" + jdbcType;
            columns.add(new JdbcColumn(name, jdbcType, "TYPE_" + jdbcType));
            components.add(component(name, type));
        }
    }

    private static JdbcTemplate metadataJdbc(List<JdbcColumn> columns) throws Exception {
        return metadataJdbc(columns, new MetadataIdentity(
                null, null, "legacy", "app", "legacy", "app", "legacy_table"));
    }

    private static JdbcTemplate metadataJdbc(List<JdbcColumn> columns, MetadataIdentity identity) throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        ResultSet rows = mock(ResultSet.class);
        AtomicInteger cursor = new AtomicInteger(-1);

        given(dataSource.getConnection()).willReturn(connection);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getCatalog()).willReturn(identity.defaultCatalog());
        given(connection.getSchema()).willReturn(identity.defaultSchema());
        given(metadata.getDatabaseProductName()).willReturn(identity.product());
        given(metadata.getDriverName()).willReturn(identity.driver());
        given(metadata.getColumns(any(), any(), any(), any())).willReturn(rows);
        given(rows.next()).willAnswer(ignored -> cursor.incrementAndGet() < columns.size());
        given(rows.getString("TABLE_CAT")).willReturn(identity.catalog());
        given(rows.getString("TABLE_SCHEM")).willReturn(identity.schema());
        given(rows.getString("TABLE_NAME")).willReturn(identity.table());
        given(rows.getString("COLUMN_NAME")).willAnswer(ignored -> columns.get(cursor.get()).name());
        given(rows.getInt("DATA_TYPE")).willAnswer(ignored -> columns.get(cursor.get()).jdbcType());
        given(rows.getString("TYPE_NAME")).willAnswer(ignored -> columns.get(cursor.get()).typeName());
        return new JdbcTemplate(dataSource);
    }

    private record JdbcColumn(String name, int jdbcType, String typeName) {}

    private record MetadataIdentity(String product, String driver, String defaultCatalog, String defaultSchema,
                                    String catalog, String schema, String table) {}
}
