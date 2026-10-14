package nuri.migration.postgres;

import nuri.migration.validate.ledger.TermLedgerValidator.StandardTermRecord;
import org.junit.jupiter.api.Test;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 용어 매핑 원장이 대조하는 live 표준 용어를 실제 PostgreSQL 에서 읽는다(DEC-OPS-312). */
@Testcontainers
class PostgresStandardTermReaderIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private final PostgresStandardTermReader reader = new PostgresStandardTermReader();

    @Test
    void readsNameDomainAndDeprecationOfTheRequestedTermsOnly() throws Exception {
        try (Connection connection = open()) {
            execute(connection, "CREATE SCHEMA std_ext");
            execute(connection, "CREATE TABLE std_ext.meta_standard_terms (term_name varchar(255),"
                    + " eng_abbr varchar(100), domain_name varchar(100), deprecated_yn varchar(1) NOT NULL DEFAULT 'N')");
            execute(connection, "INSERT INTO std_ext.meta_standard_terms VALUES"
                    + " ('사용자ID', 'user_id', 'ID V20', 'N'), ('법정리명', 'STLI_NM', '명V100', 'Y'),"
                    + " ('기타', 'ETC_NM', '명V100', 'N')");

            Map<String, StandardTermRecord> terms = reader.read(connection, "std_ext",
                    Set.of("USER_ID", "STLI_NM", "ABSENT"));

            assertThat(terms).containsOnly(
                    Map.entry("USER_ID", new StandardTermRecord("사용자ID", "ID V20", false)),
                    Map.entry("STLI_NM", new StandardTermRecord("법정리명", "명V100", true)));
            assertThat(reader.read(connection, "std_ext", Set.of())).isEmpty();
        }
    }

    @Test
    void aDictionaryWithoutTheDeprecationColumnCannotBeTrusted() throws Exception {
        try (Connection connection = open()) {
            execute(connection, "CREATE SCHEMA std_old");
            execute(connection, "CREATE TABLE std_old.meta_standard_terms (term_name varchar(255),"
                    + " eng_abbr varchar(100), domain_name varchar(100))");

            assertThatThrownBy(() -> reader.read(connection, "std_old", Set.of("USER_ID")))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("표준 메타가 확장(V2_128) 전이라 폐기 여부를 확인할 수 없습니다");
            assertThatThrownBy(() -> reader.read(connection, "std\"; DROP", Set.of("USER_ID")))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    private static Connection open() throws Exception {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private static void execute(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }
}
