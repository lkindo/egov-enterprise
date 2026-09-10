package nuri.api.schema;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import nuri.business.security.authorization.PermissionCodes;
import org.springframework.core.io.ClassPathResource;

/** 명시적인 격리 DB 리허설 전용. 운영 승인 증거를 생성하지 않는다. */
public final class AuthorizationCutoverTestSupport {
    private AuthorizationCutoverTestSupport() {}

    public static void apply(Connection connection) throws SQLException, IOException {
        configureEvidence(connection);
        execute(connection);
    }

    static void configureEvidence(Connection connection) throws SQLException {
        try (var statement = connection.prepareStatement("SELECT set_config('app.authorization_cutover_evidence',?,false),"
                + "set_config('app.authorization_backup_sha256',?,false),set_config('app.authorization_catalog_version',?,false)")) {
            statement.setString(1, "a".repeat(64));
            statement.setString(2, "b".repeat(64));
            statement.setString(3, PermissionCodes.CATALOG_VERSION);
            statement.execute();
        }
    }

    static void execute(Connection connection) throws SQLException, IOException {
        String sql;
        try (var stream = new ClassPathResource("db/cutover/authorization-contract.sql").getInputStream()) {
            sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
        try (var statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }
}
