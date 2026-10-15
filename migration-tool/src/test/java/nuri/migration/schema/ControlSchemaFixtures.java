package nuri.migration.schema;

import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * 제어 스키마 시험 보조(ADR-0029 L3c). 이전 도구가 남긴 V1 제어 스키마를 이 도구와 같은 Flyway 설정으로 만든다 — 업그레이드
 * 확인과 V2 백필을 실제 이력 위에서 증명하기 위해서다.
 */
public final class ControlSchemaFixtures {

    private ControlSchemaFixtures() {
    }

    /** V1 까지만 적용한 제어 스키마. {@code physicalSchema} 는 H2 면 대문자, PostgreSQL 이면 소문자다. */
    public static void createV1(JdbcTemplate target, String physicalSchema) {
        Flyway.configure()
                .dataSource(target.getDataSource())
                .locations("classpath:db/migration-tool")
                .schemas(physicalSchema)
                .defaultSchema(physicalSchema)
                .createSchemas(true)
                .table(MigrationSchemaManager.HISTORY_TABLE)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .target("1")
                .load()
                .migrate();
    }

    /** 이력에 성공으로 남은 가장 높은 버전. */
    public static String appliedVersion(JdbcTemplate target) {
        List<String> versions = target.queryForList("SELECT \"version\" FROM migration_control.\""
                + MigrationSchemaManager.HISTORY_TABLE + "\" WHERE \"success\"=true AND \"version\" <> '0'",
                String.class);
        return versions.stream().max((left, right) -> Integer.compare(Integer.parseInt(left),
                Integer.parseInt(right))).orElse(null);
    }

    /** checkpoint 표의 PK 컬럼(순서대로, 소문자). */
    public static List<String> checkpointPrimaryKey(JdbcTemplate target) {
        return target.execute((Connection connection) -> {
            DatabaseMetaData metadata = connection.getMetaData();
            Map<Integer, String> ordered = new TreeMap<>();
            for (String schema : List.of("migration_control", "MIGRATION_CONTROL")) {
                for (String table : List.of("tb_migration_checkpoint", "TB_MIGRATION_CHECKPOINT")) {
                    try (ResultSet keys = metadata.getPrimaryKeys(connection.getCatalog(), schema, table)) {
                        while (keys.next()) {
                            ordered.put(keys.getInt("KEY_SEQ"), keys.getString("COLUMN_NAME").toLowerCase(Locale.ROOT));
                        }
                    }
                }
            }
            return new ArrayList<>(ordered.values());
        });
    }

    /** checkpoint 표에 이 컬럼이 있는가. */
    public static boolean checkpointHasColumn(JdbcTemplate target, String column) {
        Long count = target.queryForObject("SELECT count(*) FROM information_schema.columns"
                + " WHERE lower(table_schema)='migration_control' AND lower(table_name)='tb_migration_checkpoint'"
                + " AND lower(column_name)=?", Long.class, column.toLowerCase(Locale.ROOT));
        return count != null && count > 0;
    }
}
