package nuri.migration.schema;

import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** migration-tool 전용 Flyway bootstrap과 물리 구조 fail-closed 검증. */
public final class MigrationSchemaManager {

    public static final String HISTORY_TABLE = "tb_migration_schema_history";
    private static final String LOCATION = "classpath:db/migration-tool";
    private static final Map<String, List<String>> REQUIRED_PRIMARY_KEYS = Map.of(
            "tb_migration_key_map", List.of("run_id", "source_namespace", "source_table", "legacy_key"),
            "tb_migration_run", List.of("run_id", "source_namespace"),
            "tb_migration_checkpoint", List.of("run_id", "source_namespace", "source_table", "source_key"));
    private static final Map<String, Set<String>> REQUIRED_COLUMNS = Map.of(
            "tb_migration_key_map", Set.of(
                    "run_id", "source_namespace", "source_table", "legacy_key", "new_key"),
            "tb_migration_run", Set.of(
                    "run_id", "source_namespace", "run_stts_cd", "frst_reg_dt", "last_mdfcn_dt"),
            "tb_migration_checkpoint", Set.of(
                    "run_id", "source_namespace", "source_table", "source_key", "target_table",
                    "target_key", "row_checksum", "frst_reg_dt"));

    public void migrateAndValidate(JdbcTemplate target) {
        DataSource dataSource = target.getDataSource();
        if (dataSource == null) {
            throw new IllegalStateException("target DataSource가 없어 migration schema를 검증할 수 없습니다");
        }
        preflightLegacyKeyMap(dataSource);
        Flyway.configure()
                .dataSource(dataSource)
                .locations(LOCATION)
                .table(HISTORY_TABLE)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .validateMigrationNaming(true)
                .load()
                .migrate();
        validateRequiredStructure(dataSource);
    }

    private static void preflightLegacyKeyMap(DataSource dataSource) {
        Set<String> columns = columns(dataSource, "tb_migration_key_map");
        if (!columns.isEmpty()
                && (!columns.contains("run_id") || !columns.contains("source_namespace"))) {
            throw new IllegalStateException(
                    "legacy 3-column tb_migration_key_map 감지: run_id/source_namespace가 없어 "
                            + "실행 간 키 충돌을 방지할 수 없습니다. 승인된 schema 전환 후 재실행하세요");
        }
    }

    private static void validateRequiredStructure(DataSource dataSource) {
        for (Map.Entry<String, Set<String>> expected : REQUIRED_COLUMNS.entrySet()) {
            Set<String> actual = columns(dataSource, expected.getKey());
            Set<String> missing = new LinkedHashSet<>(expected.getValue());
            missing.removeAll(actual);
            if (!missing.isEmpty()) {
                throw new IllegalStateException(expected.getKey()
                        + " migration schema 필수 컬럼 누락: " + missing);
            }
            List<String> actualPk = primaryKey(dataSource, expected.getKey());
            List<String> expectedPk = REQUIRED_PRIMARY_KEYS.get(expected.getKey());
            if (!actualPk.equals(expectedPk)) {
                throw new IllegalStateException(expected.getKey()
                        + " migration schema PK 불일치: expected=" + expectedPk + ", actual=" + actualPk);
            }
        }
    }

    private static Set<String> columns(DataSource dataSource, String table) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();
            Set<String> columns = new LinkedHashSet<>();
            for (String candidate : caseVariants(table)) {
                try (ResultSet result = metadata.getColumns(
                        connection.getCatalog(), connection.getSchema(), candidate, null)) {
                    while (result.next()) {
                        if (table.equalsIgnoreCase(result.getString("TABLE_NAME"))) {
                            columns.add(normalize(result.getString("COLUMN_NAME")));
                        }
                    }
                }
                if (!columns.isEmpty()) {
                    break;
                }
            }
            return columns;
        } catch (SQLException e) {
            throw new IllegalStateException("migration schema metadata column 조회 실패: " + table, e);
        }
    }

    private static List<String> primaryKey(DataSource dataSource, String table) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();
            Map<Integer, String> ordered = new LinkedHashMap<>();
            for (String candidate : caseVariants(table)) {
                try (ResultSet result = metadata.getPrimaryKeys(
                        connection.getCatalog(), connection.getSchema(), candidate)) {
                    while (result.next()) {
                        if (table.equalsIgnoreCase(result.getString("TABLE_NAME"))) {
                            ordered.put(result.getInt("KEY_SEQ"), normalize(result.getString("COLUMN_NAME")));
                        }
                    }
                }
                if (!ordered.isEmpty()) {
                    break;
                }
            }
            return ordered.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(Map.Entry::getValue)
                    .toList();
        } catch (SQLException e) {
            throw new IllegalStateException("migration schema metadata PK 조회 실패: " + table, e);
        }
    }

    private static List<String> caseVariants(String value) {
        return List.of(value, value.toUpperCase(Locale.ROOT), value.toLowerCase(Locale.ROOT))
                .stream().distinct().toList();
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }
}
