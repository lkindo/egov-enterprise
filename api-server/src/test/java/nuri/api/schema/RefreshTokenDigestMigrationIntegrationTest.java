package nuri.api.schema;

import nuri.business.domain.auth.RefreshTokenDigest;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V2_106 이 원문으로 저장된 리프레시 토큰 행을 지우고, 해시 저장값이 컬럼에 들어가는지 본다.
 *
 * <p>[왜 필요한가] 토큰 저장이 원문에서 SHA-256 해시로 바뀌었다(DIP D7). 남은 원문 행은 새 코드가 찾지 않지만
 * 원문 자체가 비밀이라 DB 를 읽은 사람이 재발급에 쓸 수 있다. 이 마이그레이션은 그 행을 모두 지운다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_106 원문 리프레시 토큰 폐기")
class RefreshTokenDigestMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    /** 반복 시드에 기대지 않도록 이 검증이 직접 만드는 사용자(토큰 행의 FK 대상). */
    private static final String ADMIN_ESNTL_ID = "T_RFSH_USER";

    @Test
    @DisplayName("원문 토큰 행을 모두 지우고, 이후 해시 저장값은 그대로 들어간다")
    void removesPlaintextTokensAndAcceptsDigests() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.105")));

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            statement.executeUpdate("INSERT INTO tb_user_info (esntl_id, user_id, pswd, user_nm, sbscrb_ymd)"
                    + " VALUES ('" + ADMIN_ESNTL_ID + "', 't_rfsh_user', 'x', '토큰 사용자', '20260925')");
            statement.executeUpdate("INSERT INTO tb_auth_rfsh_tk (user_id, rfsh_tkn, exprtn_dt)"
                    + " VALUES ('" + ADMIN_ESNTL_ID + "', 'eyJhbGciOiJIUzI1NiJ9.plaintext.signature',"
                    + " CURRENT_TIMESTAMP + INTERVAL '7 days')");
            assertThat(count(statement, "SELECT count(*) FROM tb_auth_rfsh_tk")).as("준비된 원문 행").isEqualTo(1);
        }

        flyway(null).migrate();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT count(*) FROM tb_auth_rfsh_tk")).as("원문 행이 남았다").isZero();

            String digest = RefreshTokenDigest.of("eyJhbGciOiJIUzI1NiJ9.rotated.signature");
            statement.executeUpdate("INSERT INTO tb_auth_rfsh_tk (user_id, rfsh_tkn, exprtn_dt)"
                    + " VALUES ('" + ADMIN_ESNTL_ID + "', '" + digest + "', CURRENT_TIMESTAMP + INTERVAL '7 days')");
            assertThat(count(statement, "SELECT count(*) FROM tb_auth_rfsh_tk WHERE rfsh_tkn ~ '^[0-9a-f]{64}$'"))
                    .as("해시 저장값은 64자 16진수로 들어간다").isEqualTo(1);
        }
    }

    private long count(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getLong(1);
        }
    }
}
