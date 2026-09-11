package nuri.api.schema;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Exact PostgreSQL menu/NAV migration, including deliberate failures after persistent writes begin. */
@Tag("schema-validation")
@DisplayName("메뉴 정보구조 이관: 복수 그룹 노출 보존·감사 원자성·명시 Contract 순서")
class MenuInformationArchitectureMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {
    private static final String RESOURCE="db/migration/V2_100__reorganize_menu_information_architecture.sql";
    private static final List<String> TABLES=List.of("tb_menu_info","tb_authrt_info","tb_authrt_grnt_map",
            "tb_authrt_user_map","tb_authrt_chg_hstry");

    @Test
    void preservesAllGroupCombinationsAndRejectsUnreviewedChangesAtomically() throws Exception {
        flyway(MigrationVersion.fromVersion("2.99")).migrate();
        String migration;
        try (var input=new ClassPathResource(RESOURCE).getInputStream()) {
            migration=new String(input.readAllBytes(),StandardCharsets.UTF_8);
        }
        var beforeContract=snapshot();
        try (Connection connection=openConnection(); Statement statement=connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                assertThatThrownBy(() -> statement.execute(migration)).isInstanceOf(SQLException.class)
                        .hasMessageContaining("requires authorization Contract");
            } finally { connection.rollback(); }
        }
        assertThat(snapshot()).isEqualTo(beforeContract);
        try (Connection connection=openConnection()) { AuthorizationCutoverTestSupport.apply(connection); }
        var before=snapshot();
        long originalMaximum;
        long auditsBefore;
        try (Connection connection=openConnection(); Statement statement=connection.createStatement()) {
            originalMaximum=number(statement,"SELECT max(menu_sn) FROM tb_menu_info");
            auditsBefore=number(statement,"SELECT count(*) FROM tb_authrt_chg_hstry");
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info")).isEqualTo(84);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION'")).isEqualTo(111);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_info")).isEqualTo(4);
        }

        // An unknown category is an explicit conflict, even if its menu ID still belongs to the reviewed inventory.
        assertRollback(migration,before,"UPDATE tb_menu_info SET menu_nm='참여' WHERE menu_sn=1000001",
                "conflicts with an existing category");
        // Moving the messages folder would otherwise restore USER's revoked community ancestor and its hidden leaves.
        assertRollback(migration,before,"DELETE FROM tb_authrt_grnt_map WHERE authrt_cd='ROLE_USER' "
                + "AND authrt_type_cd='NAVIGATION' AND authrt_grnt_cd='2000000'",
                "would lose or revive a route");
        // A downstream audit failure must roll back the preceding menu moves and grant deletes as well.
        assertRollback(migration,before,"CREATE FUNCTION reject_menu_reorganization_audit() RETURNS trigger LANGUAGE plpgsql "
                + "AS 'BEGIN IF NEW.dmnd_idntfr=''migration:2.100'' THEN RAISE EXCEPTION ''menu audit rejected''; END IF; RETURN NEW; END'; "
                + "CREATE TRIGGER reject_menu_reorganization_audit BEFORE INSERT ON tb_authrt_chg_hstry "
                + "FOR EACH ROW EXECUTE FUNCTION reject_menu_reorganization_audit()",
                "menu audit rejected");

        // A separate group that only used the old alias retains the canonical route, including its new ancestors.
        // The SQL compares all 16 group combinations, so this also covers ADMIN/USER/SYSTEM unions.
        try (Connection connection=openConnection(); Statement statement=connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd) "
                        + "SELECT 'ROLE_SYSTEM','NAVIGATION',value FROM (VALUES('9000000'),('9020000'),('9020220')) menu(value)");
                statement.execute(migration);
                assertThat(number(statement,"SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_cd='ROLE_SYSTEM' "
                        + "AND authrt_type_cd='NAVIGATION' AND authrt_grnt_cd IN ('9000000','9020100','9020311')")).isEqualTo(3);
                assertThat(number(statement,"SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_cd='ROLE_SYSTEM' "
                        + "AND authrt_type_cd='NAVIGATION' AND authrt_grnt_cd='9020220'")).isZero();
                assertThat(number(statement,"SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr='migration:2.100' "
                        + "AND authrt_cd='ROLE_SYSTEM' AND authrt_type_cd='OPERATION'")).isZero();
            } finally { connection.rollback(); }
        }
        assertThat(snapshot()).isEqualTo(before);

        flyway(null).migrate();
        try (Connection connection=openConnection(); Statement statement=connection.createStatement()) {
            assertThat(number(statement,"SELECT count(*) FROM flyway_schema_history WHERE version='2.100' AND success")).isEqualTo(1);
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info")).isEqualTo(77);
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info WHERE use_yn='Y'")).isEqualTo(71);
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info WHERE up_menu_sn IS NULL")).isEqualTo(4);
            assertThat(number(statement,"WITH RECURSIVE tree AS (SELECT menu_sn,1 AS depth FROM tb_menu_info WHERE up_menu_sn IS NULL "
                    + "UNION ALL SELECT m.menu_sn,p.depth+1 FROM tb_menu_info m JOIN tree p ON m.up_menu_sn=p.menu_sn) "
                    + "SELECT max(depth) FROM tree")).isEqualTo(3);
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info WHERE menu_sn IN "
                    + "(9020220,9040200,9030800,9040400,1030000,1050000,1060000,2020000,9030100)")).isZero();
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info WHERE menu_nm IN ('참여','통계') "
                    + "AND menu_sn>"+originalMaximum)).isEqualTo(2);
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info WHERE menu_sn IN "
                    + "(2010400,2010600,2030100,9010500,9030200,9010300) AND use_yn='N'")).isEqualTo(6);
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info WHERE menu_sn=2010000 "
                    + "AND modern_route='/admin/survey/hub?tab=manage' AND up_menu_sn=9000000")).isEqualTo(1);
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info WHERE menu_sn=9030110 "
                    + "AND modern_route='/admin/help?tab=COMMUNITY'")).isEqualTo(1);
            assertThat(number(statement,"SELECT count(*) FROM tb_menu_info WHERE menu_sn=9020130 "
                    + "AND modern_route='/admin/system/policies'")).isEqualTo(1);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION' AND authrt_cd='ROLE_ADMIN'")).isEqualTo(77);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION' AND authrt_cd='ROLE_USER'")).isEqualTo(25);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION'")).isEqualTo(566);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_chg_hstry")).isEqualTo(auditsBefore+17);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr='migration:2.100' "
                    + "AND chg_type_cd='ADD' AND authrt_type_cd='NAVIGATION'")).isEqualTo(4);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr='migration:2.100' "
                    + "AND chg_type_cd='REMOVE' AND authrt_type_cd='NAVIGATION'")).isEqualTo(13);
            assertThat(number(statement,"SELECT count(DISTINCT dmnd_idntfr) FROM tb_authrt_chg_hstry "
                    + "WHERE dmnd_idntfr='migration:2.100'")).isEqualTo(1);
            assertThat(digest(statement,"tb_authrt_info","")).isEqualTo(before.get("tb_authrt_info"));
            assertThat(digest(statement,"tb_authrt_user_map","")).isEqualTo(before.get("tb_authrt_user_map"));
            assertThat(digest(statement,"tb_authrt_chg_hstry","WHERE dmnd_idntfr<>'migration:2.100'"))
                    .isEqualTo(before.get("tb_authrt_chg_hstry"));
        }
        var after=snapshot();
        flyway(null).migrate();
        assertThat(snapshot()).as("Flyway rerun never regrants or repeats the audit").isEqualTo(after);
    }

    private void assertRollback(String migration,Map<String,String> expected,String setup,String error) throws Exception {
        try (Connection connection=openConnection(); Statement statement=connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(setup);
                assertThatThrownBy(() -> statement.execute(migration)).isInstanceOf(SQLException.class).hasMessageContaining(error);
            } finally { connection.rollback(); }
        }
        assertThat(snapshot()).as("rejected migration leaves all five persistent tables unchanged").isEqualTo(expected);
    }

    private Map<String,String> snapshot() throws SQLException {
        var result=new LinkedHashMap<String,String>();
        try (Connection connection=openConnection(); Statement statement=connection.createStatement()) {
            for (String table:TABLES) result.put(table,digest(statement,table,""));
        }
        return result;
    }

    private static String digest(Statement statement,String table,String filter) throws SQLException {
        try (var result=statement.executeQuery("SELECT md5(coalesce(string_agg(to_jsonb(row)::text,E'\\n' "
                + "ORDER BY to_jsonb(row)::text),'')) FROM "+table+" row "+filter)) {
            result.next(); return result.getString(1);
        }
    }

    private static long number(Statement statement,String sql) throws SQLException {
        try (var result=statement.executeQuery(sql)) { result.next(); return result.getLong(1); }
    }
}
