package nuri.migration.postgres;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.postgres.TargetStandardSnapshot.ContractStatus;
import nuri.migration.postgres.TargetStandardSnapshot.StandardStatus;
import nuri.migration.postgres.TargetStandardSnapshot.TableContract;
import nuri.migration.postgres.TargetStandardSnapshot.TermStatus;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ValidationResult;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 실제 PostgreSQL 의 information_schema·표준 사전으로 표준 계약을 읽고 검증한다(DEC-OPS-307).
 *
 * <p>단위 시험의 fixture 가 실제 카탈로그와 같은 모양인지, 그리고 계약이 승인 digest 에 결속돼
 * plan 뒤의 스키마·사전 변경이 드러나는지를 여기서 확인한다.
 */
@Testcontainers
class TargetStandardPostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private final PostgresTargetSchemaFingerprinter fingerprints = new PostgresTargetSchemaFingerprinter();
    private final MappingValidator validator = new MappingValidator(new TransformerRegistry(), "unused.json");

    @Test
    void liveContractAndDictionaryRejectSilentStandardBreaks() throws Exception {
        try (Connection connection = open()) {
            createStandardSchema(connection, "std_reject");
            TargetSchemaFingerprint target = fingerprints.fingerprintBound(
                    connection, mapping("std_reject", plainMapping()), Set.of("std_reject"));

            ValidationResult result = validator.validateTargetStandard(
                    mapping("std_reject", plainMapping()), target, inventory(100, 4));

            assertThat(result.errors()).containsExactly(
                    "기본값 없는 NOT NULL 타깃 컬럼을 채우는 매핑·const 가 없습니다: std_reject.tb_item.frst_rgtr_id",
                    "값의 선언 최대 길이가 타깃보다 깁니다: std_reject.tb_item.item_nm — 값 100,"
                            + " 표준 도메인 명V50 길이 50",
                    "소수 자릿수가 타깃보다 많아 반올림됩니다: std_reject.tb_item.amt — 값 4, 표준 도메인 수N15,2 2");
            assertThat(result.warnings())
                    .containsExactly("표준 용어가 없는 타깃 컬럼(도메인 대조 생략): std_reject.tb_item.item_id");
            TableContract table = target.standard().table("std_reject", "tb_item");
            assertThat(table.standard()).isEqualTo(StandardStatus.PRESENT);
            assertThat(table.column("crt_dt").hasDefault()).isTrue();
            assertThat(table.column("item_sn").identityGeneration()).isEqualTo("BY DEFAULT");
            assertThat(table.column("item_nm").characterMaximumLength()).isEqualTo(200);
            assertThat(table.column("amt").numericScale()).isEqualTo(6);
            assertThat(table.column("item_nm").term().domainName()).isEqualTo("명V50");
        }
    }

    @Test
    void conformingMappingPasses() throws Exception {
        try (Connection connection = open()) {
            createStandardSchema(connection, "std_pass");
            List<ColumnMapping> columns = List.of(
                    new ColumnMapping("ITEM_ID", "item_id", null, null, null, null, null),
                    new ColumnMapping("ITEM_NM", "item_nm", null, null, null, null, null),
                    new ColumnMapping("AMOUNT", "amt", null, null, null, null, null),
                    new ColumnMapping(null, "frst_rgtr_id", null, null, null, null, "MIGRATION"));
            TargetSchemaFingerprint target = fingerprints.fingerprintBound(
                    connection, mapping("std_pass", columns), Set.of("std_pass"));

            assertThat(validator.validateTargetStandard(mapping("std_pass", columns), target, inventory(50, 2))
                    .errors()).isEmpty();
        }
    }

    @Test
    void schemaAndDictionaryChangesAfterPlanChangeTheApprovalDigest() throws Exception {
        try (Connection connection = open(); Statement statement = connection.createStatement()) {
            createStandardSchema(connection, "std_digest");
            MappingSpec mapping = mapping("std_digest", plainMapping());
            String approved = fingerprints.fingerprintBound(connection, mapping, Set.of("std_digest")).digest();

            statement.execute("UPDATE std_digest.meta_standard_domains SET data_length = 60 WHERE domain_name = '명V50'");
            String dictionaryChanged = fingerprints.fingerprintBound(connection, mapping, Set.of("std_digest")).digest();
            statement.execute("UPDATE std_digest.meta_standard_domains SET data_length = 50 WHERE domain_name = '명V50'");
            assertThat(fingerprints.fingerprintBound(connection, mapping, Set.of("std_digest")).digest())
                    .isEqualTo(approved);

            statement.execute("ALTER TABLE std_digest.tb_item ALTER COLUMN frst_rgtr_id SET DEFAULT 'SYSTEM'");
            String defaultAdded = fingerprints.fingerprintBound(connection, mapping, Set.of("std_digest")).digest();

            assertThat(dictionaryChanged).isNotEqualTo(approved);
            assertThat(defaultAdded).isNotEqualTo(approved);
        }
    }

    @Test
    void absentDictionarySkipsDomainChecksButHalfDictionaryFailsClosed() throws Exception {
        try (Connection connection = open(); Statement statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA std_absent");
            statement.execute("CREATE SCHEMA std_half");
            for (String schema : List.of("std_absent", "std_half")) {
                statement.execute("CREATE TABLE " + schema + ".tb_item (item_id varchar(20) PRIMARY KEY,"
                        + " item_nm varchar(200))");
            }
            statement.execute("CREATE TABLE std_half.meta_standard_terms (eng_abbr varchar(100), domain_name varchar(100))");
            List<ColumnMapping> columns = List.of(
                    new ColumnMapping("ITEM_ID", "item_id", null, null, null, null, null),
                    new ColumnMapping("ITEM_NM", "item_nm", null, null, null, null, null));

            TargetSchemaFingerprint absent = fingerprints.fingerprintBound(
                    connection, mapping("std_absent", columns), Set.of("std_absent"));
            TargetSchemaFingerprint half = fingerprints.fingerprintBound(
                    connection, mapping("std_half", columns), Set.of("std_half"));

            assertThat(absent.standard().table("std_absent", "tb_item").standard()).isEqualTo(StandardStatus.ABSENT);
            ValidationResult absentResult = validator.validateTargetStandard(
                    mapping("std_absent", columns), absent, inventory(100, 2));
            assertThat(absentResult.errors()).isEmpty();
            assertThat(absentResult.warnings()).isEmpty();
            assertThat(validator.validateTargetStandard(mapping("std_half", columns), half, inventory(100, 2))
                    .errors()).containsExactly(
                    "표준 사전이 불완전합니다(meta_standard_terms·meta_standard_domains 중 하나만 있음): std_half");
        }
    }

    @Test
    void privilegeHiddenDictionaryOrColumnsFailClosed() throws Exception {
        try (Connection connection = open(); Statement statement = connection.createStatement()) {
            createStandardSchema(connection, "std_private");
            statement.execute("CREATE ROLE std_reader");
            statement.execute("GRANT USAGE ON SCHEMA std_private TO std_reader");
            statement.execute("GRANT SELECT (item_id, item_nm) ON std_private.tb_item TO std_reader");
            Map<String, Set<String>> jdbcColumns = Map.of("std_private.tb_item",
                    Set.of("item_id", "item_nm", "frst_rgtr_id", "crt_dt", "item_sn", "amt"));
            statement.execute("SET ROLE std_reader");
            try {
                TargetStandardSnapshot hidden = new PostgresTargetStandardReader().read(
                        connection, Map.of("std_private", Set.of("tb_item")), jdbcColumns);

                TableContract table = hidden.table("std_private", "tb_item");
                assertThat(table.contract()).isEqualTo(ContractStatus.INCOMPLETE);
                assertThat(table.standard()).isEqualTo(StandardStatus.UNREADABLE);
            } finally {
                statement.execute("RESET ROLE");
            }
            TargetStandardSnapshot unreadable = new PostgresTargetStandardReader().read(
                    connection, Map.of("std_private", Set.of("tb_missing")), Map.of());
            assertThat(unreadable.table("std_private", "tb_missing").contract())
                    .isEqualTo(ContractStatus.UNREADABLE);
        }
    }

    @Test
    void duplicatedTermsAndDomainsAreReportedAsUndecidable() throws Exception {
        try (Connection connection = open(); Statement statement = connection.createStatement()) {
            createStandardSchema(connection, "std_dup");
            statement.execute("INSERT INTO std_dup.meta_standard_terms (id, term_name, eng_abbr, domain_name)"
                    + " VALUES (10, '항목번호', 'ITEM_ID', '번호V20'), (11, '항목식별', 'ITEM_ID', '번호V20'),"
                    + " (12, '등록자', 'FRST_RGTR_ID', '명V99'), (13, '일련', 'ITEM_SN', '번호V22')");
            statement.execute("INSERT INTO std_dup.meta_standard_domains (id, domain_name, data_type, data_length)"
                    + " VALUES (20, '번호V22', 'VARCHAR', 22), (21, '번호V22', 'VARCHAR', 23)");

            TargetSchemaFingerprint target = fingerprints.fingerprintBound(
                    connection, mapping("std_dup", plainMapping()), Set.of("std_dup"));
            TableContract table = target.standard().table("std_dup", "tb_item");

            assertThat(table.column("item_id").term().status()).isEqualTo(TermStatus.AMBIGUOUS);
            assertThat(table.column("frst_rgtr_id").term().status()).isEqualTo(TermStatus.DOMAIN_MISSING);
            assertThat(table.column("item_sn").term().status()).isEqualTo(TermStatus.DOMAIN_AMBIGUOUS);
            assertThat(table.column("crt_dt").term()).isNull();
        }
    }

    private static void createStandardSchema(Connection connection, String schema) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            statement.execute("CREATE TABLE " + schema + ".meta_standard_domains (id integer NOT NULL,"
                    + " domain_group varchar(100), domain_name varchar(100), data_type varchar(50), data_length integer)");
            statement.execute("CREATE TABLE " + schema + ".meta_standard_terms (id integer NOT NULL,"
                    + " term_name varchar(255), eng_name varchar(255), eng_abbr varchar(100), description text,"
                    + " domain_name varchar(100))");
            statement.execute("INSERT INTO " + schema + ".meta_standard_domains VALUES"
                    + " (1, '명', '명V50', 'VARCHAR', 50), (2, '수', '수N15,2', 'NUMERIC', 15)");
            statement.execute("INSERT INTO " + schema + ".meta_standard_terms (id, term_name, eng_abbr, domain_name)"
                    + " VALUES (1, '항목명', 'ITEM_NM', '명V50'), (2, '금액', 'AMT', '수N15,2')");
            statement.execute("CREATE TABLE " + schema + ".tb_item (item_id varchar(20) PRIMARY KEY,"
                    + " item_nm varchar(200), frst_rgtr_id varchar(20) NOT NULL,"
                    + " crt_dt timestamp NOT NULL DEFAULT now(),"
                    + " item_sn bigint GENERATED BY DEFAULT AS IDENTITY, amt numeric(15,6))");
        }
    }

    private static List<ColumnMapping> plainMapping() {
        return List.of(
                new ColumnMapping("ITEM_ID", "item_id", null, null, null, null, null),
                new ColumnMapping("ITEM_NM", "item_nm", null, null, null, null, null),
                new ColumnMapping("AMOUNT", "amt", null, null, null, null, null));
    }

    private static MappingSpec mapping(String schema, List<ColumnMapping> columns) {
        MappingSpec.DbConfig target = new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
                POSTGRES.getPassword(), "org.postgresql.Driver", "standard-probe");
        return new MappingSpec(null, target, List.of(new TableMapping(
                "legacy.legacy_item", schema + ".tb_item", null, columns, null)), Map.of());
    }

    private static CatalogSnapshot inventory(long nameLength, int amountScale) {
        CatalogObject table = new CatalogObject(ObjectKind.TABLE, "db", "legacy", "legacy_item", false, null, null,
                List.of(), Map.of());
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-13T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("Oracle", "19", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), List.of(table,
                column("ITEM_ID", Types.VARCHAR, 20, 0),
                column("ITEM_NM", Types.VARCHAR, nameLength, 0),
                column("AMOUNT", Types.NUMERIC, 8 + amountScale, amountScale)), List.of());
    }

    private static CatalogObject column(String name, int jdbcType, long size, int scale) {
        return new CatalogObject(ObjectKind.COLUMN, "db", "legacy", "legacy_item." + name, false, null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", "legacy_item")),
                Map.of("originalName", name, "jdbcType", Integer.toString(jdbcType),
                        "size", Long.toString(size), "scale", Integer.toString(scale)));
    }

    private static Connection open() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }
}
