package nuri.api.schema;

import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@DisplayName("권한 3개 핵심 테이블 전환의 확장·표준·복제·감사 PostgreSQL 계약")
class AuthorizationGrantExpansionIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    void preservesLegacyAssignmentsAndRejectsUnsafeExpansionAndInvalidWrites() throws Exception {
        migrate("2.97");
        String legacyMemberships;
        String legacyMenus;
        long membershipCount;
        long menuCount;
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            legacyMemberships = digest(statement, "tb_user_authrt_map");
            legacyMenus = digest(statement, "tb_menu_crt_dtl");
            membershipCount = number(statement, "SELECT count(*) FROM tb_user_authrt_map");
            menuCount = number(statement, "SELECT count(*) FROM tb_menu_crt_dtl");
        }

        // 잠금 경합은 메타 등록이나 신규 테이블을 일부 남기지 않고 즉시 실패해야 한다.
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            statement.execute("LOCK TABLE tb_user_authrt_map IN ACCESS EXCLUSIVE MODE");
            assertThatThrownBy(() -> migrate("2.98")).isInstanceOf(FlywayException.class);
            connection.rollback();
        }
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            assertThat(number(statement, "SELECT count(*) FROM information_schema.tables "
                    + "WHERE table_schema='public' AND table_name='tb_authrt_user_map'")).isZero();
            statement.executeUpdate("INSERT INTO meta_standard_domains(domain_group,domain_name,data_type,data_length) "
                    + "VALUES ('코드','코드V20','VARCHAR',21)");
        }

        // 이름만 같은 다른 타입의 표준을 ON CONFLICT로 조용히 수용하지 않는다.
        assertThatThrownBy(() -> migrate("2.98"))
                .isInstanceOf(FlywayException.class)
                .hasMessageContaining("Authorization standard domain conflict");
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            assertThat(number(statement, "SELECT count(*) FROM information_schema.tables "
                    + "WHERE table_schema='public' AND table_name='tb_authrt_user_map'")).isZero();
            assertThat(digest(statement, "tb_user_authrt_map")).isEqualTo(legacyMemberships);
            assertThat(digest(statement, "tb_menu_crt_dtl")).isEqualTo(legacyMenus);
            statement.executeUpdate("DELETE FROM meta_standard_domains WHERE domain_name='코드V20'");
        }

        migrate("2.98");
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            assertThat(digest(statement, "tb_user_authrt_map")).isEqualTo(legacyMemberships);
            assertThat(digest(statement, "tb_menu_crt_dtl")).isEqualTo(legacyMenus);
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_user_map")).isEqualTo(membershipCount);
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION'"))
                    .isEqualTo(menuCount);
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION'"))
                    .isZero();
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr='migration:2.98'"))
                    .isEqualTo(membershipCount + menuCount);
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_type_cd='MIGRATE' "
                    + "AND chg_artcl_nm='legacy_menu_mapping' AND chg_bfr_cn::jsonb ? 'mapng_crt_id'"))
                    .isEqualTo(menuCount);
            assertThat(text(statement, "SELECT domain_name FROM meta_standard_terms WHERE eng_abbr='AUTHRT_CHG_HSTRY_SN'"))
                    .isEqualTo("일련번호N19");
            assertThat(text(statement, "SELECT domain_name FROM meta_standard_terms WHERE eng_abbr='AUTHRT_GRNT_CD'"))
                    .isEqualTo("코드V20");
            assertThat(text(statement, "SELECT identity_generation FROM information_schema.columns "
                    + "WHERE table_schema='public' AND table_name='tb_authrt_chg_hstry' "
                    + "AND column_name='authrt_chg_hstry_sn'")).isEqualTo("BY DEFAULT");
            assertThat(number(statement, "SELECT count(*) FROM pg_constraint WHERE conrelid IN "
                    + "('tb_authrt_user_map'::regclass,'tb_authrt_grnt_map'::regclass) "
                    + "AND contype='f' AND convalidated")).isEqualTo(3);

            statement.executeUpdate("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm) VALUES ('ROLE_TEST_GROUP','시험 그룹')");
            statement.executeUpdate("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd) "
                    + "SELECT scrty_dcsn_trgt_id,'ROLE_TEST_GROUP',mbr_type_cd FROM tb_user_authrt_map "
                    + "ORDER BY scrty_dcsn_trgt_id LIMIT 1");
            assertThat(number(statement, "SELECT count(*) FROM (SELECT scrty_dcsn_trgt_id FROM tb_authrt_user_map "
                    + "GROUP BY scrty_dcsn_trgt_id HAVING count(*)>1) users_with_multiple_groups")).isEqualTo(1);
            assertThatThrownBy(() -> statement.executeUpdate("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd) "
                    + "SELECT scrty_dcsn_trgt_id,'ROLE_TEST_GROUP' FROM tb_authrt_user_map "
                    + "WHERE authrt_cd='ROLE_TEST_GROUP'"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("pk_tb_authrt_user_map");
            assertThatThrownBy(() -> statement.executeUpdate("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd) "
                    + "SELECT scrty_dcsn_trgt_id,'ROLE_NOT_PRESENT' FROM tb_authrt_user_map LIMIT 1"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("fk_tb_authrt_user_map_tb_authrt_info");
            assertThatThrownBy(() -> statement.executeUpdate("INSERT INTO tb_authrt_grnt_map "
                    + "(authrt_cd,authrt_type_cd,authrt_grnt_cd) VALUES ('ROLE_TEST_GROUP','UNKNOWN','TEST_READ')"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_authrt_grnt_map_authrt_type_cd");
            assertThatThrownBy(() -> statement.executeUpdate("INSERT INTO tb_authrt_grnt_map "
                    + "(authrt_cd,authrt_type_cd,authrt_grnt_cd) VALUES ('ROLE_TEST_GROUP','NAVIGATION','-1')"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_authrt_grnt_map_authrt_grnt_cd");
            assertThatThrownBy(() -> statement.executeUpdate("DELETE FROM tb_authrt_info WHERE authrt_cd='ROLE_TEST_GROUP'"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("fk_tb_authrt_user_map_tb_authrt_info");
        }

        // 감사 저장 실패가 같은 DB 트랜잭션의 권한 변경을 되돌릴 수 있음을 검증한다.
        // 서비스가 실제로 동일 트랜잭션을 사용하는지는 별도 서비스 통합 테스트가 보증한다.
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            statement.executeUpdate("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd) "
                    + "VALUES ('ROLE_TEST_GROUP','OPERATION','TX_ONLY')");
            assertThatThrownBy(() -> statement.executeUpdate("INSERT INTO tb_authrt_chg_hstry "
                    + "(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,authrt_type_cd,authrt_grnt_cd,"
                    + "chg_artcl_nm,chg_aftr_cn,frst_rgtr_id,crt_dt) VALUES "
                    + "(repeat('x',51),'test','GROUP_GRANT','ADD','ROLE_TEST_GROUP','OPERATION','TX_ONLY',"
                    + "'grant','present','TEST',CURRENT_TIMESTAMP)"))
                    .isInstanceOf(SQLException.class);
            connection.rollback();
        }
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_grnt_cd='TX_ONLY'")).isZero();
            statement.executeUpdate("INSERT INTO tb_authrt_chg_hstry "
                    + "(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,chg_artcl_nm,"
                    + "chg_bfr_cn,chg_aftr_cn,frst_rgtr_id,crt_dt) VALUES "
                    + "('test:group-change','test','GROUP','UPDATE','ROLE_TEST_GROUP','authrt_expln',"
                    + "'previous',repeat(chr(34),4000),'TEST',CURRENT_TIMESTAMP)");
            assertThat(number(statement, "SELECT char_length(chg_aftr_cn) FROM tb_authrt_chg_hstry "
                    + "WHERE dmnd_idntfr='test:group-change'")).isEqualTo(4000);
            statement.executeUpdate("DELETE FROM tb_authrt_user_map WHERE authrt_cd='ROLE_TEST_GROUP'");
            statement.executeUpdate("DELETE FROM tb_authrt_info WHERE authrt_cd='ROLE_TEST_GROUP'");
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_chg_hstry WHERE authrt_cd='ROLE_TEST_GROUP'"))
                    .isEqualTo(1);
        }

        migrate("2.98");
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr='migration:2.98'"))
                    .isEqualTo(membershipCount + menuCount);
        }
    }

    private void migrate(String version) {
        flyway(MigrationVersion.fromVersion(version)).migrate();
    }

    private static String digest(Statement statement, String table) throws SQLException {
        // table은 테스트 내부의 고정 상수만 전달한다.
        return text(statement, "SELECT md5(COALESCE(string_agg(to_jsonb(row_value)::text,'|' "
                + "ORDER BY to_jsonb(row_value)::text),'')) FROM " + table + " row_value");
    }

    private static String text(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private static long number(Statement statement, String sql) throws SQLException {
        return Long.parseLong(text(statement, sql));
    }
}
