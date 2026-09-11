package nuri.api.schema;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import nuri.business.security.authorization.PermissionCodes;
import org.flywaydb.core.Flyway;
import org.springframework.core.io.ClassPathResource;

/** 명시적인 격리 DB 리허설 전용. 운영 승인 증거를 생성하지 않는다. */
public final class AuthorizationCutoverTestSupport {
    private AuthorizationCutoverTestSupport() {}

    /** Disposable current-schema tests preserve expansion evidence until the real Contract succeeds. */
    public static void migrate(Flyway flyway) throws SQLException {
        Flyway.configure().configuration(flyway.getConfiguration()).target("2.99").load().migrate();
        try (Connection connection = flyway.getConfiguration().getDataSource().getConnection()) {
            boolean legacy;
            try (var statement = connection.createStatement();
                 var rows = statement.executeQuery("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' "
                         + "AND table_name IN ('tb_user_authrt_map','tb_authrt_role_map','tb_menu_crt_dtl','tb_role_prgrm_map','tb_role_hierarchy','tb_role_info')")) {
                if (!rows.next()) throw new IllegalStateException("Cannot inspect the isolated authorization schema");
                legacy = rows.getLong(1)>0;
            }
            if (legacy) apply(connection);
            try (var statement = connection.createStatement();
                 var rows = statement.executeQuery("SELECT count(*) FROM tb_authrt_chg_hstry "
                         + "WHERE chg_artcl_nm='legacy_authorization_contract' AND chg_type_cd='UPDATE'")) {
                if (!rows.next() || rows.getLong(1)!=1) throw new IllegalStateException("Authorization rehearsal evidence is missing");
            }
        } catch (IOException failure) {
            throw new IllegalStateException("Cannot read the actual authorization Contract",failure);
        }
        flyway.migrate();
    }

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
