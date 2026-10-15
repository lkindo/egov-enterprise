package nuri.migration.schema;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationInfoService;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** migration-tool 전용 Flyway bootstrap과 물리 구조 fail-closed 검증. */
public final class MigrationSchemaManager {

    public static final String CONTROL_SCHEMA = "migration_control";
    public static final String HISTORY_TABLE = "tb_migration_schema_history";
    private static final String LOCATION = "classpath:db/migration-tool";
    private static final String KEY_MAP_TABLE = "tb_migration_key_map";
    private static final List<String> RUNTIME_TABLES = List.of(
            KEY_MAP_TABLE, "tb_migration_run", "tb_migration_checkpoint", HISTORY_TABLE);
    private static final Map<String, List<String>> REQUIRED_PRIMARY_KEYS = Map.of(
            KEY_MAP_TABLE, List.of("run_id", "source_namespace", "source_table", "legacy_key"),
            "tb_migration_run", List.of("run_id", "source_namespace"),
            "tb_migration_checkpoint",
            List.of("run_id", "source_namespace", "source_table", "mapping_id", "source_key"));
    private static final Map<String, Set<String>> REQUIRED_COLUMNS = Map.of(
            KEY_MAP_TABLE, Set.of(
                    "run_id", "source_namespace", "source_table", "legacy_key", "new_key"),
            "tb_migration_run", Set.of(
                    "run_id", "source_namespace", "run_stts_cd", "frst_reg_dt", "last_mdfcn_dt"),
            "tb_migration_checkpoint", Set.of(
                    "run_id", "source_namespace", "source_table", "mapping_id", "source_key", "target_table",
                    "target_key", "row_checksum", "frst_reg_dt"));

    /**
     * 대상의 제어 스키마 상태(ADR-0029 L3c). {@code appliedVersion} 은 이력에 적용된 가장 높은 버전이고 없으면 null 이다.
     * {@code upgradeRequired} 는 이미 있는 제어 스키마(적용된 버전이 있거나 checkpoint 표가 있다)에 적용할 버전이 남았다는
     * 뜻이다 — 처음 만드는 대상은 확인 없이 만든다.
     */
    public record ControlSchemaStatus(String appliedVersion, boolean upgradeRequired) {}

    /** 이미 있는 제어 스키마를 확인 없이 올리려 했다. 문구는 버전과 고정 어휘뿐이다. */
    public static final class ControlSchemaUpgradeRequired extends IllegalStateException {
        public ControlSchemaUpgradeRequired(String appliedVersion) {
            super("제어 스키마(migration_control)가 버전 " + (appliedVersion == null ? "이력 없음" : appliedVersion)
                    + " 이라 이 도구의 버전으로 올려야 합니다 — 진행 중인 run 이 없을 때 --ack-control-schema-upgrade 로"
                    + " 확인하고 적재하십시오(CONTROL_SCHEMA_UPGRADE_UNACKNOWLEDGED)");
        }
    }

    /** 확인 없이 만든다·검증한다. 이미 있는 제어 스키마를 올려야 하면 아무것도 바꾸지 않고 멈춘다. */
    public void migrateAndValidate(JdbcTemplate target) {
        migrateAndValidate(target, false);
    }

    /**
     * 제어 스키마를 만들거나 올리고 물리 구조를 검증한다. 이미 있는 제어 스키마를 올리는 일은 {@code upgradeAcknowledged}
     * 가 있을 때만 한다 — V2 는 checkpoint 의 PK 를 다시 만들므로 run 과 run 사이에 사람이 확인하고 적용한다. 적용은
     * Flyway 의 이력 잠금 아래 한 번에 하고, PostgreSQL 에서는 실패하면 통째로 되돌아간다.
     */
    public void migrateAndValidate(JdbcTemplate target, boolean upgradeAcknowledged) {
        DataSource dataSource = requireDataSource(target);
        preflightRuntimeTables(dataSource);
        Flyway flyway = flyway(dataSource);
        if (!upgradeAcknowledged) {
            ControlSchemaStatus status = status(flyway, dataSource);
            if (status.upgradeRequired()) {
                throw new ControlSchemaUpgradeRequired(status.appliedVersion());
            }
        }
        flyway.migrate();
        validateRequiredStructure(dataSource);
    }

    /** 읽기만 해서 제어 스키마 상태를 알려 준다. 실행 증거의 적용 전후 버전과 적재 전 확인 게이트가 쓴다. */
    public ControlSchemaStatus inspect(JdbcTemplate target) {
        DataSource dataSource = requireDataSource(target);
        return status(flyway(dataSource), dataSource);
    }

    private static ControlSchemaStatus status(Flyway flyway, DataSource dataSource) {
        MigrationInfoService info = flyway.info();
        String applied = null;
        for (MigrationInfo migration : info.applied()) {
            // schema 생성·baseline 같은 합성 기록은 적용한 버전이 아니다.
            if (migration.getVersion() != null && !migration.getType().isSynthetic()
                    && !migration.getType().isBaseline()) {
                applied = migration.getVersion().getVersion();
            }
        }
        boolean existing = applied != null
                || !columns(dataSource, CONTROL_SCHEMA, "tb_migration_checkpoint").isEmpty();
        return new ControlSchemaStatus(applied, existing && info.pending().length > 0);
    }

    private static Flyway flyway(DataSource dataSource) {
        String physicalControlSchema = physicalIdentifier(dataSource, CONTROL_SCHEMA);
        return Flyway.configure()
                .dataSource(dataSource)
                .locations(LOCATION)
                .schemas(physicalControlSchema)
                .defaultSchema(physicalControlSchema)
                .createSchemas(true)
                .table(HISTORY_TABLE)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .validateMigrationNaming(true)
                .load();
    }

    private static DataSource requireDataSource(JdbcTemplate target) {
        DataSource dataSource = target.getDataSource();
        if (dataSource == null) {
            throw new IllegalStateException("target DataSource가 없어 migration schema를 검증할 수 없습니다");
        }
        return dataSource;
    }

    private static void preflightRuntimeTables(DataSource dataSource) {
        List<TableLocation> locations = runtimeTableLocations(dataSource);
        for (TableLocation location : locations) {
            if (!KEY_MAP_TABLE.equalsIgnoreCase(location.table())) {
                continue;
            }
            Set<String> columns = columns(dataSource, location.schema(), location.table());
            if (!columns.contains("run_id") || !columns.contains("source_namespace")) {
                throw new IllegalStateException(
                        "legacy 3-column tb_migration_key_map 감지(" + location.displayName() + "): "
                                + "run_id/source_namespace가 없어 실행 간 키 충돌을 방지할 수 없습니다. "
                                + "승인된 schema 전환 후 재실행하세요");
            }
        }
        for (TableLocation location : locations) {
            if (!CONTROL_SCHEMA.equalsIgnoreCase(location.schema())) {
                throw new IllegalStateException(
                        "migration runtime table " + location.displayName() + " 이(가) 전용 schema 밖에 있습니다. "
                                + "기존 상태를 migration_control로 승인된 절차에 따라 전환한 뒤 재실행하세요");
            }
        }
    }

    private static String physicalIdentifier(DataSource dataSource, String identifier) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();
            if (metadata.storesUpperCaseIdentifiers()) {
                return identifier.toUpperCase(Locale.ROOT);
            }
            if (metadata.storesLowerCaseIdentifiers()) {
                return identifier.toLowerCase(Locale.ROOT);
            }
            return identifier;
        } catch (SQLException e) {
            throw new IllegalStateException("migration control schema identifier 판정 실패", e);
        }
    }

    private static void validateRequiredStructure(DataSource dataSource) {
        for (Map.Entry<String, Set<String>> expected : REQUIRED_COLUMNS.entrySet()) {
            Set<String> actual = columns(dataSource, CONTROL_SCHEMA, expected.getKey());
            Set<String> missing = new LinkedHashSet<>(expected.getValue());
            missing.removeAll(actual);
            if (!missing.isEmpty()) {
                throw new IllegalStateException(expected.getKey()
                        + " migration schema 필수 컬럼 누락: " + missing);
            }
            List<String> actualPk = primaryKey(dataSource, CONTROL_SCHEMA, expected.getKey());
            List<String> expectedPk = REQUIRED_PRIMARY_KEYS.get(expected.getKey());
            if (!actualPk.equals(expectedPk)) {
                throw new IllegalStateException(expected.getKey()
                        + " migration schema PK 불일치: expected=" + expectedPk + ", actual=" + actualPk);
            }
        }
    }

    private static List<TableLocation> runtimeTableLocations(DataSource dataSource) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();
            Set<TableLocation> locations = new LinkedHashSet<>();
            for (String table : RUNTIME_TABLES) {
                for (String candidate : caseVariants(table)) {
                    try (ResultSet result = metadata.getTables(
                            connection.getCatalog(), null, candidate, null)) {
                        while (result.next()) {
                            String actualTable = result.getString("TABLE_NAME");
                            if (table.equalsIgnoreCase(actualTable)) {
                                locations.add(new TableLocation(
                                        result.getString("TABLE_SCHEM"), actualTable));
                            }
                        }
                    }
                }
            }
            return List.copyOf(locations);
        } catch (SQLException e) {
            throw new IllegalStateException("migration runtime table 위치 조회 실패", e);
        }
    }

    private static Set<String> columns(DataSource dataSource, String schema, String table) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();
            Set<String> columns = new LinkedHashSet<>();
            for (String schemaCandidate : caseVariants(schema)) {
                for (String tableCandidate : caseVariants(table)) {
                    try (ResultSet result = metadata.getColumns(
                            connection.getCatalog(), schemaCandidate, tableCandidate, null)) {
                        while (result.next()) {
                            if (sameLocation(schema, table, result)) {
                                columns.add(normalize(result.getString("COLUMN_NAME")));
                            }
                        }
                    }
                    if (!columns.isEmpty()) {
                        return columns;
                    }
                }
            }
            return columns;
        } catch (SQLException e) {
            throw new IllegalStateException("migration schema metadata column 조회 실패: " + table, e);
        }
    }

    private static List<String> primaryKey(DataSource dataSource, String schema, String table) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();
            Map<Integer, String> ordered = new LinkedHashMap<>();
            for (String schemaCandidate : caseVariants(schema)) {
                for (String tableCandidate : caseVariants(table)) {
                    try (ResultSet result = metadata.getPrimaryKeys(
                            connection.getCatalog(), schemaCandidate, tableCandidate)) {
                        while (result.next()) {
                            if (sameLocation(schema, table, result)) {
                                ordered.put(result.getInt("KEY_SEQ"), normalize(result.getString("COLUMN_NAME")));
                            }
                        }
                    }
                    if (!ordered.isEmpty()) {
                        return orderedPrimaryKey(ordered);
                    }
                }
            }
            return List.of();
        } catch (SQLException e) {
            throw new IllegalStateException("migration schema metadata PK 조회 실패: " + table, e);
        }
    }

    private static List<String> orderedPrimaryKey(Map<Integer, String> columns) {
        return columns.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(Map.Entry::getValue)
                .toList();
    }

    private static boolean sameLocation(String schema, String table, ResultSet result) throws SQLException {
        return table.equalsIgnoreCase(result.getString("TABLE_NAME"))
                && sameIdentifier(schema, result.getString("TABLE_SCHEM"));
    }

    private static boolean sameIdentifier(String left, String right) {
        return left == null ? right == null : right != null && left.equalsIgnoreCase(right);
    }

    private static List<String> caseVariants(String value) {
        if (value == null) {
            return Collections.singletonList(null);
        }
        return List.of(value, value.toUpperCase(Locale.ROOT), value.toLowerCase(Locale.ROOT))
                .stream().distinct().toList();
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private record TableLocation(String schema, String table) {
        private String displayName() {
            return (schema == null || schema.isBlank() ? "<default>" : schema) + "." + table;
        }
    }
}
