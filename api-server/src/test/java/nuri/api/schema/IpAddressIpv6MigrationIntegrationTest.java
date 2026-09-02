package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@DisplayName("IP 주소 VARCHAR(45) IPv6 확장 마이그레이션")
class IpAddressIpv6MigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String LEGACY_VALUE = "123456789012345678901234567890";
    private static final String FULL_IPV6 = "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff";
    private static final String POLICY_USER_ID = "webmaster";
    private static final String WEB_LOG_URL = "/schema-fixture/ipv6-legacy-web";

    @Test
    @DisplayName("기존 30자 값을 보존하고 5개 컬럼·메타 계약에서 39자 IPv6를 수용한다")
    void expandsAllIpColumnsWithoutLosingLegacyValues() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.85")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertIpColumnLengths(statement, 30);
            assertThat(singleInt(statement,
                    "SELECT count(*) FROM tb_user_info WHERE user_id='" + POLICY_USER_ID + "'"))
                    .isEqualTo(1);

            statement.executeUpdate("""
                    INSERT INTO tb_login_log (user_id, lgn_ip_addr)
                    VALUES ('ipv6-legacy-login', '%s')
                    """.formatted(LEGACY_VALUE));
            insertPolicy(connection, POLICY_USER_ID, LEGACY_VALUE);
            statement.executeUpdate("""
                    INSERT INTO tb_privacy_log (dmnd_id, dmnd_user_ip_addr)
                    VALUES ('IPV6_LEGACY_PRIVACY', '%s')
                    """.formatted(LEGACY_VALUE));
            statement.executeUpdate("""
                    INSERT INTO tb_sys_log (dmnd_id, dmnd_user_ip_addr)
                    VALUES ('IPV6_LEGACY_SYSTEM', '%s')
                    """.formatted(LEGACY_VALUE));
            statement.executeUpdate("""
                    INSERT INTO tb_web_log (url, dmnd_user_ip_addr)
                    VALUES ('%s', '%s')
                    """.formatted(WEB_LOG_URL, LEGACY_VALUE));
        }

        assertMetadataContentionIsBoundedWithoutPartialChanges();
        assertTableContentionFailsFastWithoutPartialChanges();

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertIpColumnLengths(statement, 45);
            assertLegacyValuesPreserved(statement);

            statement.executeUpdate("UPDATE tb_login_log SET lgn_ip_addr='%s' WHERE user_id='ipv6-legacy-login'"
                    .formatted(FULL_IPV6));
            updatePolicy(connection, POLICY_USER_ID, FULL_IPV6);
            statement.executeUpdate("UPDATE tb_privacy_log SET dmnd_user_ip_addr='%s' WHERE dmnd_id='IPV6_LEGACY_PRIVACY'"
                    .formatted(FULL_IPV6));
            statement.executeUpdate("UPDATE tb_sys_log SET dmnd_user_ip_addr='%s' WHERE dmnd_id='IPV6_LEGACY_SYSTEM'"
                    .formatted(FULL_IPV6));
            statement.executeUpdate("UPDATE tb_web_log SET dmnd_user_ip_addr='%s' WHERE url='%s'"
                    .formatted(FULL_IPV6, WEB_LOG_URL));

            assertThat(singleInt(statement, """
                    SELECT count(*) FROM meta_standard_domains
                    WHERE domain_group='명칭' AND domain_name='주소V45'
                      AND upper(data_type)='VARCHAR' AND data_length=45
                    """)).isEqualTo(1);
            assertThat(singleInt(statement, """
                    SELECT count(*) FROM meta_standard_terms
                    WHERE eng_abbr='IP_ADDR' OR eng_abbr LIKE '%!_IP_ADDR' ESCAPE '!'
                    """)).isEqualTo(29);
            assertThat(singleInt(statement, """
                    SELECT count(*) FROM meta_standard_terms
                    WHERE (eng_abbr='IP_ADDR' OR eng_abbr LIKE '%!_IP_ADDR' ESCAPE '!')
                      AND domain_name <> '주소V45'
                    """)).isZero();
            assertThat(singleInt(statement,
                    "SELECT count(*) FROM meta_standard_domains WHERE domain_name='주소V15'"))
                    .isEqualTo(1);
            assertStoredIpv6(statement);
        }
    }

    private void assertMetadataContentionIsBoundedWithoutPartialChanges() throws SQLException {
        try (Connection blocker = openConnection()) {
            blocker.setAutoCommit(false);
            try (Statement statement = blocker.createStatement();
                 ResultSet result = statement.executeQuery("""
                         SELECT eng_abbr
                         FROM meta_standard_terms
                         WHERE eng_abbr='IP_ADDR' OR eng_abbr LIKE '%!_IP_ADDR' ESCAPE '!'
                         ORDER BY eng_abbr
                         LIMIT 1
                         FOR UPDATE
                         """)) {
                assertThat(result.next()).isTrue();
            }

            long startedAt = System.nanoTime();
            assertThatThrownBy(() -> flyway(null).migrate())
                    .as("메타 행 경합은 lock_timeout 안에 전체 실패해야 한다")
                    .isInstanceOf(FlywayException.class);
            Duration elapsed = Duration.ofNanos(System.nanoTime() - startedAt);
            assertThat(elapsed)
                    .as("메타 행 잠금 경합 실패 시간")
                    .isLessThan(Duration.ofSeconds(15));

            assertMigrationWasRolledBack();
            blocker.rollback();
        }
    }

    private void assertTableContentionFailsFastWithoutPartialChanges() throws SQLException {
        try (Connection blocker = openConnection()) {
            blocker.setAutoCommit(false);
            try (Statement statement = blocker.createStatement()) {
                statement.execute("LOCK TABLE tb_login_policy IN ACCESS EXCLUSIVE MODE");
            }

            long startedAt = System.nanoTime();
            assertThatThrownBy(() -> flyway(null).migrate())
                    .as("한 대상 테이블이라도 사용 중이면 V2_86은 NOWAIT로 전체 실패해야 한다")
                    .isInstanceOf(FlywayException.class);
            Duration elapsed = Duration.ofNanos(System.nanoTime() - startedAt);
            assertThat(elapsed)
                    .as("잠금 경합 실패 시간")
                    .isLessThan(Duration.ofSeconds(10));

            assertMigrationWasRolledBack();

            blocker.rollback();
        }
    }

    private void assertMigrationWasRolledBack() throws SQLException {
        try (Connection verifier = openConnection();
             Statement statement = verifier.createStatement()) {
            assertIpColumnLengths(statement, 30);
            assertThat(singleInt(statement, """
                    SELECT count(*) FROM meta_standard_domains
                    WHERE domain_name='주소V45'
                    """)).isZero();
            assertThat(singleInt(statement, """
                    SELECT count(*) FROM flyway_schema_history
                    WHERE version='2.86' AND success
                    """)).isZero();
        }
    }

    private void assertIpColumnLengths(Statement statement, int expected) throws SQLException {
        for (List<String> column : List.of(
                List.of("tb_login_log", "lgn_ip_addr"),
                List.of("tb_login_policy", "ip_addr"),
                List.of("tb_privacy_log", "dmnd_user_ip_addr"),
                List.of("tb_sys_log", "dmnd_user_ip_addr"),
                List.of("tb_web_log", "dmnd_user_ip_addr"))) {
            assertThat(singleInt(statement, """
                    SELECT character_maximum_length
                    FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='%s' AND column_name='%s'
                    """.formatted(column.get(0), column.get(1))))
                    .as("%s.%s length", column.get(0), column.get(1))
                    .isEqualTo(expected);
        }
    }

    private void assertLegacyValuesPreserved(Statement statement) throws SQLException {
        assertThat(singleString(statement,
                "SELECT lgn_ip_addr FROM tb_login_log WHERE user_id='ipv6-legacy-login'"))
                .isEqualTo(LEGACY_VALUE);
        assertThat(singleString(statement,
                "SELECT ip_addr FROM tb_login_policy WHERE user_id='" + POLICY_USER_ID + "'"))
                .isEqualTo(LEGACY_VALUE);
        assertThat(singleString(statement,
                "SELECT dmnd_user_ip_addr FROM tb_privacy_log WHERE dmnd_id='IPV6_LEGACY_PRIVACY'"))
                .isEqualTo(LEGACY_VALUE);
        assertThat(singleString(statement,
                "SELECT dmnd_user_ip_addr FROM tb_sys_log WHERE dmnd_id='IPV6_LEGACY_SYSTEM'"))
                .isEqualTo(LEGACY_VALUE);
        assertThat(singleString(statement,
                "SELECT dmnd_user_ip_addr FROM tb_web_log WHERE url='" + WEB_LOG_URL + "'"))
                .isEqualTo(LEGACY_VALUE);
    }

    private void assertStoredIpv6(Statement statement) throws SQLException {
        assertThat(singleString(statement,
                "SELECT lgn_ip_addr FROM tb_login_log WHERE user_id='ipv6-legacy-login'"))
                .isEqualTo(FULL_IPV6);
        assertThat(singleString(statement,
                "SELECT ip_addr FROM tb_login_policy WHERE user_id='" + POLICY_USER_ID + "'"))
                .isEqualTo(FULL_IPV6);
        assertThat(singleString(statement,
                "SELECT dmnd_user_ip_addr FROM tb_privacy_log WHERE dmnd_id='IPV6_LEGACY_PRIVACY'"))
                .isEqualTo(FULL_IPV6);
        assertThat(singleString(statement,
                "SELECT dmnd_user_ip_addr FROM tb_sys_log WHERE dmnd_id='IPV6_LEGACY_SYSTEM'"))
                .isEqualTo(FULL_IPV6);
        assertThat(singleString(statement,
                "SELECT dmnd_user_ip_addr FROM tb_web_log WHERE url='" + WEB_LOG_URL + "'"))
                .isEqualTo(FULL_IPV6);
    }

    private void insertPolicy(Connection connection, String userId, String value) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO tb_login_policy (user_id, ip_addr) VALUES (?, ?)")) {
            statement.setString(1, userId);
            statement.setString(2, value);
            statement.executeUpdate();
        }
    }

    private void updatePolicy(Connection connection, String userId, String value) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE tb_login_policy SET ip_addr=? WHERE user_id=?")) {
            statement.setString(1, value);
            statement.setString(2, userId);
            assertThat(statement.executeUpdate()).isEqualTo(1);
        }
    }

    private int singleInt(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getInt(1);
        }
    }

    private String singleString(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }
}
